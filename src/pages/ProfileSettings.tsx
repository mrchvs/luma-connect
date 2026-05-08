import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useTags } from "@/hooks/use-tags";
import { Logo } from "@/components/Logo";
import { NotificationBell } from "@/components/NotificationBell";
import { MentorApplyCTA } from "@/components/MentorApplyCTA";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  User, 
  MapPin, 
  Globe, 
  Sparkles,
  Link as LinkIcon,
  Briefcase,
  Save,
  Mail,
  Phone,
  Camera,
  Loader2,
  Compass,
  Heart,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const TIMEZONES = [
  "UTC-12:00", "UTC-11:00", "UTC-10:00", "UTC-09:00", "UTC-08:00", "UTC-07:00",
  "UTC-06:00", "UTC-05:00", "UTC-04:00", "UTC-03:00", "UTC-02:00", "UTC-01:00",
  "UTC+00:00", "UTC+01:00", "UTC+02:00", "UTC+03:00", "UTC+04:00", "UTC+05:00",
  "UTC+05:30", "UTC+06:00", "UTC+07:00", "UTC+08:00", "UTC+09:00", "UTC+10:00",
  "UTC+11:00", "UTC+12:00"
];

const LANGUAGES = [
  "English", "Spanish", "French", "German", "Italian", "Portuguese", 
  "Chinese", "Japanese", "Korean", "Arabic", "Hindi", "Russian"
];

const TRANSITION_STAGES = [
  { value: "exploring", label: "Exploring" },
  { value: "clarifying", label: "Clarifying" },
  { value: "building", label: "Building" },
  { value: "stabilising", label: "Stabilising" },
  { value: "reflecting", label: "Reflecting & giving back" },
];

const INTERACTION_INTENTS = [
  { value: "perspective", label: "Perspective" },
  { value: "reality_check", label: "Reality check" },
  { value: "decision_support", label: "Decision support" },
  { value: "emotional_reassurance", label: "Emotional reassurance" },
  { value: "strategic_clarity", label: "Strategic clarity" },
];

import { 
  NOT_LOOKING_FOR_OPTIONS, 
  CONVERSATION_STYLE_OPTIONS 
} from "@/components/RelationalContextSection";

interface FormData {
  full_name: string;
  city: string;
  country: string;
  timezone: string;
  languages: string[];
  needs_tags: string[];
  offers_tags: string[];
  short_bio: string;
  bio_long: string;
  linkedin_url: string;
  website_url: string;
  portfolio_url: string;
  instagram_url: string;
  company_name: string;
  job_title: string;
  years_experience: string;
  email: string;
  show_email: boolean;
  phone_number: string;
  show_phone: boolean;
  avatar_url: string;
  current_stage: string;
  interaction_intent: string[];
  currently_navigating: string;
  not_looking_for: string[];
  conversation_style: string[];
}

async function compressImage(file: File, maxSizeMB = 1, maxDimension = 1200): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);

      // Try quality 0.85 first, drop to 0.7 if still too large
      const tryQuality = (quality: number) => {
        canvas.toBlob((blob) => {
          if (!blob) return resolve(file);
          if (blob.size > maxSizeMB * 1024 * 1024 && quality > 0.5) {
            tryQuality(quality - 0.15);
          } else {
            resolve(new File([blob], "avatar.jpg", { type: "image/jpeg" }));
          }
        }, "image/jpeg", quality);
      };
      tryQuality(0.85);
    };
    img.onerror = () => resolve(file);
    img.src = url;
  });
}

export default function ProfileSettings() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: tags } = useTags();
  const [initialNeeds, setInitialNeeds] = useState<string[]>([]);
  const [initialOffers, setInitialOffers] = useState<string[]>([]);

  const [formData, setFormData] = useState<FormData>({
    full_name: "",
    city: "",
    country: "",
    timezone: "",
    languages: [],
    needs_tags: [],
    offers_tags: [],
    short_bio: "",
    bio_long: "",
    linkedin_url: "",
    website_url: "",
    portfolio_url: "",
    instagram_url: "",
    company_name: "",
    job_title: "",
    years_experience: "",
    email: "",
    show_email: false,
    phone_number: "",
    show_phone: false,
    avatar_url: "",
    current_stage: "",
    interaction_intent: [],
    currently_navigating: "",
    not_looking_for: [],
    conversation_style: [],
  });


  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Load existing profile data
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (profileError) throw profileError;

        // Fetch contact info
        const { data: contactData } = await supabase
          .from("profile_contacts")
          .select("email, phone_number, show_email, show_phone")
          .eq("user_id", user.id)
          .maybeSingle();

        // Fetch needs & offers tags
        const { data: needsData } = await supabase
          .from("profile_needs").select("tags:tag_id(label)").eq("user_id", user.id);
        const { data: offersData } = await supabase
          .from("profile_offers").select("tags:tag_id(label)").eq("user_id", user.id);
        const needsLabels = needsData?.map((n: any) => n.tags?.label).filter(Boolean) || [];
        const offersLabels = offersData?.map((o: any) => o.tags?.label).filter(Boolean) || [];
        setInitialNeeds(needsLabels);
        setInitialOffers(offersLabels);

        setFormData({
          full_name: profileData.full_name || "",
          city: profileData.city || "",
          country: profileData.country || "",
          timezone: profileData.timezone || "",
          languages: profileData.languages || [],
          needs_tags: needsLabels,
          offers_tags: offersLabels,
          short_bio: profileData.short_bio || "",
          bio_long: profileData.bio_long || "",
          linkedin_url: profileData.linkedin_url || "",
          website_url: profileData.website_url || "",
          portfolio_url: profileData.portfolio_url || "",
          instagram_url: profileData.instagram_url || "",
          company_name: profileData.company_name || "",
          job_title: profileData.job_title || "",
          years_experience: profileData.years_experience?.toString() || "",
          email: contactData?.email || "",
          show_email: contactData?.show_email ?? false,
          phone_number: contactData?.phone_number || "",
          show_phone: contactData?.show_phone ?? false,
          avatar_url: profileData.avatar_url || "",
          current_stage: profileData.current_stage || "",
          interaction_intent: profileData.interaction_intent || [],
          currently_navigating: profileData.currently_navigating || "",
          not_looking_for: profileData.not_looking_for || [],
          conversation_style: profileData.conversation_style || [],
        });
      } catch (error: any) {
        toast({
          title: "Error loading profile",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [user, toast]);

  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field: "languages" | "needs_tags" | "offers_tags" | "interaction_intent" | "not_looking_for" | "conversation_style", item: string) => {
    setFormData((prev) => {
      const currentArray = prev[field];
      const maxItems = field === "needs_tags" ? 3 : field === "offers_tags" ? 5 : field === "interaction_intent" ? 2 : 12;
      
      if (currentArray.includes(item)) {
        return { ...prev, [field]: currentArray.filter((i) => i !== item) };
      } else if (currentArray.length < maxItems) {
        return { ...prev, [field]: [...currentArray, item] };
      }
      return prev;
    });
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file.",
        variant: "destructive",
      });
      return;
    }

    // Compress image if over 1MB
    let fileToUpload = file;
    if (file.size > 1 * 1024 * 1024) {
      fileToUpload = await compressImage(file);
    }

    setIsUploadingAvatar(true);
    try {
      const fileName = `${user.id}/avatar.jpg`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, fileToUpload, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Add cache buster to force refresh
      const avatarUrlWithCacheBuster = `${publicUrl}?t=${Date.now()}`;

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrlWithCacheBuster })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setFormData(prev => ({ ...prev, avatar_url: avatarUrlWithCacheBuster }));
      await refreshProfile();

      toast({
        title: "Photo uploaded",
        description: "Your profile picture has been updated.",
      });
    } catch (error: any) {
      console.error("Avatar upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
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
          portfolio_url: formData.portfolio_url || null,
          instagram_url: formData.instagram_url || null,
          company_name: formData.company_name || null,
          job_title: formData.job_title || null,
          years_experience: formData.years_experience ? parseInt(formData.years_experience) : null,
          avatar_url: formData.avatar_url || null,
          current_stage: formData.current_stage || null,
          interaction_intent: formData.interaction_intent.length > 0 ? formData.interaction_intent : null,
          currently_navigating: formData.currently_navigating || null,
          not_looking_for: formData.not_looking_for.length > 0 ? formData.not_looking_for : null,
          conversation_style: formData.conversation_style.length > 0 ? formData.conversation_style : null,
        })
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      // Upsert contact info
      const { error: contactError } = await supabase
        .from("profile_contacts")
        .upsert({
          user_id: user.id,
          email: formData.email || null,
          show_email: formData.show_email,
          phone_number: formData.phone_number || null,
          show_phone: formData.show_phone,
        }, { onConflict: "user_id" });

      if (contactError) throw contactError;

      // Save needs & offers tags (only if changed)
      if (JSON.stringify([...formData.needs_tags].sort()) !== JSON.stringify([...initialNeeds].sort())) {
        await supabase.from("profile_needs").delete().eq("user_id", user.id);
        if (formData.needs_tags.length > 0 && tags) {
          const rows = formData.needs_tags.map((l) => ({ user_id: user.id, tag_id: tags.find((t) => t.label === l)?.id })).filter((r) => r.tag_id);
          if (rows.length > 0) await supabase.from("profile_needs").insert(rows);
        }
        setInitialNeeds(formData.needs_tags);
      }
      if (JSON.stringify([...formData.offers_tags].sort()) !== JSON.stringify([...initialOffers].sort())) {
        await supabase.from("profile_offers").delete().eq("user_id", user.id);
        if (formData.offers_tags.length > 0 && tags) {
          const rows = formData.offers_tags.map((l) => ({ user_id: user.id, tag_id: tags.find((t) => t.label === l)?.id })).filter((r) => r.tag_id);
          if (rows.length > 0) await supabase.from("profile_offers").insert(rows);
        }
        setInitialOffers(formData.offers_tags);
      }

      await refreshProfile();

      toast({
        title: "Profile updated",
        description: "Your changes have been saved.",
      });

      // Redirect to profile view after successful save
      navigate(`/profile/${user.id}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <LoadingSpinner size="lg" text="Loading profile..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Logo size="sm" />
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8 px-4 max-w-3xl">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-semibold mb-2">Edit Profile</h1>
          <p className="text-muted-foreground">Update your profile information and preferences.</p>
        </div>

        {/* Personal Info Section */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="font-display text-lg">Personal Information</CardTitle>
                <CardDescription>Your basic profile details</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Upload */}
            <div className="flex items-center gap-6">
              <div className="relative group">
                <Avatar className="w-20 h-20 border-2 border-border">
                  <AvatarImage src={formData.avatar_url} alt={formData.full_name} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                    {formData.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <label
                  htmlFor="avatar-upload"
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6 text-white" />
                  )}
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={isUploadingAvatar}
                />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Profile Photo</p>
                <p className="text-xs text-muted-foreground">
                  Click the avatar to upload a photo. Large images are compressed automatically.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                placeholder="Your full name"
                value={formData.full_name}
                onChange={(e) => updateFormData("full_name", e.target.value)}
              />
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="email">Email</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formData.show_email ? "Visible to members" : "Hidden from members"}
                    </span>
                    <Switch
                      checked={formData.show_email}
                      onCheckedChange={(v) => updateFormData("show_email", v)}
                    />
                  </div>
                </div>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => updateFormData("email", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="phone_number">Phone Number</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formData.show_phone ? "Visible to members" : "Hidden from members"}
                    </span>
                    <Switch
                      checked={formData.show_phone}
                      onCheckedChange={(v) => updateFormData("show_phone", v)}
                    />
                  </div>
                </div>
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
        </Card>

        {/* Location Section */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="font-display text-lg">Location</CardTitle>
                <CardDescription>Where you're based</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="San Francisco"
                  value={formData.city}
                  onChange={(e) => updateFormData("city", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  placeholder="United States"
                  value={formData.country}
                  onChange={(e) => updateFormData("country", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <select
                id="timezone"
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-foreground"
                value={formData.timezone}
                onChange={(e) => updateFormData("timezone", e.target.value)}
              >
                <option value="">Select timezone</option>
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Journey & Support Section */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Compass className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="font-display text-lg">Journey & Support</CardTitle>
                <CardDescription>Where you are and what kind of support you're looking for</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Where are you in your journey right now?</Label>
              <div className="flex flex-wrap gap-2">
                {TRANSITION_STAGES.map((stage) => (
                  <Badge
                    key={stage.value}
                    variant={formData.current_stage === stage.value ? "default" : "outline"}
                    className="cursor-pointer transition-all hover:scale-105"
                    onClick={() => updateFormData("current_stage", formData.current_stage === stage.value ? "" : stage.value)}
                  >
                    {stage.label}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-muted-foreground" />
                  <Label>What kind of support do you usually look for? (max 2)</Label>
                </div>
                <span className="text-xs text-muted-foreground">{formData.interaction_intent.length}/2</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {INTERACTION_INTENTS.map((intent) => (
                  <Badge
                    key={intent.value}
                    variant={formData.interaction_intent.includes(intent.value) ? "default" : "outline"}
                    className="cursor-pointer transition-all hover:scale-105"
                    onClick={() => toggleArrayItem("interaction_intent", intent.value)}
                  >
                    {intent.label}
                  </Badge>
                ))}
              </div>
            </div>
            <Separator />

            {/* Currently Navigating */}
            <div className="space-y-3">
              <Label htmlFor="currently_navigating">What are you currently navigating?</Label>
              <Textarea
                id="currently_navigating"
                placeholder="E.g., Launching a new product, transitioning careers, finding product-market fit..."
                maxLength={140}
                value={formData.currently_navigating}
                onChange={(e) => updateFormData("currently_navigating", e.target.value)}
                className="min-h-[80px]"
              />
              <p className="text-xs text-muted-foreground text-right">
                {formData.currently_navigating.length}/140
              </p>
            </div>

            <Separator />

            {/* Not Looking For */}
            <div className="space-y-3">
              <Label>Not looking for right now</Label>
              <p className="text-xs text-muted-foreground">Help others understand what's off the table</p>
              <div className="flex flex-wrap gap-2">
                {NOT_LOOKING_FOR_OPTIONS.map((option) => (
                  <Badge
                    key={option}
                    variant={formData.not_looking_for.includes(option) ? "default" : "outline"}
                    className="cursor-pointer transition-all hover:scale-105"
                    onClick={() => toggleArrayItem("not_looking_for", option)}
                  >
                    {option}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            {/* Conversation Style */}
            <div className="space-y-3">
              <Label>Good conversations with me look like</Label>
              <p className="text-xs text-muted-foreground">Set expectations for how you prefer to connect</p>
              <div className="flex flex-wrap gap-2">
                {CONVERSATION_STYLE_OPTIONS.map((style) => (
                  <Badge
                    key={style}
                    variant={formData.conversation_style.includes(style) ? "default" : "outline"}
                    className="cursor-pointer transition-all hover:scale-105"
                    onClick={() => toggleArrayItem("conversation_style", style)}
                  >
                    {style}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Languages & Bio Section */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Globe className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="font-display text-lg">Languages & Bio</CardTitle>
                <CardDescription>Tell others about yourself</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Languages you speak</Label>
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

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="short_bio">Short Bio (max 300 characters)</Label>
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

            <div className="space-y-2">
              <Label htmlFor="bio_long">Detailed Bio (optional)</Label>
              <Textarea
                id="bio_long"
                placeholder="Share more about your background, experience, and what you're passionate about..."
                value={formData.bio_long}
                onChange={(e) => updateFormData("bio_long", e.target.value)}
                className="min-h-[150px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Professional Info Section */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="font-display text-lg">Professional Info</CardTitle>
                <CardDescription>Your work and experience</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="job_title">Job Title</Label>
                <Input
                  id="job_title"
                  placeholder="Product Designer"
                  value={formData.job_title}
                  onChange={(e) => updateFormData("job_title", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_name">Company</Label>
                <Input
                  id="company_name"
                  placeholder="Acme Inc."
                  value={formData.company_name}
                  onChange={(e) => updateFormData("company_name", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="years_experience">Years of Experience</Label>
              <Input
                id="years_experience"
                type="number"
                min="0"
                placeholder="5"
                value={formData.years_experience}
                onChange={(e) => updateFormData("years_experience", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Needs & Offers Section */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="font-display text-lg">Needs & Offers</CardTitle>
                <CardDescription>What you're looking for and how you can help others</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>What do you need? <span className="text-muted-foreground font-normal">(max 3)</span></Label>
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
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>What can you help with? <span className="text-muted-foreground font-normal">(max 5)</span></Label>
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
        </Card>

        {/* Links Section */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <LinkIcon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="font-display text-lg">Social Links</CardTitle>
                <CardDescription>Connect your online presence</CardDescription>
              </div>
            </div>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="portfolio_url">Portfolio URL</Label>
                <Input
                  id="portfolio_url"
                  placeholder="https://portfolio.com"
                  value={formData.portfolio_url}
                  onChange={(e) => updateFormData("portfolio_url", e.target.value)}
                />
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
            </div>
          </CardContent>
        </Card>

        {/* Mentor Section */}
        <MentorApplyCTA variant="card" />

        {/* Save button at bottom */}
        <div className="flex justify-end gap-4 mt-6">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </main>
    </div>
  );
}