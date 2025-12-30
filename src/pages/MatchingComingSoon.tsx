import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  ArrowRight,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";

export default function MatchingComingSoon() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/dashboard">
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            <Logo size="sm" />
          </div>
          <Button asChild>
            <Link to="/auth">Apply for Membership</Link>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-50" />
        <div className="container relative px-4 text-center">
          <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 animate-slide-up">
            Coming Soon
          </span>
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold mb-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            Smart Matching<br />
            <span className="text-primary">For Female Founders</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            Our intelligent matching system connects you with women who have exactly what you need — 
            and finds those who need what you offer.
          </p>
          <Button size="lg" asChild className="animate-scale-in" style={{ animationDelay: "0.3s" }}>
            <Link to="/auth">
              Join the Waitlist
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-muted/30">
        <div className="container px-4">
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-center mb-4">
            How Smart Matching Works
          </h2>
          <p className="text-muted-foreground text-center max-w-xl mx-auto mb-12">
            Our algorithm analyzes your needs, expertise, and preferences to find 
            the most relevant connections for you.
          </p>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Card className="text-center border-none shadow-card bg-background">
              <CardContent className="pt-8 pb-6">
                <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                  Step 1
                </span>
                <h3 className="font-display text-xl font-semibold mb-2">Define Your Needs</h3>
                <p className="text-muted-foreground text-sm">
                  Tell us what support you're looking for — fundraising, marketing, 
                  legal advice, mentorship, and more.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-none shadow-card bg-background">
              <CardContent className="pt-8 pb-6">
                <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                  Step 2
                </span>
                <h3 className="font-display text-xl font-semibold mb-2">Get Matched</h3>
                <p className="text-muted-foreground text-sm">
                  Our algorithm finds women whose expertise matches your needs, 
                  considering timezone, language, and experience.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-none shadow-card bg-background">
              <CardContent className="pt-8 pb-6">
                <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                  Step 3
                </span>
                <h3 className="font-display text-xl font-semibold mb-2">Connect & Grow</h3>
                <p className="text-muted-foreground text-sm">
                  Request intros to your matches, share your expertise with others, 
                  and build meaningful professional relationships.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20">
        <div className="container px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-display text-3xl md:text-4xl font-semibold text-center mb-12">
              Why You'll Love It
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  title: "Quality Over Quantity",
                  description: "Every match is curated based on real alignment between needs and expertise — no spam or irrelevant connections.",
                },
                {
                  title: "Two-Way Value",
                  description: "You're not just receiving help; you're giving it too. The system ensures everyone can contribute and benefit.",
                },
                {
                  title: "Privacy First",
                  description: "Contact details are only shared after both parties agree to connect, protecting your privacy.",
                },
                {
                  title: "Vetted Community",
                  description: "All members are reviewed before joining, ensuring you're connecting with serious, credible professionals.",
                },
              ].map((benefit, index) => (
                <div key={index} className="flex gap-4 p-4">
                  <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-display font-semibold mb-1">{benefit.title}</h3>
                    <p className="text-muted-foreground text-sm">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary/5">
        <div className="container px-4 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-semibold mb-4">
            Be the First to Experience Smart Matching
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto mb-8">
            Join our community of ambitious female founders and be notified when 
            the matching feature goes live.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/auth">
                Apply for Membership
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/dashboard">
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
