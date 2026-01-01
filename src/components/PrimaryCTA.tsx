import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HelpCircle, ArrowRight } from "lucide-react";

export function PrimaryCTA() {
  return (
    <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20 shadow-card animate-slide-up">
      <CardContent className="py-8 px-6 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
          <HelpCircle className="w-7 h-7 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="font-display text-2xl font-semibold">Need help with something?</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Post what you need and let the community help you
          </p>
        </div>
        <Button size="lg" asChild className="gap-2">
          <Link to="/community-asks">
            Ask the Community
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
