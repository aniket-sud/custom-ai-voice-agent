import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Mic, MicOff, ArrowLeft, Loader2, Volume2, MessageSquare, Send, PhoneOff, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LANGUAGES } from "@/lib/agent-options";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

export default function AgentTester() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [agent, setAgent] = useState<any>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [callId, setCallId] = useState<string | null>(null);
  const [callStartedAt, setCallStartedAt] = useState<number | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("agents").select("*").eq("id", id!).single();
      if (error) { toast.error(error.message); nav("/dashboard/agents"); return; }
      setAgent(data);
      setMessages([{ role: "assistant", content: data.first_message }]);
      setTimeout(() => speak(data.first_message, data.language), 400);
    })();
    return () => {
      cleanup();
      window.speechSynthesis?.cancel();
    };
    // eslint-disable-next-line
  }, [id]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const cleanup = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close().catch(() => {});
    streamRef.current = null;
    audioCtxRef.current = null;
    analyserRef.current = null;
  };

  const speak = (text: string, lang?: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang || agent?.language || "en-IN";
    u.rate = 1.0; u.pitch = 1.0;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  };

  const startCall = async () => {
    if (!user || !agent) return null;
    const { data, error } = await supabase
      .from("calls")
      .insert({ agent_id: agent.id, user_id: user.id, direction: "test", status: "in_progress", started_at: new Date().toISOString() })
      .select().single();
    if (error) { toast.error(error.message); return null; }
    setCallId(data.id);
    setCallStartedAt(Date.now());
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

  const monitorAudio = () => {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    const tick = () => {
      if (!analyserRef.current) return;
      analyserRef.current.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      setAudioLevel(Math.min(100, avg * 1.4));
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      return toast.error("Microphone not supported in this browser. Try Chrome or Edge.");
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;

      // visualizer
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      analyserRef.current = analyser;
      monitorAudio();

      // pick best supported mime
      const mimeCandidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
      const mime = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || "";
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: mime || "audio/webm" });
        cleanup();
        setAudioLevel(0);
        if (blob.size < 1500) { toast.error("Didn't catch anything — try again."); return; }
        await transcribeAndSend(blob, mime || "audio/webm");
      };

      recorder.start();
      setRecording(true);
      window.speechSynthesis?.cancel();
    } catch (e: any) {
      console.error(e);
      if (e.name === "NotAllowedError") toast.error("Mic permission denied. Allow it in your browser settings.");
      else toast.error(e.message || "Couldn't start microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  };

  const transcribeAndSend = async (blob: Blob, mime: string) => {
    setTranscribing(true);
    try {
      const base64 = await blobToBase64(blob);
      const { data, error } = await supabase.functions.invoke("voice-stt", {
        body: { audio_base64: base64, mime_type: mime, language: agent?.language },
      });
      if (error) throw error;
      const transcript = (data?.transcript || "").trim();
      if (!transcript) { toast.error("Couldn't hear anything — try again."); return; }
      await sendMessage(transcript);
    } catch (e: any) {
      toast.error(e.message || "Transcription failed");
    } finally {
      setTranscribing(false);
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  if (!agent) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const langName = LANGUAGES.find((l) => l.code === agent.language)?.name ?? agent.language;
  const busy = recording || transcribing || thinking;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={() => nav("/dashboard/agents")}><ArrowLeft className="h-4 w-4" /> Back</Button>

      <div>
        <h1 className="font-display text-3xl font-bold">{agent.name}</h1>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Badge variant="outline">{langName}</Badge>
          <Badge variant="outline" className="border-accent/50 text-accent"><Sparkles className="h-3 w-3" /> Web search enabled</Badge>
          {callId && <Badge className="bg-success text-success-foreground animate-pulse">● Live</Badge>}
        </div>
      </div>

      <Card className="bg-gradient-card border-primary/30 p-8 shadow-elegant">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            {(recording || speaking) && <div className="absolute inset-0 rounded-full bg-primary/40 animate-pulse-ring" />}
            {recording && (
              <div
                className="absolute -inset-2 rounded-full border-2 border-primary/60 transition-all"
                style={{ transform: `scale(${1 + audioLevel / 200})`, opacity: 0.3 + audioLevel / 200 }}
              />
            )}
            <button
              onClick={recording ? stopRecording : startRecording}
              disabled={transcribing || thinking}
              className={cn(
                "relative h-28 w-28 rounded-full flex items-center justify-center transition-smooth",
                recording ? "bg-destructive shadow-glow" : "bg-gradient-primary shadow-glow hover:scale-105",
                (transcribing || thinking) && "opacity-50"
              )}
            >
              {transcribing || thinking ? <Loader2 className="h-11 w-11 text-primary-foreground animate-spin" />
                : recording ? <MicOff className="h-11 w-11 text-primary-foreground" />
                : <Mic className="h-11 w-11 text-primary-foreground" />}
            </button>
          </div>
          <p className="text-sm text-muted-foreground text-center min-h-[20px]">
            {recording ? "Listening… tap to stop"
              : transcribing ? "Transcribing your voice…"
              : thinking ? "Agent is thinking…"
              : speaking ? "Agent is speaking…"
              : "Tap the mic to talk"}
          </p>
          {callId && <Button variant="outline" size="sm" onClick={endCall}><PhoneOff className="h-3 w-3" /> End call</Button>}
        </div>

        <div className="mt-6 flex gap-2">
          <Input
            placeholder="Or type a message…"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && textInput.trim()) { sendMessage(textInput); setTextInput(""); } }}
            disabled={busy}
          />
          <Button onClick={() => { if (textInput.trim()) { sendMessage(textInput); setTextInput(""); } }} disabled={busy || !textInput.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </Card>

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
        <Volume2 className="h-3 w-3" /> Voice STT powered by Gemini · Browser TTS · Real-time web search enabled
      </p>
    </div>
  );
}
