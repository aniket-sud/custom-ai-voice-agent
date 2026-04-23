import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AdminLogin from "./pages/AdminLogin";
import NotFound from "./pages/NotFound";
import PublicAgentPage from "./pages/PublicAgentPage";
import DashboardLayout from "./layouts/DashboardLayout";
import DashboardOverview from "./pages/dashboard/Overview";
import AgentsList from "./pages/dashboard/AgentsList";
import AgentEditor from "./pages/dashboard/AgentEditor";
import AgentTester from "./pages/dashboard/AgentTester";
import AgentPageBuilder from "./pages/dashboard/AgentPageBuilder";
import CallsList from "./pages/dashboard/CallsList";
import PhoneNumbers from "./pages/dashboard/PhoneNumbers";
import Campaigns from "./pages/dashboard/Campaigns";
import CampaignEditor from "./pages/dashboard/CampaignEditor";
import Recordings from "./pages/dashboard/Recordings";
import Credits from "./pages/dashboard/Credits";
import Leads from "./pages/dashboard/Leads";
import Settings from "./pages/dashboard/Settings";
import AdminLayout from "./layouts/AdminLayout";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminAgents from "./pages/admin/AdminAgents";
import AdminCalls from "./pages/admin/AdminCalls";
import AdminCampaigns from "./pages/admin/AdminCampaigns";
import AdminRevenue from "./pages/admin/AdminRevenue";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/a/:slug" element={<PublicAgentPage />} />

            <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<DashboardOverview />} />
              <Route path="agents" element={<AgentsList />} />
              <Route path="agents/new" element={<AgentEditor />} />
              <Route path="agents/:id" element={<AgentEditor />} />
              <Route path="agents/:id/test" element={<AgentTester />} />
              <Route path="agents/:id/page" element={<AgentPageBuilder />} />
              <Route path="numbers" element={<PhoneNumbers />} />
              <Route path="campaigns" element={<Campaigns />} />
              <Route path="campaigns/new" element={<CampaignEditor />} />
              <Route path="campaigns/:id" element={<CampaignEditor />} />
              <Route path="recordings" element={<Recordings />} />
              <Route path="leads" element={<Leads />} />
              <Route path="credits" element={<Credits />} />
              <Route path="calls" element={<CallsList />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminLayout /></ProtectedRoute>}>
              <Route index element={<AdminOverview />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="agents" element={<AdminAgents />} />
              <Route path="calls" element={<AdminCalls />} />
              <Route path="campaigns" element={<AdminCampaigns />} />
              <Route path="revenue" element={<AdminRevenue />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
