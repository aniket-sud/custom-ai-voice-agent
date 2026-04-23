import { NavLink, useLocation, useNavigate, Outlet } from "react-router-dom";
import { Logo } from "@/components/Logo";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, Bot, PhoneCall, Settings, LogOut, Plus,
  Phone, Megaphone, Sparkles, FileAudio, Inbox, Wallet,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const groups = [
  {
    label: "Workspace",
    items: [
      { title: "Overview", url: "/dashboard", icon: LayoutDashboard, end: true },
      { title: "Agents", url: "/dashboard/agents", icon: Bot, end: false },
      { title: "Calls", url: "/dashboard/calls", icon: PhoneCall, end: false },
      { title: "Recordings", url: "/dashboard/recordings", icon: FileAudio, end: false },
    ],
  },
  {
    label: "Telephony",
    items: [
      { title: "Phone numbers", url: "/dashboard/numbers", icon: Phone, end: false },
      { title: "Campaigns", url: "/dashboard/campaigns", icon: Megaphone, end: false },
      { title: "Page leads", url: "/dashboard/leads", icon: Inbox, end: false },
    ],
  },
  {
    label: "Account",
    items: [
      { title: "Credits & usage", url: "/dashboard/credits", icon: Wallet, end: false },
      { title: "Settings", url: "/dashboard/settings", icon: Settings, end: false },
    ],
  },
];

function AppSidebar() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase.from("profiles").select("credits_balance").eq("user_id", user.id).single();
      setCredits(Number(data?.credits_balance ?? 0));
    };
    load();
    const ch = supabase.channel("profile-credits").on("postgres_changes",
      { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` },
      (p: any) => setCredits(Number(p.new.credits_balance ?? 0))
    ).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const handleSignOut = async () => { await signOut(); nav("/"); };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="px-2 py-2"><Logo size="sm" /></div>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            <SidebarGroupLabel>{g.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.end}
                        className={({ isActive }) => cn("transition-smooth", isActive && "bg-sidebar-accent text-primary font-medium")}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <div className="p-2 space-y-2">
          {credits !== null && (
            <NavLink to="/dashboard/credits" className="flex items-center justify-between px-2 py-1.5 rounded-md bg-secondary/50 hover:bg-secondary transition-smooth">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5"><Sparkles className="h-3 w-3 text-primary" /> Credits</span>
              <span className="font-semibold text-sm">{credits.toFixed(0)}</span>
            </NavLink>
          )}
          <p className="text-xs text-muted-foreground truncate px-2">{user?.email}</p>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

export default function DashboardLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center justify-between border-b border-border/60 px-4 bg-background/70 backdrop-blur sticky top-0 z-40">
            <SidebarTrigger />
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => window.location.assign("/dashboard/campaigns/new")}>
                <Megaphone className="h-4 w-4" /> New campaign
              </Button>
              <Button size="sm" variant="hero" onClick={() => window.location.assign("/dashboard/agents/new")}>
                <Plus className="h-4 w-4" /> New agent
              </Button>
            </div>
          </header>
          <main className="flex-1 p-6 md:p-8 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
