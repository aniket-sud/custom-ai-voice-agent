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
    if (!auth) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { agent_id, messages } = await req.json();
    if (!agent_id || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "agent_id and messages required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: agent, error: agentErr } = await supabase
      .from("agents").select("*").eq("id", agent_id).single();
    if (agentErr || !agent) {
      return new Response(JSON.stringify({ error: "Agent not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date().toISOString().split("T")[0];
    const systemContent = [
      agent.system_prompt,
      "",
      `Today's date is ${today}. You have access to a web_search tool — use it whenever the user asks about current events, news, prices, weather, sports scores, recent updates, "latest" anything, or any fact that could have changed after your training. Never claim you "don't have real-time data" — call web_search instead.`,
      "",
      "VOICE STYLE: You are speaking on a voice call. Keep responses very short (1-2 sentences), natural, conversational. No bullet points, no markdown, no long explanations. Sound human.",
      agent.knowledge_base ? `\n\nKnowledge base:\n${agent.knowledge_base}` : "",
    ].join("\n").trim();

    // Tool definition for web search (model decides when to call)
    const tools = [{
      type: "function",
      function: {
        name: "web_search",
        description: "Search the web for current/real-time information. Use for news, prices, weather, sports, recent events, or anything that may have changed.",
        parameters: {
          type: "object",
          properties: { query: { type: "string", description: "Search query in English" } },
          required: ["query"],
          additionalProperties: false,
        },
      },
    }];

    const baseBody = {
      model: agent.llm_model || "google/gemini-3-flash-preview",
      messages: [{ role: "system", content: systemContent }, ...messages],
      temperature: Number(agent.temperature) || 0.7,
      tools,
    };

    const callAI = async (body: any) => {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return r;
    };

    const webSearch = async (query: string): Promise<string> => {
      try {
        const r = await fetch(`https://r.jina.ai/https://www.google.com/search?q=${encodeURIComponent(query)}`, {
          headers: { "Accept": "text/plain", "X-Return-Format": "text" },
        });
        if (!r.ok) return "Search unavailable.";
        const text = await r.text();
        return text.slice(0, 4000);
      } catch (e) {
        console.error("web_search error", e);
        return "Search failed.";
      }
    };

    let aiResp = await callAI(baseBody);

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "AI service error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let data = await aiResp.json();
    let msg = data.choices?.[0]?.message;

    // Tool-call loop (max 3 iterations)
    let convo = [...baseBody.messages];
    for (let i = 0; i < 3 && msg?.tool_calls?.length; i++) {
      convo.push(msg);
      for (const tc of msg.tool_calls) {
        if (tc.function?.name === "web_search") {
          let args: any = {};
          try { args = JSON.parse(tc.function.arguments || "{}"); } catch {}
          const result = await webSearch(args.query || "");
          convo.push({ role: "tool", tool_call_id: tc.id, content: result });
        }
      }
      aiResp = await callAI({ ...baseBody, messages: convo });
      if (!aiResp.ok) break;
      data = await aiResp.json();
      msg = data.choices?.[0]?.message;
    }

    const reply = msg?.content || "I didn't catch that.";
    return new Response(JSON.stringify({ reply }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("agent-chat error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
