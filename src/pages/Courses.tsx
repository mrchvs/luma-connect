import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { MainNav } from "@/components/MainNav";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Clock } from "lucide-react";

export default function Courses() {
  const { user, profile, loading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
    if (!authLoading && user && !profile?.completed) {
      navigate("/onboarding");
    }
  }, [user, profile, authLoading, navigate]);

  // Fetch courses for admin view
  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user && isAdmin,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  // Non-admin users see coming soon state
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <main className="container py-16 px-4 max-w-2xl mx-auto text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <GraduationCap className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-semibold mb-3">
            Courses are coming soon
          </h1>
          <p className="text-muted-foreground">
            We're currently building the first learning experiences for the community.
          </p>
        </main>
      </div>
    );
  }

  // Admin view - list of courses
  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <main className="container py-8 px-4 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-semibold">Courses</h1>
          </div>
          <p className="text-muted-foreground">
            Manage courses and content. Go to Admin → Courses for full management.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" text="Loading courses..." />
          </div>
        ) : !courses || courses.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <GraduationCap className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h2 className="font-display text-xl mb-2">No courses yet</h2>
              <p className="text-muted-foreground">
                Create your first course in the Admin panel.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {courses.map((course) => (
              <Card key={course.id} className="hover:shadow-elevated transition-shadow">
                <CardContent className="py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-display font-medium truncate">
                          {course.title}
                        </h3>
                        <Badge variant={course.status === "published" ? "default" : "secondary"}>
                          {course.status}
                        </Badge>
                      </div>
                      {course.short_description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {course.short_description}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {course.mentor_name && (
                          <span>By {course.mentor_name}</span>
                        )}
                        <span className="capitalize">{course.format.replace("_", " ")}</span>
                        <Badge variant="outline" className="text-xs">
                          {course.access_type}
                        </Badge>
                      </div>
                    </div>
                    {course.price_cents > 0 && (
                      <div className="text-right">
                        <span className="font-medium">
                          ${(course.price_cents / 100).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
