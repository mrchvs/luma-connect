import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Video,
  FileText,
  File,
  GripVertical,
  Users,
  DollarSign,
} from "lucide-react";
import { CourseAccessManager } from "./CourseAccessManager";

interface Course {
  id: string;
  title: string;
  short_description: string | null;
  mentor_name: string | null;
  format: "live" | "hybrid" | "on_demand";
  price_cents: number;
  access_type: "free" | "paid" | "subscription";
  status: "draft" | "published";
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
}

interface CourseContent {
  id: string;
  course_id: string;
  content_type: "video" | "text" | "file";
  title: string;
  content: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

const FORMAT_LABELS = {
  live: "Live",
  hybrid: "Hybrid",
  on_demand: "On-Demand",
};

const ACCESS_TYPE_LABELS = {
  free: "Free",
  paid: "Paid",
  subscription: "Subscription",
};

const CONTENT_TYPE_ICONS = {
  video: Video,
  text: FileText,
  file: File,
};

export function AdminCourses() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [contentToEdit, setContentToEdit] = useState<CourseContent | null>(null);
  const [showAccessManager, setShowAccessManager] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    short_description: "",
    mentor_name: "",
    format: "on_demand" as Course["format"],
    price_cents: 0,
    access_type: "free" as Course["access_type"],
    status: "draft" as Course["status"],
    cover_image_url: "",
  });

  const [contentFormData, setContentFormData] = useState({
    content_type: "video" as CourseContent["content_type"],
    title: "",
    content: "",
  });

  // Fetch courses
  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Course[];
    },
  });

  // Fetch course content
  const { data: courseContent, isLoading: contentLoading } = useQuery({
    queryKey: ["course-content", selectedCourse?.id],
    queryFn: async () => {
      if (!selectedCourse) return [];
      const { data, error } = await supabase
        .from("course_content")
        .select("*")
        .eq("course_id", selectedCourse.id)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as CourseContent[];
    },
    enabled: !!selectedCourse,
  });

  // Create course mutation
  const createCourseMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: course, error } = await supabase
        .from("courses")
        .insert({
          title: data.title,
          short_description: data.short_description || null,
          mentor_name: data.mentor_name || null,
          format: data.format,
          price_cents: data.price_cents,
          access_type: data.access_type,
          status: data.status,
          cover_image_url: data.cover_image_url || null,
        })
        .select()
        .single();

      if (error) throw error;
      return course;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      toast({ title: "Course created", description: "The course has been created successfully." });
      setIsCreating(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Update course mutation
  const updateCourseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const { error } = await supabase
        .from("courses")
        .update({
          title: data.title,
          short_description: data.short_description || null,
          mentor_name: data.mentor_name || null,
          format: data.format,
          price_cents: data.price_cents,
          access_type: data.access_type,
          status: data.status,
          cover_image_url: data.cover_image_url || null,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      toast({ title: "Course updated", description: "The course has been updated successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete course mutation
  const deleteCourseMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      toast({ title: "Course deleted", description: "The course has been deleted successfully." });
      setSelectedCourse(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Add content mutation
  const addContentMutation = useMutation({
    mutationFn: async (data: { course_id: string; content_type: string; title: string; content: string }) => {
      const { data: existingContent } = await supabase
        .from("course_content")
        .select("display_order")
        .eq("course_id", data.course_id)
        .order("display_order", { ascending: false })
        .limit(1);

      const nextOrder = existingContent?.[0]?.display_order ?? -1;

      const { error } = await supabase.from("course_content").insert({
        course_id: data.course_id,
        content_type: data.content_type as CourseContent["content_type"],
        title: data.title,
        content: data.content || null,
        display_order: nextOrder + 1,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-content", selectedCourse?.id] });
      toast({ title: "Content added", description: "The content has been added successfully." });
      setIsEditingContent(false);
      resetContentForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Update content mutation
  const updateContentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CourseContent> }) => {
      const { error } = await supabase.from("course_content").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-content", selectedCourse?.id] });
      toast({ title: "Content updated" });
      setContentToEdit(null);
      setIsEditingContent(false);
      resetContentForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete content mutation
  const deleteContentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("course_content").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-content", selectedCourse?.id] });
      toast({ title: "Content deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      short_description: "",
      mentor_name: "",
      format: "on_demand",
      price_cents: 0,
      access_type: "free",
      status: "draft",
      cover_image_url: "",
    });
  };

  const resetContentForm = () => {
    setContentFormData({
      content_type: "video",
      title: "",
      content: "",
    });
  };

  const handleCreateCourse = () => {
    setIsCreating(true);
    resetForm();
  };

  const handleEditCourse = (course: Course) => {
    setSelectedCourse(course);
    setFormData({
      title: course.title,
      short_description: course.short_description || "",
      mentor_name: course.mentor_name || "",
      format: course.format,
      price_cents: course.price_cents,
      access_type: course.access_type,
      status: course.status,
      cover_image_url: course.cover_image_url || "",
    });
  };

  const handleSaveCourse = () => {
    if (!formData.title.trim()) {
      toast({ title: "Error", description: "Course title is required", variant: "destructive" });
      return;
    }

    if (isCreating) {
      createCourseMutation.mutate(formData);
    } else if (selectedCourse) {
      updateCourseMutation.mutate({ id: selectedCourse.id, data: formData });
    }
  };

  const handleAddContent = () => {
    setIsEditingContent(true);
    setContentToEdit(null);
    resetContentForm();
  };

  const handleEditContent = (content: CourseContent) => {
    setContentToEdit(content);
    setContentFormData({
      content_type: content.content_type,
      title: content.title,
      content: content.content || "",
    });
    setIsEditingContent(true);
  };

  const handleSaveContent = () => {
    if (!contentFormData.title.trim()) {
      toast({ title: "Error", description: "Content title is required", variant: "destructive" });
      return;
    }

    if (contentToEdit) {
      updateContentMutation.mutate({
        id: contentToEdit.id,
        data: {
          content_type: contentFormData.content_type,
          title: contentFormData.title,
          content: contentFormData.content || null,
        },
      });
    } else if (selectedCourse) {
      addContentMutation.mutate({
        course_id: selectedCourse.id,
        content_type: contentFormData.content_type,
        title: contentFormData.title,
        content: contentFormData.content,
      });
    }
  };

  if (coursesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text="Loading courses..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-semibold">Courses</h2>
          <p className="text-muted-foreground">Create and manage course content</p>
        </div>
        <Button onClick={handleCreateCourse}>
          <Plus className="w-4 h-4 mr-2" />
          Create Course
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Course List */}
        <div className="lg:col-span-1 space-y-3">
          {courses?.length === 0 && (
            <Card className="bg-muted/50">
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No courses yet. Create your first course!</p>
              </CardContent>
            </Card>
          )}

          {courses?.map((course) => (
            <Card
              key={course.id}
              className={`cursor-pointer transition-all hover:shadow-card ${
                selectedCourse?.id === course.id && !isCreating ? "ring-2 ring-primary shadow-card" : ""
              }`}
              onClick={() => {
                setIsCreating(false);
                handleEditCourse(course);
              }}
            >
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-medium line-clamp-1">{course.title}</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={course.status === "published" ? "default" : "secondary"}>
                        {course.status === "published" ? (
                          <Eye className="w-3 h-3 mr-1" />
                        ) : (
                          <EyeOff className="w-3 h-3 mr-1" />
                        )}
                        {course.status}
                      </Badge>
                      <Badge variant="outline">{ACCESS_TYPE_LABELS[course.access_type]}</Badge>
                    </div>
                    {course.mentor_name && (
                      <p className="text-xs text-muted-foreground">by {course.mentor_name}</p>
                    )}
                  </div>
                  {course.price_cents > 0 && (
                    <span className="text-sm font-medium text-primary">
                      ${(course.price_cents / 100).toFixed(2)}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Course Editor */}
        <div className="lg:col-span-2">
          {!selectedCourse && !isCreating ? (
            <Card className="h-full flex items-center justify-center bg-muted/30">
              <CardContent className="text-center py-16">
                <Video className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">Select a course to edit or create a new one</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="font-display">
                  {isCreating ? "Create New Course" : "Edit Course"}
                </CardTitle>
                <CardDescription>
                  {isCreating
                    ? "Fill in the details to create a new course"
                    : "Update course details and manage content"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Course Details Form */}
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Course Title *</Label>
                    <Input
                      id="title"
                      placeholder="Enter course title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="short_description">Short Description</Label>
                    <Textarea
                      id="short_description"
                      placeholder="Brief description of the course"
                      value={formData.short_description}
                      onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="mentor_name">Mentor Name</Label>
                      <Input
                        id="mentor_name"
                        placeholder="Course instructor"
                        value={formData.mentor_name}
                        onChange={(e) => setFormData({ ...formData, mentor_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="format">Format</Label>
                      <Select
                        value={formData.format}
                        onValueChange={(v) => setFormData({ ...formData, format: v as Course["format"] })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="on_demand">On-Demand</SelectItem>
                          <SelectItem value="live">Live</SelectItem>
                          <SelectItem value="hybrid">Hybrid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price">Price (cents)</Label>
                      <Input
                        id="price"
                        type="number"
                        min="0"
                        placeholder="0"
                        value={formData.price_cents}
                        onChange={(e) =>
                          setFormData({ ...formData, price_cents: parseInt(e.target.value) || 0 })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="access_type">Access Type</Label>
                      <Select
                        value={formData.access_type}
                        onValueChange={(v) =>
                          setFormData({ ...formData, access_type: v as Course["access_type"] })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="subscription">Subscription</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(v) => setFormData({ ...formData, status: v as Course["status"] })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cover_image_url">Cover Image URL</Label>
                    <Input
                      id="cover_image_url"
                      placeholder="https://..."
                      value={formData.cover_image_url}
                      onChange={(e) => setFormData({ ...formData, cover_image_url: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleSaveCourse}
                    disabled={createCourseMutation.isPending || updateCourseMutation.isPending}
                  >
                    {createCourseMutation.isPending || updateCourseMutation.isPending ? (
                      <LoadingSpinner size="sm" />
                    ) : isCreating ? (
                      "Create Course"
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                  {!isCreating && selectedCourse && (
                    <>
                      <Button variant="outline" onClick={() => setShowAccessManager(true)}>
                        <Users className="w-4 h-4 mr-2" />
                        Manage Access
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this course?")) {
                            deleteCourseMutation.mutate(selectedCourse.id);
                          }
                        }}
                        disabled={deleteCourseMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                  {isCreating && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsCreating(false);
                        resetForm();
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>

                {/* Course Content Section */}
                {!isCreating && selectedCourse && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">Course Content</h3>
                        <Button size="sm" onClick={handleAddContent}>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Content
                        </Button>
                      </div>

                      {contentLoading ? (
                        <LoadingSpinner size="sm" />
                      ) : courseContent?.length === 0 ? (
                        <Card className="bg-muted/30">
                          <CardContent className="py-6 text-center">
                            <p className="text-sm text-muted-foreground">
                              No content yet. Add videos, text, or files.
                            </p>
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="space-y-2">
                          {courseContent?.map((content, index) => {
                            const Icon = CONTENT_TYPE_ICONS[content.content_type];
                            return (
                              <Card key={content.id} className="bg-muted/30">
                                <CardContent className="py-3">
                                  <div className="flex items-center gap-3">
                                    <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                                    <div className="p-2 rounded-lg bg-primary/10">
                                      <Icon className="w-4 h-4 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-sm truncate">{content.title}</p>
                                      <p className="text-xs text-muted-foreground capitalize">
                                        {content.content_type}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleEditContent(content)}
                                      >
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                          if (confirm("Delete this content?")) {
                                            deleteContentMutation.mutate(content.id);
                                          }
                                        }}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Content Edit Dialog */}
      <Dialog open={isEditingContent} onOpenChange={setIsEditingContent}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{contentToEdit ? "Edit Content" : "Add Content"}</DialogTitle>
            <DialogDescription>
              Add a video embed, text content, or downloadable file.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Content Type</Label>
              <Select
                value={contentFormData.content_type}
                onValueChange={(v) =>
                  setContentFormData({ ...contentFormData, content_type: v as CourseContent["content_type"] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">Video (YouTube/Vimeo/Loom)</SelectItem>
                  <SelectItem value="text">Text Content</SelectItem>
                  <SelectItem value="file">Downloadable File</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="Content title"
                value={contentFormData.title}
                onChange={(e) => setContentFormData({ ...contentFormData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>
                {contentFormData.content_type === "video"
                  ? "Video URL"
                  : contentFormData.content_type === "file"
                  ? "File URL"
                  : "Text Content"}
              </Label>
              {contentFormData.content_type === "text" ? (
                <Textarea
                  placeholder="Enter text content..."
                  rows={6}
                  value={contentFormData.content}
                  onChange={(e) => setContentFormData({ ...contentFormData, content: e.target.value })}
                />
              ) : (
                <Input
                  placeholder={
                    contentFormData.content_type === "video"
                      ? "https://youtube.com/watch?v=..."
                      : "https://example.com/file.pdf"
                  }
                  value={contentFormData.content}
                  onChange={(e) => setContentFormData({ ...contentFormData, content: e.target.value })}
                />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingContent(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveContent}
              disabled={addContentMutation.isPending || updateContentMutation.isPending}
            >
              {addContentMutation.isPending || updateContentMutation.isPending ? (
                <LoadingSpinner size="sm" />
              ) : contentToEdit ? (
                "Save"
              ) : (
                "Add"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Access Manager Dialog */}
      {selectedCourse && (
        <CourseAccessManager
          course={selectedCourse}
          open={showAccessManager}
          onOpenChange={setShowAccessManager}
        />
      )}
    </div>
  );
}
