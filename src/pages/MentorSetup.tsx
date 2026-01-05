import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { useTags } from "@/hooks/use-tags";
import {
  useMentorProfile,
  useMentorServices,
  useIsMentor,
  useCreateMentorProfile,
  useUpdateMentorProfile,
  useCreateMentorService,
  useUpdateMentorService,
  useDeleteMentorService,
  type MentorService,
} from "@/hooks/use-mentor";
import { MainNav } from "@/components/MainNav";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { 
  ArrowLeft,
  GraduationCap, 
  Sparkles, 
  Clock, 
  DollarSign,
  Plus,
  Trash2,
  CheckCircle2,
  Save,
} from "lucide-react";

const AVAILABILITY_OPTIONS = [
  { value: "by_request", label: "By request" },
  { value: "limited", label: "Limited availability" },
  { value: "open", label: "Open availability" },
];

interface ServiceFormData {
  name: string;
  description: string;
  duration_minutes: number;
  price: string;
  currency: string;
}

export default function MentorSetup() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "profile";

  const { data: isMentor, isLoading: isMentorLoading } = useIsMentor(user?.id);
  const { data: mentorProfile, isLoading: profileLoading } = useMentorProfile(user?.id);
  const { data: services, isLoading: servicesLoading } = useMentorServices(mentorProfile?.id);
  const { data: tags } = useTags();

  const createProfile = useCreateMentorProfile();
  const updateProfile = useUpdateMentorProfile();
  const createService = useCreateMentorService();
  const updateService = useUpdateMentorService();
  const deleteService = useDeleteMentorService();

  // Form state
  const [headline, setHeadline] = useState("");
  const [expertiseAreas, setExpertiseAreas] = useState<string[]>([]);
  const [whoThisIsFor, setWhoThisIsFor] = useState("");
  const [availability, setAvailability] = useState("by_request");
  const [isActive, setIsActive] = useState(true);

  // Service dialog state
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<MentorService | null>(null);
  const [serviceForm, setServiceForm] = useState<ServiceFormData>({
    name: "",
    description: "",
    duration_minutes: 30,
    price: "",
    currency: "USD",
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<MentorService | null>(null);

  // Load existing data
  useEffect(() => {
    if (mentorProfile) {
      setHeadline(mentorProfile.headline || "");
      setExpertiseAreas(mentorProfile.expertise_areas || []);
      setWhoThisIsFor(mentorProfile.who_this_is_for || "");
      setAvailability(mentorProfile.availability || "by_request");
      setIsActive(mentorProfile.is_active);
    }
  }, [mentorProfile]);

  const isLoading = authLoading || isMentorLoading || profileLoading;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
    if (!isMentorLoading && !isMentor) {
      toast.error("You must be approved as a mentor to access this page.");
      navigate("/dashboard");
    }
  }, [user, isMentor, authLoading, isMentorLoading, navigate]);

  const toggleExpertise = (area: string) => {
    setExpertiseAreas((prev) =>
      prev.includes(area)
        ? prev.filter((a) => a !== area)
        : prev.length < 10
        ? [...prev, area]
        : prev
    );
  };

  const handleSaveProfile = async () => {
    if (!headline.trim()) {
      toast.error("Please add a headline");
      return;
    }
    if (expertiseAreas.length === 0) {
      toast.error("Please select at least one area of expertise");
      return;
    }

    try {
      const isComplete = headline.trim().length > 0 && expertiseAreas.length > 0;
      const profileData = {
        headline: headline.trim(),
        expertise_areas: expertiseAreas,
        who_this_is_for: whoThisIsFor.trim() || null,
        availability,
        is_active: isActive,
        is_complete: isComplete,
      };

      if (mentorProfile) {
        await updateProfile.mutateAsync(profileData);
      } else {
        await createProfile.mutateAsync(profileData);
      }

      toast.success("Mentor profile saved!");
    } catch (error: any) {
      toast.error(error.message || "Failed to save profile");
    }
  };

  const openServiceDialog = (service?: MentorService) => {
    if (service) {
      setEditingService(service);
      setServiceForm({
        name: service.name,
        description: service.description,
        duration_minutes: service.duration_minutes,
        price: (service.price_cents / 100).toString(),
        currency: service.currency,
      });
    } else {
      setEditingService(null);
      setServiceForm({
        name: "",
        description: "",
        duration_minutes: 30,
        price: "",
        currency: "USD",
      });
    }
    setServiceDialogOpen(true);
  };

  const handleSaveService = async () => {
    if (!serviceForm.name.trim() || !serviceForm.description.trim() || !serviceForm.price) {
      toast.error("Please fill in all required fields");
      return;
    }

    const priceCents = Math.round(parseFloat(serviceForm.price) * 100);
    if (isNaN(priceCents) || priceCents <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    try {
      if (editingService) {
        await updateService.mutateAsync({
          id: editingService.id,
          name: serviceForm.name.trim(),
          description: serviceForm.description.trim(),
          duration_minutes: serviceForm.duration_minutes,
          price_cents: priceCents,
          currency: serviceForm.currency,
        });
        toast.success("Service updated!");
      } else if (mentorProfile) {
        await createService.mutateAsync({
          mentor_id: mentorProfile.id,
          name: serviceForm.name.trim(),
          description: serviceForm.description.trim(),
          duration_minutes: serviceForm.duration_minutes,
          price_cents: priceCents,
          currency: serviceForm.currency,
          is_active: true,
          display_order: services?.length || 0,
        });
        toast.success("Service added!");
      }
      setServiceDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save service");
    }
  };

  const handleDeleteService = async () => {
    if (!serviceToDelete || !mentorProfile) return;

    try {
      await deleteService.mutateAsync({
        id: serviceToDelete.id,
        mentorId: mentorProfile.id,
      });
      toast.success("Service deleted");
      setDeleteDialogOpen(false);
      setServiceToDelete(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete service");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  // Get topics from tags for expertise selection
  const topicOptions = tags?.map((t) => t.label) || [];

  return (
    <div className="min-h-screen gradient-hero">
      <MainNav />

      <main className="container py-8 px-4 max-w-3xl mx-auto">
        <Button variant="ghost" asChild className="mb-4 -ml-2">
          <Link to={user ? `/profile/${user.id}` : "/dashboard"}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Profile
          </Link>
        </Button>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold">Mentor Profile Setup</h1>
            <p className="text-muted-foreground">
              {mentorProfile?.is_complete ? "Edit your mentor profile" : "Complete your mentor profile to start offering sessions"}
            </p>
          </div>
        </div>

        <Tabs defaultValue={initialTab} className="space-y-6">
          <TabsList className="grid grid-cols-2 w-full max-w-xs">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="font-display">About Your Mentoring</CardTitle>
                <CardDescription>
                  Help members understand what you offer and who you can help
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Headline */}
                <div className="space-y-2">
                  <Label htmlFor="headline">Mentor Headline *</Label>
                  <p className="text-xs text-muted-foreground">
                    A one-sentence value proposition (e.g., "Helping early-stage founders validate and launch their SaaS")
                  </p>
                  <Input
                    id="headline"
                    placeholder="Enter your mentor headline..."
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    maxLength={120}
                  />
                  <p className="text-xs text-muted-foreground text-right">{headline.length}/120</p>
                </div>

                {/* Expertise Areas */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Areas of Expertise * (max 10)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Select topics you can confidently mentor others on
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {topicOptions.map((topic) => (
                      <Badge
                        key={topic}
                        variant={expertiseAreas.includes(topic) ? "default" : "outline"}
                        className="cursor-pointer transition-all hover:scale-105"
                        onClick={() => toggleExpertise(topic)}
                      >
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Who This Is For */}
                <div className="space-y-2">
                  <Label htmlFor="who-for">Who This Is For (Optional)</Label>
                  <p className="text-xs text-muted-foreground">
                    Help set expectations and avoid mismatched bookings
                  </p>
                  <Textarea
                    id="who-for"
                    placeholder="e.g., First-time founders building B2B products, Marketing managers transitioning to leadership..."
                    value={whoThisIsFor}
                    onChange={(e) => setWhoThisIsFor(e.target.value)}
                    rows={3}
                    maxLength={300}
                  />
                </div>

                {/* Availability */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    Availability
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABILITY_OPTIONS.map((opt) => (
                      <Badge
                        key={opt.value}
                        variant={availability === opt.value ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => setAvailability(opt.value)}
                      >
                        {opt.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Active toggle */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <Label htmlFor="active">Profile Active</Label>
                    <p className="text-xs text-muted-foreground">
                      When inactive, your mentor profile is hidden from others
                    </p>
                  </div>
                  <Switch
                    id="active"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                </div>

                <Button
                  onClick={handleSaveProfile}
                  disabled={updateProfile.isPending || createProfile.isPending}
                  className="w-full"
                >
                  {updateProfile.isPending || createProfile.isPending ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Profile
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="font-display">Services Offered</CardTitle>
                    <CardDescription>
                      Define the paid sessions you offer
                    </CardDescription>
                  </div>
                  <Button onClick={() => openServiceDialog()} disabled={!mentorProfile}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Service
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!mentorProfile ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-2">
                      Save your profile first to add services
                    </p>
                  </div>
                ) : servicesLoading ? (
                  <LoadingSpinner size="sm" />
                ) : services && services.length > 0 ? (
                  <div className="space-y-3">
                    {services.map((service) => (
                      <div
                        key={service.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{service.name}</h4>
                            {!service.is_active && (
                              <Badge variant="secondary" className="text-xs">Inactive</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {service.description}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-sm">
                            <span className="text-muted-foreground">
                              {service.duration_minutes} min
                            </span>
                            <span className="font-medium text-primary">
                              ${(service.price_cents / 100).toFixed(0)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openServiceDialog(service)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setServiceToDelete(service);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <DollarSign className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-muted-foreground mb-4">No services added yet</p>
                    <Button variant="outline" onClick={() => openServiceDialog()}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Service
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Completion Status */}
        {mentorProfile?.is_complete && (
          <div className="mt-6 p-4 rounded-lg bg-success/10 border border-success/30 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-success" />
            <div>
              <p className="font-medium text-success">Mentor Profile Complete</p>
              <p className="text-sm text-muted-foreground">
                Your profile is visible to other members
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Service Dialog */}
      <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingService ? "Edit Service" : "Add Service"}
            </DialogTitle>
            <DialogDescription>
              Define a paid session you offer to members
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="service-name">Service Name *</Label>
              <Input
                id="service-name"
                placeholder="e.g., Strategy Session, Portfolio Review..."
                value={serviceForm.name}
                onChange={(e) =>
                  setServiceForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="service-desc">Description *</Label>
              <Textarea
                id="service-desc"
                placeholder="What's included in this session..."
                value={serviceForm.description}
                onChange={(e) =>
                  setServiceForm((prev) => ({ ...prev, description: e.target.value }))
                }
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes) *</Label>
                <Input
                  id="duration"
                  type="number"
                  min={15}
                  step={15}
                  value={serviceForm.duration_minutes}
                  onChange={(e) =>
                    setServiceForm((prev) => ({
                      ...prev,
                      duration_minutes: parseInt(e.target.value) || 30,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price (USD) *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="price"
                    type="number"
                    min={1}
                    step={1}
                    className="pl-8"
                    placeholder="50"
                    value={serviceForm.price}
                    onChange={(e) =>
                      setServiceForm((prev) => ({ ...prev, price: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setServiceDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveService}
              disabled={createService.isPending || updateService.isPending}
            >
              {createService.isPending || updateService.isPending
                ? "Saving..."
                : editingService
                ? "Update"
                : "Add Service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{serviceToDelete?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteService}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
