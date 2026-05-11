import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Sparkles } from "lucide-react";

export function PrimaryCTA() {
  return (
    <Card className="bg-gradient-to-br from-primary/8 via-primary/5 to-background border-primary/15 shadow-card animate-slide-up">
      <CardContent className="py-5 px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-lg font-medium">Need help with something?</h2>
              <p className="text-sm text-muted-foreground">
                Ask the community and get support from fellow members
              </p>
            </div>
          </div>
          <Button size="default" asChild className="gap-2 w-full sm:w-auto flex-shrink-0">
            <Link to="/community-asks">
              <Sparkles className="w-4 h-4" />
              Ask the Community
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
