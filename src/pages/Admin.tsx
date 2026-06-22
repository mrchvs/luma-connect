import { useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminMembers } from "@/components/admin/AdminMembers";
import { AdminSettings } from "@/components/admin/AdminSettings";
import AdminHome from "@/pages/AdminHome";
import { AdminAsks } from "@/components/AdminAsks";
import { AdminMomentumGroups } from "@/components/AdminMomentumGroups";
import { AdminResources } from "@/components/AdminResources";
import { AdminLeads } from "@/components/AdminLeads";
import { AdminFeedback } from "@/components/AdminFeedback";

export default function Admin() {
  const { user, isAdmin, isOwner, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { section } = useParams<{ section?: string }>();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
    if (!loading && user && !isAdmin) {
      toast({ title: "Access Denied", description: "You don't have permission to access the admin dashboard.", variant: "destructive" });
      navigate("/dashboard");
    }
  }, [user, isAdmin, loading, navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" text="Loading admin dashboard..." />
      </div>
    );
  }
  if (!isAdmin) return null;

  let content: React.ReactNode;
  switch (section) {
    case undefined:
    case "home":
      content = <AdminHome />;
      break;
    case "members":
      content = <AdminMembers />;
      break;
    case "asks":
      content = <AdminAsks />;
      break;
    case "momentum":
      content = <AdminMomentumGroups initialCycleId={searchParams.get("cycle") ?? undefined} />;
      break;
    case "resources":
      content = <AdminResources />;
      break;
    case "leads":
      content = <AdminLeads />;
      break;
    case "feedback":
      content = <AdminFeedback />;
      break;
    case "settings":
    case "security": // legacy alias
    case "roles":    // legacy alias
      content = <AdminSettings isOwner={isOwner} />;
      break;
    default:
      content = <AdminHome />;
  }

  return <AdminLayout>{content}</AdminLayout>;
}
