// Speech-to-text via Gemini (multimodal). Accepts base64 audio + mime + language.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { audio_base64, mime_type, language } = await req.json();
    if (!audio_base64 || !mime_type) {
      return new Response(JSON.stringify({ error: "audio_base64 and mime_type required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const langInstruction = language
      ? `The user is speaking in ${language}. Transcribe in their original language/script.`
      : "Detect the language and transcribe in the original script.";

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: `You are a precise speech-to-text engine. ${langInstruction} Output ONLY the transcript text — no quotes, no extra words, no formatting. If the audio is silent or unintelligible, output exactly: [no_speech]` },
          { role: "user", content: [
            { type: "text", text: "Transcribe this audio." },
            { type: "image_url", image_url: { url: `data:${mime_type};base64,${audio_base64}` } },
          ]},
        ],
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("STT gateway error", aiResp.status, t);
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limit. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "STT failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await aiResp.json();
    let transcript = (data.choices?.[0]?.message?.content || "").trim();
    if (transcript === "[no_speech]" || !transcript) transcript = "";

    return new Response(JSON.stringify({ transcript }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("voice-stt error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
