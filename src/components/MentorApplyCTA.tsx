import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { useIsMentor } from "@/hooks/use-mentor";
import { useMentorApplication } from "@/hooks/use-mentor-application";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Clock, ArrowRight } from "lucide-react";

interface MentorApplyCTAProps {
  variant?: "card" | "inline" | "button";
}

export function MentorApplyCTA({ variant = "button" }: MentorApplyCTAProps) {
  const { user, profile } = useAuth();
  const { data: isMentor, isLoading: mentorLoading } = useIsMentor(user?.id);
  const { data: application, isLoading: appLoading } = useMentorApplication(user?.id);
  
  // Don't show if not approved member
  if (profile?.status !== "approved") return null;
  
  // Don't show if already a mentor
  if (isMentor) return null;
  
  // Loading state
  if (mentorLoading || appLoading) return null;
  
  // If application is pending, show pending badge
  if (application?.status === "pending_review") {
    if (variant === "button") {
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="w-3 h-3" />
          Mentor Application Pending
        </Badge>
      );
    }
    return null;
  }
  
  // If rejected, show option to reapply
  if (application?.status === "rejected") {
    if (variant === "button") {
      return (
        <Button variant="outline" size="sm" asChild>
          <Link to="/mentor/apply">
            <GraduationCap className="w-4 h-4 mr-2" />
            Update Application
          </Link>
        </Button>
      );
    }
  }
  
  if (variant === "card") {
    return (
      <Card className="bg-gradient-to-r from-purple-500/5 to-primary/5 border-purple-500/20">
        <CardContent className="flex items-center gap-4 py-6">
          <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium">Become a Mentor</h3>
            <p className="text-sm text-muted-foreground">
              Share your expertise and offer paid services to the community.
            </p>
          </div>
          <Button asChild>
            <Link to="/mentor/apply">
              Apply Now
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  if (variant === "inline") {
    return (
      <Link 
        to="/mentor/apply"
        className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700 transition-colors"
      >
        <GraduationCap className="w-4 h-4" />
        Apply to become a mentor
        <ArrowRight className="w-3 h-3" />
      </Link>
    );
  }
  
  return (
    <Button variant="outline" size="sm" asChild>
      <Link to="/mentor/apply">
        <GraduationCap className="w-4 h-4 mr-2" />
        Become a Mentor
      </Link>
    </Button>
  );
}
