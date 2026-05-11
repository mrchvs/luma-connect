import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Compass, ArrowRight } from "lucide-react";

export function QuietModeCard() {
  return (
    <Card className="mb-6 animate-slide-up">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-muted-foreground" />
          <CardTitle className="font-display text-lg">Explore the Community</CardTitle>
        </div>
        <CardDescription>
          Browse at your own pace — no prompts, no pressure
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 gap-3">
          <Button variant="outline" asChild className="justify-start gap-2">
            <Link to="/community">
              Community Hub
              <ArrowRight className="w-4 h-4 ml-auto" />
            </Link>
          </Button>
          <Button variant="outline" asChild className="justify-start gap-2">
            <Link to="/people">
              Browse People
              <ArrowRight className="w-4 h-4 ml-auto" />
            </Link>
          </Button>
          <Button variant="outline" asChild className="justify-start gap-2">
            <Link to="/pods">
              View Pods
              <ArrowRight className="w-4 h-4 ml-auto" />
            </Link>
          </Button>
          <Button variant="outline" asChild className="justify-start gap-2">
            <Link to="/courses">
              Courses
              <ArrowRight className="w-4 h-4 ml-auto" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
