// One-time setup: ensures admin@gmail.com exists with temp password and admin role.
// Safe to call multiple times — idempotent.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASSWORD = "Admin@12345";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    // Check if user exists
    const { data: list } = await admin.auth.admin.listUsers();
    let user = list?.users?.find((u: any) => u.email === ADMIN_EMAIL);

    if (!user) {
      const { data, error } = await admin.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: "Platform Admin" },
      });
      if (error) throw error;
      user = data.user!;
    } else {
      // Reset password to known value
      await admin.auth.admin.updateUserById(user.id, { password: ADMIN_PASSWORD, email_confirm: true });
    }

    // Ensure admin role
    const { data: existingRole } = await admin
      .from("user_roles").select("id").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!existingRole) {
      await admin.from("user_roles").insert({ user_id: user.id, role: "admin" });
    }

    return new Response(JSON.stringify({
      ok: true,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      message: "Admin ready. Login at /admin/login",
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("setup-admin error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
