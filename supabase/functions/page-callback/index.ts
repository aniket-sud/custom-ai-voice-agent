// Public endpoint: visitor on a public agent page submits "request a call"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, decryptToken, plivoApi } from "../_shared/plivo.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { agent_page_id, name, email, phone, message } = await req.json();
    if (!agent_page_id || !phone) return new Response(JSON.stringify({ error: "missing fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: page } = await admin.from("agent_pages").select("*").eq("id", agent_page_id).eq("visibility", "public").maybeSingle();
    if (!page) return new Response(JSON.stringify({ error: "Page not found or not public" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: lead } = await admin.from("page_leads").insert({
      agent_page_id, user_id: page.user_id, agent_id: page.agent_id,
      name, email, phone, message,
      source_ip: req.headers.get("x-forwarded-for") || null,
      user_agent: req.headers.get("user-agent") || null,
    }).select().single();

    // Try to call back immediately if Plivo connected and a number is assigned
    const { data: pn } = await admin.from("phone_numbers").select("number").eq("agent_id", page.agent_id).limit(1).maybeSingle();
    const { data: cred } = await admin.from("plivo_credentials").select("*").eq("user_id", page.user_id).maybeSingle();
    const { data: prof } = await admin.from("profiles").select("credits_balance").eq("user_id", page.user_id).single();

    if (pn && cred && prof && Number(prof.credits_balance) >= 1) {
      const token = await decryptToken(cred.auth_token_encrypted);
      const { data: callRow } = await admin.from("calls").insert({
        user_id: page.user_id, agent_id: page.agent_id, direction: "outbound", status: "initiated",
        from_number: pn.number, to_number: phone,
      }).select().single();
      const projectId = Deno.env.get("SUPABASE_URL")?.match(/https:\/\/([^.]+)/)?.[1];
      const answerUrl = `https://${projectId}.supabase.co/functions/v1/plivo-webhook?agent_id=${page.agent_id}&user_id=${page.user_id}&call_id=${callRow!.id}`;
      const r = await plivoApi(cred.auth_id, token, `/Call/`, {
        method: "POST",
        body: JSON.stringify({ from: pn.number, to: phone, answer_url: answerUrl, answer_method: "POST", hangup_url: answerUrl, hangup_method: "POST", time_limit: 600 }),
      });
      if (r.ok) {
        await admin.from("calls").update({ plivo_call_uuid: r.body?.request_uuid, status: "ringing" }).eq("id", callRow!.id);
        await admin.from("page_leads").update({ status: "called", call_id: callRow!.id }).eq("id", lead!.id);
      }
    }

    await admin.from("agent_pages").update({ call_count: (page.call_count || 0) + 1 }).eq("id", page.id);
    return new Response(JSON.stringify({ ok: true, lead_id: lead!.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
