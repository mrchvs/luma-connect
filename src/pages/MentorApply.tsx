import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { MainNav } from "@/components/MainNav";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useTags } from "@/hooks/use-tags";
import { useIndustries } from "@/hooks/use-industries";
import { useIsMentor } from "@/hooks/use-mentor";
import {
  useMentorApplication,
  useCreateMentorApplication,
  useUpdateMentorApplication,
  useSubmitMentorApplication,
} from "@/hooks/use-mentor-application";
import {
  GraduationCap,
  ArrowLeft,
  Save,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  Building2,
  DollarSign,
  FileText,
  Link as LinkIcon,
  Calendar,
} from "lucide-react";

export default function MentorApply() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const { data: isMentor } = useIsMentor(user?.id);
  const { data: application, isLoading: applicationLoading } = useMentorApplication(user?.id);
  const { data: allTags } = useTags();
  const { data: allIndustries } = useIndustries();
  
  const createMutation = useCreateMentorApplication();
  const updateMutation = useUpdateMentorApplication();
  const submitMutation = useSubmitMentorApplication();
  
  const [formData, setFormData] = useState({
    expertise_areas: [] as string[],
    industries: [] as string[],
    services_description: "",
    pricing_info: "",
    mentor_bio: "",
    credentials_url: "",
    availability_preferences: "",
  });
  
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);
  
  useEffect(() => {
    if (application) {
      setFormData({
        expertise_areas: application.expertise_areas || [],
        industries: application.industries || [],
        services_description: application.services_description || "",
        pricing_info: application.pricing_info || "",
        mentor_bio: application.mentor_bio || "",
        credentials_url: application.credentials_url || "",
        availability_preferences: application.availability_preferences || "",
      });
    }
  }, [application]);
  
  // If already a mentor, redirect to setup
  useEffect(() => {
    if (isMentor) {
      navigate("/mentor/setup");
    }
  }, [isMentor, navigate]);
  
  const isLoading = authLoading || applicationLoading;
  const canEdit = !application || application.status === 'draft' || application.status === 'rejected';
  const isPending = application?.status === 'pending_review';
  const isApproved = application?.status === 'approved';
  const isRejected = application?.status === 'rejected';
  
  const handleSaveDraft = async () => {
    if (!user) return;
    
    try {
      if (application) {
        await updateMutation.mutateAsync({
          id: application.id,
          ...formData,
        });
      } else {
        await createMutation.mutateAsync({
          user_id: user.id,
          status: 'draft',
          ...formData,
        });
      }
      toast({
        title: "Draft saved",
        description: "Your application has been saved as a draft.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };
  
  const handleSubmit = async () => {
    if (!user) return;
    
    // Validate required fields
    if (formData.expertise_areas.length === 0) {
      toast({
        title: "Missing expertise",
        description: "Please select at least one area of expertise.",
        variant: "destructive",
      });
      return;
    }
    if (formData.industries.length === 0) {
      toast({
        title: "Missing industries",
        description: "Please select at least one industry.",
        variant: "destructive",
      });
      return;
    }
    if (!formData.services_description.trim()) {
      toast({
        title: "Missing services",
        description: "Please describe the services you plan to offer.",
        variant: "destructive",
      });
      return;
    }
    if (!formData.pricing_info.trim()) {
      toast({
        title: "Missing pricing",
        description: "Please provide pricing information.",
        variant: "destructive",
      });
      return;
    }
    if (!formData.mentor_bio.trim()) {
      toast({
        title: "Missing bio",
        description: "Please write a short mentor bio.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      let appId = application?.id;
      
      if (!appId) {
        const result = await createMutation.mutateAsync({
          user_id: user.id,
          status: 'draft',
          ...formData,
        });
        appId = result.id;
      } else {
        await updateMutation.mutateAsync({
          id: appId,
          ...formData,
        });
      }
      
      await submitMutation.mutateAsync(appId);
      
      toast({
        title: "Application submitted!",
        description: "We'll review your application and get back to you soon.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };
  
  const toggleExpertise = (label: string) => {
    setFormData(prev => ({
      ...prev,
      expertise_areas: prev.expertise_areas.includes(label)
        ? prev.expertise_areas.filter(e => e !== label)
        : [...prev.expertise_areas, label],
    }));
  };
  
  const toggleIndustry = (label: string) => {
    setFormData(prev => ({
      ...prev,
      industries: prev.industries.includes(label)
        ? prev.industries.filter(i => i !== label)
        : [...prev.industries, label],
    }));
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      
      <main className="container py-8 px-4 max-w-2xl">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/profile-settings">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Settings
          </Link>
        </Button>
        
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <GraduationCap className="w-6 h-6 text-purple-600" />
            </div>
            <h1 className="font-display text-2xl font-semibold">Become a Mentor</h1>
          </div>
          <p className="text-muted-foreground">
            Share your expertise and offer paid services to the community.
          </p>
        </div>
        
        {/* Status Banner */}
        {isPending && (
          <Card className="mb-6 border-warning/30 bg-warning/5">
            <CardContent className="flex items-center gap-4 py-6">
              <div className="w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-warning" />
              </div>
              <div>
                <h3 className="font-medium">Application Under Review</h3>
                <p className="text-sm text-muted-foreground">
                  We're reviewing your mentor application. You'll be notified once a decision is made.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
        
        {isApproved && (
          <Card className="mb-6 border-success/30 bg-success/5">
            <CardContent className="flex items-center gap-4 py-6">
              <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-success" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-success">Application Approved!</h3>
                <p className="text-sm text-muted-foreground">
                  Congratulations! Set up your Mentor Profile to start offering services.
                </p>
              </div>
              <Button asChild>
                <Link to="/mentor/setup">Set Up Profile</Link>
              </Button>
            </CardContent>
          </Card>
        )}
        
        {isRejected && (
          <Card className="mb-6 border-destructive/30 bg-destructive/5">
            <CardContent className="py-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <h3 className="font-medium text-destructive">Application Not Approved</h3>
                  <p className="text-sm text-muted-foreground">
                    Unfortunately, your application wasn't approved this time.
                  </p>
                </div>
              </div>
              {application?.rejection_reason && (
                <div className="p-4 rounded-lg bg-background border">
                  <p className="text-sm font-medium mb-1">Feedback:</p>
                  <p className="text-sm text-muted-foreground">{application.rejection_reason}</p>
                </div>
              )}
              <p className="text-sm text-muted-foreground mt-4">
                You can update your application and resubmit.
              </p>
            </CardContent>
          </Card>
        )}
        
        {/* Application Form */}
        <div className="space-y-6">
          {/* Expertise Areas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="w-5 h-5 text-primary" />
                Areas of Expertise
              </CardTitle>
              <CardDescription>
                What topics can you help with? Select all that apply.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {allTags?.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant={formData.expertise_areas.includes(tag.label) ? "default" : "outline"}
                    className={`cursor-pointer transition-colors ${
                      !canEdit ? "pointer-events-none opacity-60" : ""
                    }`}
                    onClick={() => canEdit && toggleExpertise(tag.label)}
                  >
                    {tag.label}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Industries */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="w-5 h-5 text-primary" />
                Industries
              </CardTitle>
              <CardDescription>
                What industries do you have experience in?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {allIndustries?.map((industry) => (
                  <Badge
                    key={industry.id}
                    variant={formData.industries.includes(industry.label) ? "default" : "outline"}
                    className={`cursor-pointer transition-colors ${
                      !canEdit ? "pointer-events-none opacity-60" : ""
                    }`}
                    onClick={() => canEdit && toggleIndustry(industry.label)}
                  >
                    {industry.label}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Services */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5 text-primary" />
                Services You'll Offer
              </CardTitle>
              <CardDescription>
                Describe the services you plan to offer (e.g., 1:1 calls, portfolio reviews, strategy sessions).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.services_description}
                onChange={(e) => setFormData(prev => ({ ...prev, services_description: e.target.value }))}
                placeholder="E.g., 30-minute quick consultations, 60-minute deep-dive strategy sessions, async portfolio feedback..."
                rows={4}
                disabled={!canEdit}
              />
            </CardContent>
          </Card>
          
          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="w-5 h-5 text-primary" />
                Pricing
              </CardTitle>
              <CardDescription>
                What pricing do you plan to charge for your services?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.pricing_info}
                onChange={(e) => setFormData(prev => ({ ...prev, pricing_info: e.target.value }))}
                placeholder="E.g., $50 for 30 minutes, $100 for 60 minutes, $200 for async review..."
                rows={3}
                disabled={!canEdit}
              />
            </CardContent>
          </Card>
          
          {/* Mentor Bio */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <GraduationCap className="w-5 h-5 text-primary" />
                Mentor Bio
              </CardTitle>
              <CardDescription>
                Write a short bio focused on your mentoring experience and what makes you a good mentor.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.mentor_bio}
                onChange={(e) => setFormData(prev => ({ ...prev, mentor_bio: e.target.value }))}
                placeholder="Describe your background, what you've helped others achieve, and your mentoring approach..."
                rows={4}
                disabled={!canEdit}
              />
            </CardContent>
          </Card>
          
          {/* Optional: Credentials */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <LinkIcon className="w-5 h-5 text-primary" />
                Credentials (Optional)
              </CardTitle>
              <CardDescription>
                Link to your LinkedIn, portfolio, or other relevant credentials.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                value={formData.credentials_url}
                onChange={(e) => setFormData(prev => ({ ...prev, credentials_url: e.target.value }))}
                placeholder="https://linkedin.com/in/yourprofile"
                disabled={!canEdit}
              />
            </CardContent>
          </Card>
          
          {/* Optional: Availability */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="w-5 h-5 text-primary" />
                Availability (Optional)
              </CardTitle>
              <CardDescription>
                When are you typically available for sessions?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                value={formData.availability_preferences}
                onChange={(e) => setFormData(prev => ({ ...prev, availability_preferences: e.target.value }))}
                placeholder="E.g., Weekdays 9am-5pm EST, flexible on weekends"
                disabled={!canEdit}
              />
            </CardContent>
          </Card>
          
          {/* Actions */}
          {canEdit && (
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Draft
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending || submitMutation.isPending}
              >
                <Send className="w-4 h-4 mr-2" />
                {isRejected ? "Resubmit Application" : "Submit Application"}
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
