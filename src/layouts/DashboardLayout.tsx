import { NavLink, useLocation, useNavigate, Outlet } from "react-router-dom";
import { Logo } from "@/components/Logo";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import { LayoutDashboard, Bot, PhoneCall, Settings, LogOut, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const items = [
  { title: "Overview", url: "/dashboard", icon: LayoutDashboard, end: true },
  { title: "Agents", url: "/dashboard/agents", icon: Bot, end: false },
  { title: "Calls", url: "/dashboard/calls", icon: PhoneCall, end: false },
  { title: "Settings", url: "/dashboard/settings", icon: Settings, end: false },
];

function AppSidebar() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const handleSignOut = async () => { await signOut(); nav("/"); };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="px-2 py-2"><Logo size="sm" /></div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
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
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <div className="p-2 space-y-1">
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
            <Button size="sm" variant="hero" onClick={() => window.location.assign("/dashboard/agents/new")}>
              <Plus className="h-4 w-4" /> New agent
            </Button>
          </header>
          <main className="flex-1 p-6 md:p-8 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
