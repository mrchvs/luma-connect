import { Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function QuietModeBanner() {
  return (
    <Card className="mb-6 border-muted bg-muted/30">
      <CardContent className="py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          <Eye className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            Quiet mode is on
          </p>
          <p className="text-xs text-muted-foreground">
            You won't be prompted to reach out. Browse at your own pace.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
