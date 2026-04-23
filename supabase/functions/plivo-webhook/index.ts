// Plivo answer/hangup webhook — returns AnswerXML and logs hangup data
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const xml = (body: string) => new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<Response>${body}</Response>`, {
  headers: { "Content-Type": "application/xml" },
});

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const agent_id = url.searchParams.get("agent_id");
  const user_id = url.searchParams.get("user_id");
  const call_id = url.searchParams.get("call_id");

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Parse Plivo form data
  let params: Record<string, string> = {};
  try {
    if (req.headers.get("content-type")?.includes("application/x-www-form-urlencoded")) {
      const form = await req.formData();
      form.forEach((v, k) => { params[k] = String(v); });
    }
  } catch {}

  const event = params["Event"] || params["CallStatus"] || "answer";
  const plivoUuid = params["CallUUID"] || params["RequestUUID"];
  const duration = parseInt(params["Duration"] || params["BillDuration"] || "0", 10);
  const recordingUrl = params["RecordUrl"] || params["RecordingUrl"];

  // Hangup → finalize
  if (event === "Hangup" || params["HangupCause"]) {
    if (call_id) {
      await admin.from("calls").update({
        status: "completed", duration_seconds: duration, ended_at: new Date().toISOString(),
        recording_url: recordingUrl || null,
      }).eq("id", call_id);

      // Deduct credits (1 credit per minute, rounded up)
      if (user_id && duration > 0) {
        const credits = Math.ceil(duration / 60);
        await admin.rpc("adjust_credits", {
          p_user_id: user_id, p_amount: -credits, p_type: "usage",
          p_description: `Phone call ${plivoUuid}`, p_reference_id: call_id, p_reference_type: "call",
        });
        await admin.from("calls").update({ cost_credits: credits }).eq("id", call_id);
      }
      if (recordingUrl && user_id && call_id) {
        await admin.from("call_recordings").insert({
          call_id, user_id, recording_url: recordingUrl, duration_seconds: duration,
        });
      }
    }
    return new Response("ok");
  }

  // Answer — load agent + first message
  if (!agent_id) return xml(`<Speak>Agent not configured.</Speak><Hangup/>`);
  const { data: agent } = await admin.from("agents").select("*").eq("id", agent_id).single();
  if (!agent) return xml(`<Speak>Agent not found.</Speak><Hangup/>`);

  // Build conversation loop using Plivo's GetSpeech (DTMF/speech in) + Speak
  // For full duplex we'd use Stream. Here we implement a turn-based loop.
  const projectId = Deno.env.get("SUPABASE_URL")?.match(/https:\/\/([^.]+)/)?.[1];
  const turnUrl = `https://${projectId}.supabase.co/functions/v1/plivo-turn?agent_id=${agent_id}&user_id=${user_id}&call_id=${call_id}`;

  const lang = (agent.language || "en-IN").replace(/_/g, "-");
  const firstMsg = (agent.first_message || "Hello").replace(/[<>&]/g, "");

  // Start: greet, then enable record, then redirect to turn
  return xml(`
    <Record action="${turnUrl}" maxLength="600" recordSession="true" startOnDialAnswer="true" redirect="false" callbackUrl="${turnUrl}&amp;event=record" />
    <Speak language="${lang}">${firstMsg}</Speak>
    <GetInput action="${turnUrl}" inputType="speech" language="${lang}" speechModel="default" timeout="6" speechEndTimeout="2" />
    <Speak language="${lang}">I didn't catch that. Goodbye.</Speak>
  `);
});
