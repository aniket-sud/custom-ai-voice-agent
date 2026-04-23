import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, decryptToken, plivoApi } from "../_shared/plivo.ts";

async function getCreds(admin: any, userId: string) {
  const { data } = await admin.from("plivo_credentials").select("*").eq("user_id", userId).maybeSingle();
  if (!data) throw new Error("Plivo not connected. Add your credentials in Settings.");
  return { auth_id: data.auth_id, auth_token: await decryptToken(data.auth_token_encrypted) };
}

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
    const { action, country, type, number, agent_id } = await req.json();
    const { auth_id, auth_token } = await getCreds(admin, userId);

    if (action === "search") {
      const q = new URLSearchParams({ country_iso: country || "IN", type: type || "local", limit: "20" });
      const r = await plivoApi(auth_id, auth_token, `/PhoneNumber/?${q}`);
      return new Response(JSON.stringify(r.body), { status: r.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "buy") {
      const r = await plivoApi(auth_id, auth_token, `/PhoneNumber/${number}/`, { method: "POST", body: JSON.stringify({}) });
      if (r.ok) {
        await admin.from("phone_numbers").insert({
          user_id: userId, number, country: country || "IN", type: type || "local", source: "purchased",
        });
      }
      return new Response(JSON.stringify(r.body), { status: r.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "import") {
      // For BYO numbers — verify it's on the Plivo account
      const r = await plivoApi(auth_id, auth_token, `/Number/${number}/`);
      if (!r.ok) return new Response(JSON.stringify({ error: "Number not on your Plivo account", detail: r.body }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      await admin.from("phone_numbers").upsert({
        user_id: userId, number, country: r.body.country || "IN", type: "local", source: "imported",
      }, { onConflict: "user_id,number" });
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "list") {
      const r = await plivoApi(auth_id, auth_token, `/Number/?limit=50`);
      return new Response(JSON.stringify(r.body), { status: r.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "assign_agent") {
      await admin.from("phone_numbers").update({ agent_id }).eq("user_id", userId).eq("number", number);
      // Also create a Plivo Application linking inbound to our webhook
      const projectId = Deno.env.get("SUPABASE_URL")?.match(/https:\/\/([^.]+)/)?.[1];
      const webhook = `https://${projectId}.supabase.co/functions/v1/plivo-webhook?agent_id=${agent_id}&user_id=${userId}`;
      // create app
      const appRes = await plivoApi(auth_id, auth_token, `/Application/`, {
        method: "POST",
        body: JSON.stringify({ app_name: `voiceai-${agent_id.slice(0, 8)}`, answer_url: webhook, answer_method: "POST", hangup_url: webhook, hangup_method: "POST" }),
      });
      const appId = appRes.body?.app_id;
      if (appId) {
        await plivoApi(auth_id, auth_token, `/Number/${number}/`, { method: "POST", body: JSON.stringify({ app_id: appId }) });
      }
      return new Response(JSON.stringify({ ok: true, app_id: appId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
