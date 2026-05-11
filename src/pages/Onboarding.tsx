import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useTags } from "@/hooks/use-tags";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowRight, 
  ArrowLeft, 
  User, 
  MapPin, 
  Globe, 
  MessageSquare, 
  Sparkles,
  Link as LinkIcon,
  CheckCircle2
} from "lucide-react";

const TIMEZONES: { value: string; label: string }[] = [
  { value: "UTC-12:00", label: "UTC-12:00 — Baker Island" },
  { value: "UTC-11:00", label: "UTC-11:00 — American Samoa" },
  { value: "UTC-10:00", label: "UTC-10:00 — Honolulu" },
  { value: "UTC-09:00", label: "UTC-09:00 — Anchorage" },
  { value: "UTC-08:00", label: "UTC-08:00 — Los Angeles, Vancouver" },
  { value: "UTC-07:00", label: "UTC-07:00 — Denver, Phoenix" },
  { value: "UTC-06:00", label: "UTC-06:00 — Chicago, Mexico City" },
  { value: "UTC-05:00", label: "UTC-05:00 — New York, Bogotá, Lima" },
  { value: "UTC-04:00", label: "UTC-04:00 — Santiago, Caracas" },
  { value: "UTC-03:00", label: "UTC-03:00 — São Paulo, Buenos Aires" },
  { value: "UTC-02:00", label: "UTC-02:00 — South Georgia" },
  { value: "UTC-01:00", label: "UTC-01:00 — Azores" },
  { value: "UTC+00:00", label: "UTC+00:00 — London, Lisbon, Accra" },
  { value: "UTC+01:00", label: "UTC+01:00 — Paris, Berlin, Madrid, Lagos" },
  { value: "UTC+02:00", label: "UTC+02:00 — Cairo, Johannesburg, Athens" },
  { value: "UTC+03:00", label: "UTC+03:00 — Nairobi, Riyadh, Moscow" },
  { value: "UTC+04:00", label: "UTC+04:00 — Dubai, Baku" },
  { value: "UTC+05:00", label: "UTC+05:00 — Karachi, Tashkent" },
  { value: "UTC+05:30", label: "UTC+05:30 — Mumbai, New Delhi" },
  { value: "UTC+06:00", label: "UTC+06:00 — Dhaka, Almaty" },
  { value: "UTC+07:00", label: "UTC+07:00 — Bangkok, Jakarta, Hanoi" },
  { value: "UTC+08:00", label: "UTC+08:00 — Singapore, Beijing, Kuala Lumpur" },
  { value: "UTC+09:00", label: "UTC+09:00 — Tokyo, Seoul" },
  { value: "UTC+10:00", label: "UTC+10:00 — Sydney, Melbourne" },
  { value: "UTC+11:00", label: "UTC+11:00 — Noumea, Solomon Islands" },
  { value: "UTC+12:00", label: "UTC+12:00 — Auckland, Fiji" },
];

const LANGUAGES = [
  "English", "Spanish", "French", "German", "Italian", "Portuguese", 
  "Chinese", "Japanese", "Korean", "Arabic", "Hindi", "Russian"
];

interface FormData {
  full_name: string;
  city: string;
  country: string;
  timezone: string;
  languages: string[];
  needs_tags: string[];
  offers_tags: string[];
  short_bio: string;
  linkedin_url: string;
  website_url: string;
  instagram_url: string;
  company_name: string;
  job_title: string;
  years_experience: string;
  bio_long: string;
  proof_links: string[];
  credibility_confirmed: boolean;
  email: string;
  phone_number: string;
}

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromMomentum = searchParams.get("from") === "momentum";
  const { toast } = useToast();
  const { data: tags, isLoading: tagsLoading } = useTags();

  const [formData, setFormData] = useState<FormData>({
    full_name: "",
    city: "",
    country: "",
    timezone: "",
    languages: [],
    needs_tags: [],
    offers_tags: [],
    short_bio: "",
    linkedin_url: "",
    website_url: "",
    instagram_url: "",
    company_name: "",
    job_title: "",
    years_experience: "",
    bio_long: "",
    proof_links: [""],
    credibility_confirmed: false,
    email: "",
    phone_number: "",
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
    if (!loading && profile?.completed) {
      navigate("/dashboard");
    }
  }, [user, profile, loading, navigate]);

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field: "languages" | "needs_tags" | "offers_tags", item: string) => {
    setFormData((prev) => {
      const currentArray = prev[field];
      const maxItems = field === "needs_tags" ? 3 : field === "offers_tags" ? 5 : 12;
      if (currentArray.includes(item)) {
        return { ...prev, [field]: currentArray.filter((i) => i !== item) };
      } else if (currentArray.length < maxItems) {
        return { ...prev, [field]: [...currentArray, item] };
      }
      return prev;
    });
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.full_name && formData.city && formData.country && formData.timezone;
      case 2:
        return formData.languages.length > 0 && formData.short_bio.length > 0 && formData.short_bio.length <= 300;
      case 3:
        return formData.needs_tags.length > 0 && formData.offers_tags.length > 0;
      case 4:
        return true; // Optional step
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Get profile ID first
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          city: formData.city,
          country: formData.country,
          timezone: formData.timezone,
          languages: formData.languages,
          short_bio: formData.short_bio,
          bio_long: formData.bio_long || null,
          linkedin_url: formData.linkedin_url || null,
          website_url: formData.website_url || null,
          instagram_url: formData.instagram_url || null,
          company_name: formData.company_name || null,
          job_title: formData.job_title || null,
          years_experience: formData.years_experience ? parseInt(formData.years_experience) : null,
          proof_links: formData.proof_links.filter(Boolean),
          credibility_confirmed: formData.credibility_confirmed,
          completed: true,
          status: "pending_review",
        })
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      // Save contact info to profile_contacts table
      if (formData.email || formData.phone_number) {
        const { error: contactError } = await supabase
          .from("profile_contacts")
          .upsert({
            user_id: user.id,
            email: formData.email || null,
            phone_number: formData.phone_number || null,
          }, { onConflict: 'user_id' });

        if (contactError) throw contactError;
      }


      // Save needs & offers tags
      await supabase.from("profile_needs").delete().eq("user_id", user.id);
      await supabase.from("profile_offers").delete().eq("user_id", user.id);

      if (formData.needs_tags.length > 0 && tags) {
        const needsToInsert = formData.needs_tags
          .map((label) => ({ user_id: user.id, tag_id: tags.find((t) => t.label === label)?.id }))
          .filter((item) => item.tag_id);
        if (needsToInsert.length > 0) await supabase.from("profile_needs").insert(needsToInsert);
      }

      if (formData.offers_tags.length > 0 && tags) {
        const offersToInsert = formData.offers_tags
          .map((label) => ({ user_id: user.id, tag_id: tags.find((t) => t.label === label)?.id }))
          .filter((item) => item.tag_id);
        if (offersToInsert.length > 0) await supabase.from("profile_offers").insert(offersToInsert);
      }

      // Notify admin about new application
      try {
        await supabase.functions.invoke('notify-admin-new-application', {
          body: {
            userId: user.id,
            profileId: profileData?.id,
            userName: formData.full_name,
            userLocation: `${formData.city}, ${formData.country}`,
          }
        });
      } catch (notifyError) {
        // Don't fail the submission if notification fails
        console.error('Failed to notify admin:', notifyError);
      }

      await refreshProfile();

      if (fromMomentum) {
        toast({
          title: "Profile submitted!",
          description: "Now set your monthly goal to get started with Monday Momentum.",
        });
        navigate("/accountability");
      } else {
        toast({
          title: "Profile submitted!",
          description: "Your profile is under review. We'll notify you when approved.",
        });
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (loading || tagsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero">
      <div className="container max-w-2xl py-8 px-4">
        <div className="mb-8">
          <Logo size="md" className="justify-center" />
        </div>

        <div className="mb-8">
          <Progress value={progress} className="h-2 mb-2" />
          <p className="text-sm text-muted-foreground text-center">
            Step {step} of {totalSteps}
          </p>
        </div>

        <Card className="shadow-elevated border-0 bg-card/90 backdrop-blur-sm animate-scale-in">
          {step === 1 && (
            <>
              <CardHeader className="text-center">
                <div className="w-12 h-12 rounded-full bg-luma-rose-light mx-auto mb-4 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="font-display text-2xl">Let's get to know you</CardTitle>
                <CardDescription>Tell us about yourself and where you're based</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    placeholder="Your full name"
                    value={formData.full_name}
                    onChange={(e) => updateFormData("full_name", e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      placeholder="San Francisco"
                      value={formData.city}
                      onChange={(e) => updateFormData("city", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country *</Label>
                    <Input
                      id="country"
                      placeholder="United States"
                      value={formData.country}
                      onChange={(e) => updateFormData("country", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone *</Label>
                  <select
                    id="timezone"
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-foreground"
                    value={formData.timezone}
                    onChange={(e) => updateFormData("timezone", e.target.value)}
                  >
                    <option value="">Select your timezone</option>
                    {TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>{tz.label}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={(e) => updateFormData("email", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone_number">Phone Number</Label>
                    <Input
                      id="phone_number"
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={formData.phone_number}
                      onChange={(e) => updateFormData("phone_number", e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </>
          )}

          {step === 2 && (
            <>
              <CardHeader className="text-center">
                <div className="w-12 h-12 rounded-full bg-luma-rose-light mx-auto mb-4 flex items-center justify-center">
                  <Globe className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="font-display text-2xl">Languages & Bio</CardTitle>
                <CardDescription>What languages do you speak? Tell us a bit about yourself.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>Languages you speak *</Label>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGES.map((lang) => (
                      <Badge
                        key={lang}
                        variant={formData.languages.includes(lang) ? "default" : "outline"}
                        className="cursor-pointer transition-all hover:scale-105"
                        onClick={() => toggleArrayItem("languages", lang)}
                      >
                        {lang}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="short_bio">Short Bio * (max 300 characters)</Label>
                  <Textarea
                    id="short_bio"
                    placeholder="A brief introduction about yourself..."
                    maxLength={300}
                    value={formData.short_bio}
                    onChange={(e) => updateFormData("short_bio", e.target.value)}
                    className="min-h-[100px]"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {formData.short_bio.length}/300
                  </p>
                </div>
              </CardContent>
            </>
          )}

          {step === 3 && (
            <>
              <CardHeader className="text-center">
                <div className="w-12 h-12 rounded-full bg-luma-rose-light mx-auto mb-4 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="font-display text-2xl">Needs & Offers</CardTitle>
                <CardDescription>Help others understand how you can support each other</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>What do you need most right now? * <span className="text-muted-foreground font-normal">(max 3)</span></Label>
                    <span className="text-xs text-muted-foreground">{formData.needs_tags.length}/3</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tags?.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant={formData.needs_tags.includes(tag.label) ? "default" : "outline"}
                        className="cursor-pointer transition-all hover:scale-105"
                        onClick={() => toggleArrayItem("needs_tags", tag.label)}
                      >
                        {tag.label}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>What can you help with? * <span className="text-muted-foreground font-normal">(max 5)</span></Label>
                    <span className="text-xs text-muted-foreground">{formData.offers_tags.length}/5</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tags?.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant={formData.offers_tags.includes(tag.label) ? "default" : "outline"}
                        className="cursor-pointer transition-all hover:scale-105"
                        onClick={() => toggleArrayItem("offers_tags", tag.label)}
                      >
                        {tag.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </>
          )}

          {step === 4 && (
            <>
              <CardHeader className="text-center">
                <div className="w-12 h-12 rounded-full bg-luma-rose-light mx-auto mb-4 flex items-center justify-center">
                  <LinkIcon className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="font-display text-2xl">Add Credibility (Optional)</CardTitle>
                <CardDescription>Help others trust you by sharing professional links</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                    <Input
                      id="linkedin_url"
                      placeholder="https://linkedin.com/in/..."
                      value={formData.linkedin_url}
                      onChange={(e) => updateFormData("linkedin_url", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website_url">Website URL</Label>
                    <Input
                      id="website_url"
                      placeholder="https://yourwebsite.com"
                      value={formData.website_url}
                      onChange={(e) => updateFormData("website_url", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instagram_url">Instagram URL</Label>
                  <Input
                    id="instagram_url"
                    placeholder="https://instagram.com/..."
                    value={formData.instagram_url}
                    onChange={(e) => updateFormData("instagram_url", e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Company Name</Label>
                    <Input
                      id="company_name"
                      placeholder="Your company"
                      value={formData.company_name}
                      onChange={(e) => updateFormData("company_name", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="job_title">Job Title</Label>
                    <Input
                      id="job_title"
                      placeholder="Your role"
                      value={formData.job_title}
                      onChange={(e) => updateFormData("job_title", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="years_experience">Years of Experience</Label>
                  <Input
                    id="years_experience"
                    type="number"
                    placeholder="5"
                    value={formData.years_experience}
                    onChange={(e) => updateFormData("years_experience", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio_long">Extended Bio (max 800 characters)</Label>
                  <Textarea
                    id="bio_long"
                    placeholder="Share more about your background, experience, and what drives you..."
                    maxLength={800}
                    value={formData.bio_long}
                    onChange={(e) => updateFormData("bio_long", e.target.value)}
                    className="min-h-[120px]"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {formData.bio_long.length}/800
                  </p>
                </div>

                <div className="flex items-start space-x-3 pt-4">
                  <Checkbox
                    id="credibility_confirmed"
                    checked={formData.credibility_confirmed}
                    onCheckedChange={(checked) => updateFormData("credibility_confirmed", !!checked)}
                  />
                  <label
                    htmlFor="credibility_confirmed"
                    className="text-sm text-muted-foreground leading-relaxed cursor-pointer"
                  >
                    I confirm the links I'm sharing are mine and accurate.
                  </label>
                </div>
              </CardContent>
            </>
          )}

          <div className="p-6 pt-0 flex justify-between gap-4">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
            
            {step < totalSteps ? (
              <Button
                variant="premium"
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="ml-auto"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                variant="premium"
                onClick={handleSubmit}
                disabled={isLoading}
                className="ml-auto"
              >
                {isLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    Complete Profile
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
