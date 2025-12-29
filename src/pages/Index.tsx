import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Heart, Users } from "lucide-react";

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen gradient-hero overflow-hidden">
      <header className="container flex items-center justify-between py-6 px-4">
        <Logo size="md" />
        <Button variant="ghost" onClick={() => navigate("/auth")}>
          Sign In
        </Button>
      </header>

      <main className="container px-4 py-20">
        <div className="max-w-3xl mx-auto text-center space-y-8 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-luma-rose-light text-primary text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            Women-only matchmaking platform
          </div>

          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-semibold leading-tight text-foreground">
            Connect with women who can help you{" "}
            <span className="text-gradient">thrive</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            A curated matchmaking platform that connects ambitious women based on what they need and what others can offer. Intentional connections, real growth.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button
              variant="premium"
              size="xl"
              onClick={() => navigate("/auth")}
              className="w-full sm:w-auto"
            >
              Get Started
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              size="xl"
              onClick={() => navigate("/auth")}
              className="w-full sm:w-auto"
            >
              Learn More
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-8 pt-16">
            {[
              { icon: Heart, title: "Curated Matches", desc: "Matched based on what you need and what others offer" },
              { icon: Users, title: "Trusted Community", desc: "Every profile is reviewed for quality and authenticity" },
              { icon: Sparkles, title: "Intentional Connections", desc: "No feed, no noise—just meaningful introductions" },
            ].map((feature, i) => (
              <div key={i} className="text-center space-y-3 animate-slide-up" style={{ animationDelay: `${0.2 + i * 0.1}s` }}>
                <div className="w-14 h-14 rounded-full bg-luma-rose-light mx-auto flex items-center justify-center">
                  <feature.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-display text-xl font-medium">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="container py-8 px-4 text-center text-sm text-muted-foreground">
        © 2024 Luma Match. All rights reserved.
      </footer>
    </div>
  );
}
