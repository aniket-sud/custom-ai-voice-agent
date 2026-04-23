import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Phone, CheckCircle2, ExternalLink, Trash2, Lock } from "lucide-react";

export default function Settings() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [plivo, setPlivo] = useState<{ auth_id: string; auth_token: string }>({ auth_id: "", auth_token: "" });
  const [connecting, setConnecting] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
    setProfile(data);
    const { data: cred } = await supabase.from("plivo_credentials").select("auth_id, is_verified, last_verified_at").eq("user_id", user.id).maybeSingle();
    if (cred) setPlivo({ auth_id: cred.auth_id, auth_token: "••••••••••••" });
  };
  useEffect(() => { load(); }, [user]);

  const save = async () => {
    if (!user || !profile) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: profile.full_name, company: profile.company, phone: profile.phone,
    }).eq("user_id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
  };

  const connectPlivo = async () => {
    if (!plivo.auth_id || !plivo.auth_token || plivo.auth_token.includes("•")) {
      return toast.error("Enter both Auth ID and Auth Token");
    }
    setConnecting(true);
    const { data, error } = await supabase.functions.invoke("plivo-credentials", {
      body: { action: "save", auth_id: plivo.auth_id, auth_token: plivo.auth_token },
    });
    setConnecting(false);
    if (error || data?.error) return toast.error(data?.error || error?.message || "Connection failed");
    toast.success("Plivo connected!");
    load();
  };

  const disconnect = async () => {
    if (!confirm("Disconnect Plivo? Your numbers and campaigns will stop working.")) return;
    await supabase.functions.invoke("plivo-credentials", { body: { action: "disconnect" } });
    setPlivo({ auth_id: "", auth_token: "" });
    toast.success("Disconnected");
    load();
  };

  if (!profile) return <Loader2 className="h-6 w-6 animate-spin" />;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Profile, telephony connection and integrations.</p>
      </div>

      <Card className="bg-gradient-card border-border/60 p-6 space-y-4">
        <h2 className="font-semibold">Profile</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Email</Label><Input value={user?.email || ""} disabled /></div>
          <div className="space-y-2"><Label>Phone</Label><Input value={profile.phone || ""} maxLength={20} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></div>
          <div className="space-y-2"><Label>Full name</Label><Input value={profile.full_name || ""} maxLength={100} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} /></div>
          <div className="space-y-2"><Label>Company</Label><Input value={profile.company || ""} maxLength={100} onChange={(e) => setProfile({ ...profile, company: e.target.value })} /></div>
        </div>
        <Button variant="hero" onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Save</Button>
      </Card>

      <Card className="bg-gradient-card border-border/60 p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Phone className="h-5 w-5 text-primary" /></div>
            <div>
              <h2 className="font-semibold">Plivo Telephony</h2>
              <p className="text-xs text-muted-foreground">Required for outbound calls, campaigns and inbound numbers.</p>
            </div>
          </div>
          {profile.plivo_connected && <Badge className="bg-success text-success-foreground"><CheckCircle2 className="h-3 w-3" /> Connected</Badge>}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Auth ID</Label>
            <Input value={plivo.auth_id} onChange={(e) => setPlivo({ ...plivo, auth_id: e.target.value })} placeholder="MAxxxxxxxxxxxxxx" />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1"><Lock className="h-3 w-3" /> Auth Token</Label>
            <Input type="password" value={plivo.auth_token} onChange={(e) => setPlivo({ ...plivo, auth_token: e.target.value })} placeholder="Your Plivo Auth Token" />
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="hero" onClick={connectPlivo} disabled={connecting}>
            {connecting && <Loader2 className="h-4 w-4 animate-spin" />} {profile.plivo_connected ? "Update credentials" : "Connect Plivo"}
          </Button>
          {profile.plivo_connected && (
            <Button variant="outline" onClick={disconnect}><Trash2 className="h-4 w-4" /> Disconnect</Button>
          )}
          <Button variant="ghost" asChild>
            <a href="https://console.plivo.com/dashboard/" target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /> Plivo console</a>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Your token is encrypted at rest. We never display it back. Get your credentials from <a className="text-primary underline" href="https://console.plivo.com/dashboard/" target="_blank" rel="noreferrer">console.plivo.com</a>.</p>
      </Card>
    </div>
  );
}
