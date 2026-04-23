// Initiate a single outbound AI call via Plivo
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, decryptToken, plivoApi } from "../_shared/plivo.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "no auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: ud } = await supa.auth.getUser();
    if (!ud?.user) return new Response(JSON.stringify({ error: "no user" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userId = ud.user.id;
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { agent_id, from_number, to_number, campaign_id, lead_id } = await req.json();
    if (!agent_id || !from_number || !to_number) return new Response(JSON.stringify({ error: "missing fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Check credits
    const { data: prof } = await admin.from("profiles").select("credits_balance").eq("user_id", userId).single();
    if (!prof || Number(prof.credits_balance) < 1) return new Response(JSON.stringify({ error: "Insufficient credits. Top up to make calls." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: cred } = await admin.from("plivo_credentials").select("*").eq("user_id", userId).maybeSingle();
    if (!cred) return new Response(JSON.stringify({ error: "Plivo not connected." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const token = await decryptToken(cred.auth_token_encrypted);

    // Create call record
    const { data: callRow } = await admin.from("calls").insert({
      user_id: userId, agent_id, direction: "outbound", status: "initiated",
      from_number, to_number, campaign_id: campaign_id || null,
    }).select().single();

    const projectId = Deno.env.get("SUPABASE_URL")?.match(/https:\/\/([^.]+)/)?.[1];
    const answerUrl = `https://${projectId}.supabase.co/functions/v1/plivo-webhook?agent_id=${agent_id}&user_id=${userId}&call_id=${callRow!.id}`;

    const r = await plivoApi(cred.auth_id, token, `/Call/`, {
      method: "POST",
      body: JSON.stringify({
        from: from_number, to: to_number, answer_url: answerUrl, answer_method: "POST",
        hangup_url: answerUrl, hangup_method: "POST", time_limit: 600,
      }),
    });

    if (!r.ok) {
      await admin.from("calls").update({ status: "failed", summary: JSON.stringify(r.body) }).eq("id", callRow!.id);
      if (lead_id) await admin.from("page_leads").update({ status: "failed" }).eq("id", lead_id);
      return new Response(JSON.stringify({ error: "Plivo call failed", detail: r.body }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await admin.from("calls").update({ plivo_call_uuid: r.body?.request_uuid, status: "ringing" }).eq("id", callRow!.id);
    if (lead_id) await admin.from("page_leads").update({ status: "called", call_id: callRow!.id }).eq("id", lead_id);

    return new Response(JSON.stringify({ ok: true, call_id: callRow!.id, plivo: r.body }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
