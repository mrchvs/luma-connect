import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Logo({ className, size = "md" }: LogoProps) {
  const sizes = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-4xl",
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative">
        <div className="w-8 h-8 rounded-full gradient-primary shadow-soft" />
        <div className="absolute inset-0 w-8 h-8 rounded-full gradient-primary blur-sm opacity-50" />
      </div>
      <span className={cn("font-display font-semibold tracking-tight text-foreground", sizes[size])}>
        Luma<span className="text-primary">Circle</span>
      </span>
    </div>
  );
}
