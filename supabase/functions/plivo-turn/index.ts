// Per-turn handler: receives speech input, calls LLM, replies with Speak + next GetInput
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const xml = (body: string) => new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<Response>${body}</Response>`, {
  headers: { "Content-Type": "application/xml" },
});

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const agent_id = url.searchParams.get("agent_id")!;
  const user_id = url.searchParams.get("user_id")!;
  const call_id = url.searchParams.get("call_id")!;
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  let params: Record<string, string> = {};
  try {
    const form = await req.formData();
    form.forEach((v, k) => { params[k] = String(v); });
  } catch {}

  const userText = params["Speech"] || params["Digits"] || "";
  const projectId = Deno.env.get("SUPABASE_URL")?.match(/https:\/\/([^.]+)/)?.[1];
  const turnUrl = `https://${projectId}.supabase.co/functions/v1/plivo-turn?agent_id=${agent_id}&user_id=${user_id}&call_id=${call_id}`;

  const { data: agent } = await admin.from("agents").select("*").eq("id", agent_id).single();
  if (!agent) return xml(`<Speak>Agent unavailable.</Speak><Hangup/>`);
  const lang = (agent.language || "en-IN").replace(/_/g, "-");

  if (!userText) {
    return xml(`<GetInput action="${turnUrl}" inputType="speech" language="${lang}" timeout="6" speechEndTimeout="2" /><Speak language="${lang}">Are you there?</Speak><Hangup/>`);
  }

  // Save transcript (user)
  await admin.from("call_transcripts").insert({ call_id, role: "user", content: userText });

  // Get history
  const { data: history } = await admin.from("call_transcripts").select("role, content").eq("call_id", call_id).order("created_at");
  const messages = [
    { role: "system", content: `${agent.system_prompt}\n\nKB:\n${agent.knowledge_base || ""}` },
    ...(history || []).map((m: any) => ({ role: m.role === "user" ? "user" : "assistant", content: m.content })),
  ];

  // Call Lovable AI
  let assistantText = "Sorry, I can't answer right now.";
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}` },
      body: JSON.stringify({ model: agent.llm_model || "google/gemini-3-flash-preview", messages, temperature: Number(agent.temperature) || 0.7 }),
    });
    const j = await r.json();
    assistantText = j?.choices?.[0]?.message?.content || assistantText;
  } catch (e) { console.error("LLM err", e); }

  // Save assistant
  await admin.from("call_transcripts").insert({ call_id, role: "assistant", content: assistantText });

  const safe = assistantText.replace(/[<>&]/g, "").slice(0, 1500);
  return xml(`
    <Speak language="${lang}">${safe}</Speak>
    <GetInput action="${turnUrl}" inputType="speech" language="${lang}" timeout="6" speechEndTimeout="2" />
    <Speak language="${lang}">Thanks for calling. Goodbye.</Speak>
  `);
});
