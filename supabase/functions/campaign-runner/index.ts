// Process pending campaign contacts. Triggered manually or by cron.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, decryptToken, plivoApi } from "../_shared/plivo.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  let campaignId: string | null = null;
  try { const b = await req.json(); campaignId = b.campaign_id; } catch {}

  // pull campaigns to run
  const q = admin.from("campaigns").select("*").in("status", ["queued", "running"]);
  if (campaignId) q.eq("id", campaignId);
  const { data: campaigns } = await q;

  let dispatched = 0;
  for (const c of campaigns || []) {
    if (c.scheduled_at && new Date(c.scheduled_at) > new Date()) continue;

    const { data: cred } = await admin.from("plivo_credentials").select("*").eq("user_id", c.user_id).maybeSingle();
    if (!cred) { await admin.from("campaigns").update({ status: "failed" }).eq("id", c.id); continue; }
    const token = await decryptToken(cred.auth_token_encrypted);

    const { data: prof } = await admin.from("profiles").select("credits_balance").eq("user_id", c.user_id).single();
    if (!prof || Number(prof.credits_balance) < 1) { await admin.from("campaigns").update({ status: "paused" }).eq("id", c.id); continue; }

    const { data: contacts } = await admin.from("campaign_contacts")
      .select("*").eq("campaign_id", c.id).eq("status", "pending").limit(c.concurrency || 3);

    if (!contacts || contacts.length === 0) {
      await admin.from("campaigns").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", c.id);
      continue;
    }

    if (c.status === "queued") await admin.from("campaigns").update({ status: "running", started_at: new Date().toISOString() }).eq("id", c.id);

    const projectId = Deno.env.get("SUPABASE_URL")?.match(/https:\/\/([^.]+)/)?.[1];
    for (const contact of contacts) {
      // create call row
      const { data: callRow } = await admin.from("calls").insert({
        user_id: c.user_id, agent_id: c.agent_id, direction: "outbound", status: "initiated",
        from_number: c.from_number, to_number: contact.phone, campaign_id: c.id,
      }).select().single();

      const answerUrl = `https://${projectId}.supabase.co/functions/v1/plivo-webhook?agent_id=${c.agent_id}&user_id=${c.user_id}&call_id=${callRow!.id}`;
      const r = await plivoApi(cred.auth_id, token, `/Call/`, {
        method: "POST",
        body: JSON.stringify({ from: c.from_number, to: contact.phone, answer_url: answerUrl, answer_method: "POST", hangup_url: answerUrl, hangup_method: "POST", time_limit: 600 }),
      });

      await admin.from("campaign_contacts").update({
        status: r.ok ? "calling" : "failed",
        attempts: (contact.attempts || 0) + 1,
        call_id: callRow!.id,
        last_error: r.ok ? null : JSON.stringify(r.body).slice(0, 500),
        called_at: new Date().toISOString(),
      }).eq("id", contact.id);

      if (r.ok) {
        await admin.from("calls").update({ plivo_call_uuid: r.body?.request_uuid, status: "ringing" }).eq("id", callRow!.id);
      } else {
        await admin.from("calls").update({ status: "failed" }).eq("id", callRow!.id);
        await admin.from("campaigns").update({ failed_contacts: (c.failed_contacts || 0) + 1 }).eq("id", c.id);
      }
      dispatched++;
    }
  }

  return new Response(JSON.stringify({ ok: true, dispatched }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
