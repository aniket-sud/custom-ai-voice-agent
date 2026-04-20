import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Mic, MicOff, ArrowLeft, Loader2, Volume2, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LANGUAGES } from "@/lib/agent-options";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

// Web Speech API typings
declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

export default function AgentTester() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [agent, setAgent] = useState<any>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [callId, setCallId] = useState<string | null>(null);
  const [callStartedAt, setCallStartedAt] = useState<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("agents").select("*").eq("id", id!).single();
      if (error) { toast.error(error.message); nav("/dashboard/agents"); return; }
      setAgent(data);
      setMessages([{ role: "assistant", content: data.first_message }]);
      setTimeout(() => speak(data.first_message, data.language), 300);
    })();
    return () => { stopListening(); window.speechSynthesis?.cancel(); };
    // eslint-disable-next-line
  }, [id]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const speak = (text: string, lang?: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang || agent?.language || "en-IN";
    u.rate = 1.0; u.pitch = 1.0;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  };

  const startCall = async () => {
    if (!user || !agent) return;
    const { data, error } = await supabase
      .from("calls")
      .insert({ agent_id: agent.id, user_id: user.id, direction: "test", status: "in_progress", started_at: new Date().toISOString() })
      .select().single();
    if (error) { toast.error(error.message); return null; }
    setCallId(data.id);
    setCallStartedAt(Date.now());
    // log first message
    await supabase.from("call_transcripts").insert({ call_id: data.id, role: "assistant", content: agent.first_message });
    return data.id;
  };

  const endCall = async () => {
    if (!callId) return;
    const duration = callStartedAt ? Math.round((Date.now() - callStartedAt) / 1000) : 0;
    await supabase.from("calls").update({
      status: "completed",
      ended_at: new Date().toISOString(),
      duration_seconds: duration,
      summary: messages.slice(-4).map(m => `${m.role}: ${m.content}`).join(" | ").slice(0, 500),
    }).eq("id", callId);
    setCallId(null);
    setCallStartedAt(null);
    toast.success("Call ended and saved");
    window.speechSynthesis?.cancel();
    setMessages([{ role: "assistant", content: agent.first_message }]);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || !agent) return;
    let activeCallId = callId;
    if (!activeCallId) activeCallId = await startCall();
    if (!activeCallId) return;

    const userMsg: Msg = { role: "user", content: text };
    setMessages((m) => [...m, userMsg]);
    setThinking(true);

    await supabase.from("call_transcripts").insert({ call_id: activeCallId, role: "user", content: text });

    try {
      const { data, error } = await supabase.functions.invoke("agent-chat", {
        body: {
          agent_id: agent.id,
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
        },
      });
      if (error) throw error;
      const reply = data?.reply || "Sorry, I couldn't respond.";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
      await supabase.from("call_transcripts").insert({ call_id: activeCallId, role: "assistant", content: reply });
      speak(reply, agent.language);
    } catch (e: any) {
      toast.error(e.message || "AI request failed");
    } finally {
      setThinking(false);
    }
  };

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return toast.error("Your browser doesn't support voice input. Try Chrome.");
    const r = new SR();
    r.lang = agent?.language || "en-IN";
    r.interimResults = false;
    r.continuous = false;
    r.onresult = (e: any) => {
      const t = e.results[0][0].transcript;
      setListening(false);
      sendMessage(t);
    };
    r.onerror = (e: any) => { setListening(false); toast.error(`Mic error: ${e.error}`); };
    r.onend = () => setListening(false);
    r.start();
    recognitionRef.current = r;
    setListening(true);
  };

  const stopListening = () => { recognitionRef.current?.stop?.(); setListening(false); };

  if (!agent) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const langName = LANGUAGES.find((l) => l.code === agent.language)?.name ?? agent.language;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={() => nav("/dashboard/agents")}><ArrowLeft className="h-4 w-4" /> Back</Button>

      <div>
        <h1 className="font-display text-3xl font-bold">{agent.name}</h1>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="outline">{langName}</Badge>
          {callId && <Badge className="bg-success text-success-foreground">Live call</Badge>}
        </div>
      </div>

      <Card className="bg-gradient-card border-primary/30 p-8 shadow-elegant">
        {/* Mic */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            {(listening || speaking) && <div className="absolute inset-0 rounded-full bg-primary/40 animate-pulse-ring" />}
            <button
              onClick={listening ? stopListening : startListening}
              disabled={thinking}
              className={cn(
                "relative h-24 w-24 rounded-full flex items-center justify-center transition-smooth",
                listening ? "bg-destructive shadow-glow" : "bg-gradient-primary shadow-glow hover:scale-105",
                thinking && "opacity-50"
              )}
            >
              {thinking ? <Loader2 className="h-10 w-10 text-primary-foreground animate-spin" />
                : listening ? <MicOff className="h-10 w-10 text-primary-foreground" />
                : <Mic className="h-10 w-10 text-primary-foreground" />}
            </button>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            {listening ? "Listening… speak now" : thinking ? "Thinking…" : speaking ? "Agent speaking…" : "Tap to talk"}
          </p>
          {callId && <Button variant="outline" size="sm" onClick={endCall}>End call</Button>}
        </div>

        {/* Text fallback */}
        <div className="mt-6 flex gap-2">
          <Input
            placeholder="Or type a message…"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && textInput.trim()) { sendMessage(textInput); setTextInput(""); } }}
            disabled={thinking || listening}
          />
          <Button onClick={() => { if (textInput.trim()) { sendMessage(textInput); setTextInput(""); } }} disabled={thinking || !textInput.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* Transcript */}
      <Card className="bg-gradient-card border-border/60 p-5">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold">Live transcript</h3>
        </div>
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {messages.map((m, i) => (
            <div key={i} className={cn("flex gap-2", m.role === "user" && "justify-end")}>
              <div className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              )}>
                {m.content}
              </div>
            </div>
          ))}
          {thinking && (
            <div className="flex gap-2">
              <div className="bg-secondary rounded-2xl px-4 py-2 text-sm flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> thinking…
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </Card>

      <p className="text-xs text-muted-foreground text-center flex items-center gap-1 justify-center">
        <Volume2 className="h-3 w-3" /> Browser-native voice (Web Speech API). Works best in Chrome / Edge.
      </p>
    </div>
  );
}
