import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

// Wordmark heights (px); width: auto preserves aspect ratio.
const HEIGHTS: Record<NonNullable<LogoProps["size"]>, number> = {
  sm: 22,
  md: 28,
  lg: 40,
};

export function Logo({ className, size = "md" }: LogoProps) {
  return (
    <div className={cn("flex items-center", className)}>
      <img
        src="/lumacircle-wordmark.png"
        alt="lumacircle"
        style={{ height: HEIGHTS[size], width: "auto", display: "block" }}
      />
    </div>
  );
}
