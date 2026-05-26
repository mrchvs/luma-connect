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

  const totalSteps = 3;

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
        return !!(formData.full_name && formData.city && formData.country && formData.timezone && formData.phone_number);
      case 2:
        return formData.languages.length > 0 && formData.short_bio.length > 0 && formData.short_bio.length <= 300;
      case 3:
        return formData.needs_tags.length > 0 && formData.offers_tags.length > 0;
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

      // Check if user is in a momentum cohort (by email, since user_id may not be linked yet)
      const { data: cohortMember } = await supabase
        .from("accountability_cycle_members")
        .select("id")
        .ilike("email", user.email ?? "")
        .maybeSingle();

      if (fromMomentum || cohortMember) {
        toast({
          title: "Profile submitted!",
          description: "Head to Monday Momentum to set your monthly goal.",
        });
        navigate("/momentum");
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

  const stepLabels = ['About you', 'Profile', 'Community'];

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #FAF6F0 0%, #F1E9FB55 100%)' }}>
      <div className="container max-w-3xl py-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Logo size="md" />
          <span className="text-sm" style={{ color: '#6B6259' }}>Step {step} of {totalSteps}</span>
        </div>

        {/* Step nav */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {stepLabels.map((label, i) => {
            const done = i + 1 < step;
            const cur = i + 1 === step;
            return (
              <div key={label} className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold transition-all"
                    style={{
                      background: done ? '#FF5C2A' : cur ? '#fff' : '#FAF6F0',
                      border: `1.5px solid ${done || cur ? '#FF5C2A' : '#E8E1D2'}`,
                      color: done ? '#fff' : cur ? '#FF5C2A' : '#9A9087',
                    }}>
                    {done
                      ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round"><path d="M5 12l5 5L20 7"/></svg>
                      : i + 1}
                  </div>
                  <span className="text-sm hidden sm:inline" style={{
                    fontWeight: cur ? 600 : 500,
                    color: cur ? '#2A241F' : '#6B6259',
                    letterSpacing: -0.1,
                  }}>{label}</span>
                </div>
                {i < stepLabels.length - 1 && (
                  <div className="w-7 h-px hidden sm:block" style={{ background: '#E8E1D2' }} />
                )}
              </div>
            );
          })}
        </div>

        <Card className="animate-scale-in" style={{ borderRadius: 20, border: '1px solid #E8E1D2', boxShadow: '0 24px 60px -24px rgba(40,30,20,0.12)', background: '#fff' }}>
          {/* Step 1 — About you */}
          {step === 1 && (
            <>
              <CardHeader className="text-center">
                <div className="w-12 h-12 rounded-full bg-luma-rose-light mx-auto mb-4 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="font-display text-2xl">Tell us about yourself</CardTitle>
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
                      placeholder="Lisbon"
                      value={formData.city}
                      onChange={(e) => updateFormData("city", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country *</Label>
                    <Input
                      id="country"
                      placeholder="Portugal"
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

                <div className="space-y-2">
                  <Label htmlFor="phone_number">WhatsApp Number *</Label>
                  <Input
                    id="phone_number"
                    type="tel"
                    placeholder="+351 912 345 678"
                    value={formData.phone_number}
                    onChange={(e) => updateFormData("phone_number", e.target.value)}
                  />
                </div>
              </CardContent>
            </>
          )}

          {/* Step 2 — Profile (languages + bio + links) */}
          {step === 2 && (
            <>
              <CardHeader className="text-center">
                <div className="w-12 h-12 rounded-full bg-luma-rose-light mx-auto mb-4 flex items-center justify-center">
                  <Globe className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="font-display text-2xl">Your profile</CardTitle>
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
                  <Label htmlFor="short_bio">About you * <span className="text-muted-foreground font-normal">(max 300 characters)</span></Label>
                  <Textarea
                    id="short_bio"
                    placeholder="A brief introduction about yourself — what you're building, what drives you…"
                    maxLength={300}
                    value={formData.short_bio}
                    onChange={(e) => updateFormData("short_bio", e.target.value)}
                    className="min-h-[140px]"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {formData.short_bio.length}/300
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Company</Label>
                    <Input
                      id="company_name"
                      placeholder="Your company"
                      value={formData.company_name}
                      onChange={(e) => updateFormData("company_name", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="job_title">Role</Label>
                    <Input
                      id="job_title"
                      placeholder="Founder, CEO…"
                      value={formData.job_title}
                      onChange={(e) => updateFormData("job_title", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="linkedin_url">LinkedIn</Label>
                    <Input
                      id="linkedin_url"
                      placeholder="https://linkedin.com/in/..."
                      value={formData.linkedin_url}
                      onChange={(e) => updateFormData("linkedin_url", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website_url">Website</Label>
                    <Input
                      id="website_url"
                      placeholder="https://yourwebsite.com"
                      value={formData.website_url}
                      onChange={(e) => updateFormData("website_url", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instagram_url">Instagram</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                    <Input
                      id="instagram_url"
                      placeholder="yourhandle"
                      className="pl-7"
                      value={formData.instagram_url.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, "")}
                      onChange={(e) => updateFormData("instagram_url", e.target.value.replace(/^@/, ""))}
                    />
                  </div>
                </div>
              </CardContent>
            </>
          )}

          {/* Step 3 — Community (needs & offers) */}
          {step === 3 && (
            <>
              <CardHeader className="text-center">
                <div className="w-12 h-12 rounded-full bg-luma-rose-light mx-auto mb-4 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="font-display text-2xl">Give & take</CardTitle>
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
