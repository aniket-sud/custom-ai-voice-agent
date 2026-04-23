import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Upload, Loader2, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

export default function CampaignEditor() {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const { user } = useAuth();
  const nav = useNavigate();
  const [agents, setAgents] = useState<any[]>([]);
  const [numbers, setNumbers] = useState<any[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({ name: "", description: "", agent_id: "", from_number: "", concurrency: 3, scheduled_at: "" });
  const [csvText, setCsvText] = useState("");
  const [contacts, setContacts] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: a }, { data: n }] = await Promise.all([
        supabase.from("agents").select("id, name").eq("user_id", user.id).eq("is_active", true),
        supabase.from("phone_numbers").select("number").eq("user_id", user.id).eq("is_active", true),
      ]);
      setAgents(a || []); setNumbers(n || []);
      if (!isNew) {
        const { data: c } = await supabase.from("campaigns").select("*").eq("id", id).single();
        if (c) setForm(c);
        const { data: cc } = await supabase.from("campaign_contacts").select("*").eq("campaign_id", id).order("created_at");
        setContacts(cc || []);
      }
      setLoading(false);
    })();
  }, [user, id, isNew]);

  const parseCsv = () => {
    const lines = csvText.trim().split("\n").filter(Boolean);
    const out: any[] = [];
    for (const line of lines) {
      const parts = line.split(",").map(s => s.trim());
      const phone = parts[0]?.replace(/[^\d+]/g, "");
      if (phone && phone.length >= 8) {
        out.push({ phone: phone.startsWith("+") ? phone : `+${phone}`, name: parts[1] || null });
      }
    }
    if (out.length === 0) return toast.error("No valid phone numbers found");
    setContacts((prev) => [...prev, ...out]); setCsvText("");
    toast.success(`Added ${out.length} contacts`);
  };

  const save = async () => {
    if (!user) return;
    if (!form.name || !form.agent_id || !form.from_number) return toast.error("Name, agent and from-number required");
    if (isNew && contacts.length === 0) return toast.error("Add at least one contact");
    setSaving(true);
    const payload = {
      user_id: user.id, name: form.name, description: form.description, agent_id: form.agent_id,
      from_number: form.from_number, concurrency: form.concurrency || 3,
      scheduled_at: form.scheduled_at || null, total_contacts: contacts.length,
      status: form.scheduled_at ? "scheduled" : "draft",
    };
    if (isNew) {
      const { data: c, error } = await supabase.from("campaigns").insert(payload).select().single();
      if (error) { setSaving(false); return toast.error(error.message); }
      const rows = contacts.map((co) => ({ campaign_id: c.id, phone: co.phone, name: co.name }));
      await supabase.from("campaign_contacts").insert(rows);
      setSaving(false); toast.success("Campaign saved"); nav(`/dashboard/campaigns/${c.id}`);
    } else {
      const { error } = await supabase.from("campaigns").update(payload).eq("id", id);
      setSaving(false);
      if (error) return toast.error(error.message);
      toast.success("Saved");
    }
  };

  if (loading) return <Loader2 className="h-6 w-6 animate-spin" />;

  return (
    <div className="max-w-4xl space-y-6">
      <Button variant="ghost" size="sm" onClick={() => nav("/dashboard/campaigns")}><ArrowLeft className="h-4 w-4" /> Back</Button>
      <div>
        <h1 className="font-display text-4xl font-bold">{isNew ? "New campaign" : form.name}</h1>
        <p className="text-muted-foreground mt-1">Bulk outbound calling — your agent calls every contact in the list.</p>
      </div>

      <Card className="bg-gradient-card border-border/60 p-6 space-y-4">
        <h2 className="font-semibold">Setup</h2>
        <div className="space-y-2"><Label>Campaign name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Diwali offer outreach" /></div>
        <div className="space-y-2"><Label>Description</Label><Input value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2"><Label>Agent *</Label>
            <Select value={form.agent_id} onValueChange={(v) => setForm({ ...form, agent_id: v })}>
              <SelectTrigger><SelectValue placeholder="Pick agent" /></SelectTrigger>
              <SelectContent>{agents.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>From number *</Label>
            <Select value={form.from_number} onValueChange={(v) => setForm({ ...form, from_number: v })}>
              <SelectTrigger><SelectValue placeholder="Pick number" /></SelectTrigger>
              <SelectContent>{numbers.map((n) => <SelectItem key={n.number} value={n.number}>{n.number}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Concurrency</Label><Input type="number" min={1} max={20} value={form.concurrency} onChange={(e) => setForm({ ...form, concurrency: parseInt(e.target.value) || 3 })} /></div>
        </div>
        <div className="space-y-2"><Label>Schedule (leave empty for manual start)</Label><Input type="datetime-local" value={form.scheduled_at?.slice(0, 16) || ""} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></div>
      </Card>

      {isNew && (
        <Card className="bg-gradient-card border-border/60 p-6 space-y-3">
          <h2 className="font-semibold flex items-center gap-2"><FileSpreadsheet className="h-4 w-4 text-primary" /> Contacts</h2>
          <p className="text-xs text-muted-foreground">Paste CSV: one row per contact, columns = phone,name. Phone in E.164 (e.g. +911234567890).</p>
          <Textarea rows={6} value={csvText} onChange={(e) => setCsvText(e.target.value)} placeholder="+919876543210,Ram Sharma&#10;+919876543211,Sita Devi" className="font-mono text-xs" />
          <Button variant="outline" onClick={parseCsv}><Upload className="h-4 w-4" /> Add to list</Button>
          {contacts.length > 0 && (
            <div className="pt-2"><Badge variant="outline">{contacts.length} contacts ready</Badge>
              <div className="max-h-40 overflow-auto mt-2 text-xs space-y-1 border border-border/60 rounded p-2">
                {contacts.slice(0, 50).map((c, i) => <div key={i} className="flex justify-between"><span className="font-mono">{c.phone}</span><span className="text-muted-foreground">{c.name || "—"}</span></div>)}
                {contacts.length > 50 && <p className="text-muted-foreground">…and {contacts.length - 50} more</p>}
              </div>
            </div>
          )}
        </Card>
      )}

      <div className="flex gap-3">
        <Button variant="hero" onClick={save} disabled={saving} className="flex-1">{saving && <Loader2 className="h-4 w-4 animate-spin" />} {isNew ? "Create campaign" : "Save"}</Button>
        <Button variant="outline" onClick={() => nav("/dashboard/campaigns")}>Cancel</Button>
      </div>
    </div>
  );
}
