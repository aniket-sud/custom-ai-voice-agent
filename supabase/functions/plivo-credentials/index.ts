import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, encryptToken, plivoApi } from "../_shared/plivo.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "no auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData } = await supa.auth.getUser();
    if (!userData?.user) return new Response(JSON.stringify({ error: "no user" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userId = userData.user.id;

    const { action, auth_id, auth_token } = await req.json();
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (action === "save") {
      if (!auth_id || !auth_token) return new Response(JSON.stringify({ error: "missing creds" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      // verify
      const verify = await plivoApi(auth_id, auth_token, "/", { method: "GET" });
      if (!verify.ok) return new Response(JSON.stringify({ error: "Invalid Plivo credentials", detail: verify.body }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const enc = await encryptToken(auth_token);
      await admin.from("plivo_credentials").upsert({
        user_id: userId, auth_id, auth_token_encrypted: enc, is_verified: true, last_verified_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      await admin.from("profiles").update({ plivo_connected: true }).eq("user_id", userId);
      return new Response(JSON.stringify({ ok: true, account: verify.body }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "disconnect") {
      await admin.from("plivo_credentials").delete().eq("user_id", userId);
      await admin.from("profiles").update({ plivo_connected: false }).eq("user_id", userId);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
