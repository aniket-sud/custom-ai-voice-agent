import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format } from "date-fns";
import { ShieldCheck, ShieldOff, Loader2, Search, Users as UsersIcon } from "lucide-react";

export default function AdminUsers() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const load = async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    const { data: roles } = await supabase.from("user_roles").select("*");
    const { data: agentCounts } = await supabase.from("agents").select("user_id");
    const counts: Record<string, number> = {};
    (agentCounts ?? []).forEach((a: any) => { counts[a.user_id] = (counts[a.user_id] || 0) + 1; });
    const merged = (profiles ?? []).map((p: any) => ({
      ...p,
      roles: (roles ?? []).filter((r: any) => r.user_id === p.user_id).map((r: any) => r.role),
      agentCount: counts[p.user_id] || 0,
    }));
    setRows(merged);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleAdmin = async (userId: string, isAdmin: boolean) => {
    if (isAdmin) {
      await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
      toast.success("Admin removed");
    } else {
      await supabase.from("user_roles").insert({ user_id: userId, role: "admin" } as any);
      toast.success("Admin granted");
    }
    load();
  };

  const filtered = rows.filter((u) => !query || `${u.full_name ?? ""} ${u.email ?? ""} ${u.company ?? ""}`.toLowerCase().includes(query.toLowerCase()));

  const totalAdmins = rows.filter((u) => u.roles.includes("admin")).length;

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="font-display text-4xl font-bold">Users</h1>
        <p className="text-muted-foreground mt-1">All platform users and their roles.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-card border-border/60 p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><UsersIcon className="h-5 w-5 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">Total</p><p className="font-display text-2xl font-bold">{rows.length}</p></div>
        </Card>
        <Card className="bg-gradient-card border-border/60 p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center"><ShieldCheck className="h-5 w-5 text-accent" /></div>
          <div><p className="text-xs text-muted-foreground">Admins</p><p className="font-display text-2xl font-bold">{totalAdmins}</p></div>
        </Card>
        <Card className="bg-gradient-card border-border/60 p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center"><UsersIcon className="h-5 w-5 text-success" /></div>
          <div><p className="text-xs text-muted-foreground">Customers</p><p className="font-display text-2xl font-bold">{rows.length - totalAdmins}</p></div>
        </Card>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search users…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
      </div>

      <Card className="bg-gradient-card border-border/60 overflow-hidden">
        {loading ? <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
          <Table>
            <TableHeader>
              <TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Company</TableHead><TableHead>Agents</TableHead><TableHead>Roles</TableHead><TableHead>Joined</TableHead><TableHead></TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => {
                const isAdmin = u.roles.includes("admin");
                return (
                  <TableRow key={u.id} className="hover:bg-secondary/40">
                    <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>{u.company || "—"}</TableCell>
                    <TableCell><Badge variant="outline">{u.agentCount}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {u.roles.map((r: string) => (
                          <Badge key={r} variant={r === "admin" ? "default" : "outline"}>{r}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(u.created_at), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => toggleAdmin(u.user_id, isAdmin)}>
                        {isAdmin ? <><ShieldOff className="h-3 w-3" /> Revoke admin</> : <><ShieldCheck className="h-3 w-3" /> Make admin</>}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
