import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { useMentorProfile, useMentorServices, useIsMentor, type MentorService } from "@/hooks/use-mentor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MentorServiceCard } from "@/components/MentorServiceCard";
import { MentorSetupPrompt } from "@/components/MentorSetupPrompt";
import { BookingModal } from "@/components/BookingModal";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { GraduationCap, Clock, Sparkles, Settings, Lock } from "lucide-react";

interface MentorProfileTabProps {
  userId: string;
  userName: string;
  userAvatar?: string | null;
}

export function MentorProfileTab({ userId, userName, userAvatar }: MentorProfileTabProps) {
  const { user } = useAuth();
  const isOwnProfile = user?.id === userId;
  
  const { data: isMentor, isLoading: isMentorLoading } = useIsMentor(userId);
  const { data: mentorProfile, isLoading: profileLoading } = useMentorProfile(userId);
  const { data: services, isLoading: servicesLoading } = useMentorServices(mentorProfile?.id);
  
  const [selectedService, setSelectedService] = useState<MentorService | null>(null);

  const isLoading = isMentorLoading || profileLoading;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <LoadingSpinner size="md" />
        </CardContent>
      </Card>
    );
  }

  // Not a mentor
  if (!isMentor) {
    return null;
  }

  // Mentor but profile incomplete - show different view for owner vs others
  if (!mentorProfile?.is_complete) {
    if (isOwnProfile) {
      return <MentorSetupPrompt variant="card" />;
    }
    // For others, show disabled/locked state
    return (
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="py-8 text-center">
          <Lock className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
          <h3 className="font-display text-lg mb-2">Mentor Profile Coming Soon</h3>
          <p className="text-sm text-muted-foreground">
            {userName.split(" ")[0]} is setting up their mentor profile.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Mentor profile is inactive
  if (!mentorProfile.is_active) {
    if (isOwnProfile) {
      return (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="py-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-warning" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">Mentor Profile Inactive</h3>
                <p className="text-sm text-muted-foreground">
                  Your mentor profile is currently hidden from others.
                </p>
              </div>
              <Button variant="outline" asChild>
                <Link to="/mentor/setup">Reactivate</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="font-display text-xl">Mentor Profile</CardTitle>
                <CardDescription>{mentorProfile.headline}</CardDescription>
              </div>
            </div>
            {isOwnProfile && (
              <Button variant="outline" size="sm" asChild>
                <Link to="/mentor/setup">
                  <Settings className="w-4 h-4 mr-2" />
                  Edit
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Expertise areas */}
          {mentorProfile.expertise_areas.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Areas of Expertise
              </p>
              <div className="flex flex-wrap gap-2">
                {mentorProfile.expertise_areas.map((area) => (
                  <Badge key={area} variant="secondary">{area}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Who this is for */}
          {mentorProfile.who_this_is_for && (
            <div>
              <p className="text-sm font-medium mb-1">Who This Is For</p>
              <p className="text-sm text-muted-foreground">{mentorProfile.who_this_is_for}</p>
            </div>
          )}

          {/* Availability */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            Availability: {mentorProfile.availability === "by_request" ? "By request" : mentorProfile.availability}
          </div>
        </CardContent>
      </Card>

      {/* Services */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-display text-lg">Services Offered</CardTitle>
            {isOwnProfile && (
              <Button variant="outline" size="sm" asChild>
                <Link to="/mentor/setup?tab=services">Add Service</Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {servicesLoading ? (
            <LoadingSpinner size="sm" />
          ) : services && services.length > 0 ? (
            <div className="space-y-3">
              {services.filter(s => s.is_active).map((service) => (
                <MentorServiceCard
                  key={service.id}
                  service={service}
                  isOwner={isOwnProfile}
                  onBook={() => setSelectedService(service)}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              {isOwnProfile ? "No services added yet." : "No services available."}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Booking Modal */}
      {selectedService && mentorProfile && (
        <BookingModal
          open={!!selectedService}
          onOpenChange={(open) => !open && setSelectedService(null)}
          service={selectedService}
          mentorProfile={mentorProfile}
          mentorName={userName}
          mentorAvatar={userAvatar}
        />
      )}
    </div>
  );
}
