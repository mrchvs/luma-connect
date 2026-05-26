import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/lib/auth-context";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Members from "./pages/Members";
import Profile from "./pages/Profile";
import ProfileSettings from "./pages/ProfileSettings";
import Admin from "./pages/Admin";
import CommunityAsks from "./pages/CommunityAsks";
import Activity from "./pages/Activity";
import Accountability from "./pages/Accountability";
import InviteMember from "./pages/InviteMember";
import NotFound from "./pages/NotFound";
import { FeedbackWidget } from "./components/FeedbackWidget";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/members" element={<Members />} />
            <Route path="/profile/:userId" element={<Profile />} />
            <Route path="/profile/settings" element={<ProfileSettings />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/:section" element={<Admin />} />
            <Route path="/community-asks" element={<CommunityAsks />} />

            {/* Momentum routes */}
            <Route path="/momentum" element={<Accountability />} />
            <Route path="/momentum/:monthSlug" element={<Accountability />} />
            <Route path="/momentum/:monthSlug/:tab" element={<Accountability />} />
            <Route path="/momentum/:monthSlug/overview" element={<Accountability />} />

            {/* Legacy /accountability redirects */}
            <Route path="/accountability" element={<Navigate to="/momentum" replace />} />
            <Route path="/accountability/:monthSlug" element={<Navigate to="/momentum" replace />} />
            <Route path="/accountability/:monthSlug/:tab" element={<Navigate to="/momentum" replace />} />

            <Route path="/activity" element={<Activity />} />
            <Route path="/invite" element={<InviteMember />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <FeedbackWidget />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
