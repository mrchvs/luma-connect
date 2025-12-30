import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Eye, EyeOff, Mail, Lock, ArrowRight, Sparkles, CheckCircle, ArrowLeft, RefreshCw } from "lucide-react";

const authSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const emailOnlySchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

const passwordOnlySchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type AuthFormData = z.infer<typeof authSchema>;
type EmailFormData = z.infer<typeof emailOnlySchema>;
type PasswordFormData = z.infer<typeof passwordOnlySchema>;

type ViewState = "auth" | "emailSent" | "forgotPassword" | "resetSent" | "newPassword";

export default function Auth() {
  const [searchParams] = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [viewState, setViewState] = useState<ViewState>("auth");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const { signIn, signUp, user, profile, loading, resendVerificationEmail, resetPassword, updatePassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailOnlySchema),
    defaultValues: {
      email: "",
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordOnlySchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    // Check if this is a password reset redirect
    if (searchParams.get("reset") === "true") {
      setViewState("newPassword");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!loading && user && viewState !== "newPassword") {
      if (profile?.completed) {
        navigate("/dashboard");
      } else {
        navigate("/onboarding");
      }
    }
  }, [user, profile, loading, navigate, viewState]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const onSubmit = async (data: AuthFormData) => {
    setIsLoading(true);
    try {
      if (isSignUp) {
        const { error } = await signUp(data.email, data.password);
        if (error) {
          if (error.message.includes("already registered")) {
            toast({
              title: "Account exists",
              description: "This email is already registered. Please sign in instead.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Sign up failed",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          setSubmittedEmail(data.email);
          setViewState("emailSent");
        }
      } else {
        const { error } = await signIn(data.email, data.password);
        if (error) {
          if (error.message.includes("Email not confirmed")) {
            toast({
              title: "Email not verified",
              description: "Please check your inbox and verify your email before signing in.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Sign in failed",
              description: "Invalid email or password. Please try again.",
              variant: "destructive",
            });
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (resendCooldown > 0) return;
    
    setIsLoading(true);
    try {
      const { error } = await resendVerificationEmail(submittedEmail);
      if (error) {
        toast({
          title: "Failed to resend",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Email sent",
          description: "We've sent another verification email to your inbox.",
        });
        setResendCooldown(60);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (data: EmailFormData) => {
    setIsLoading(true);
    try {
      const { error } = await resetPassword(data.email);
      if (error) {
        toast({
          title: "Failed to send reset email",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setSubmittedEmail(data.email);
        setViewState("resetSent");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (data: PasswordFormData) => {
    setIsLoading(true);
    try {
      const { error } = await updatePassword(data.password);
      if (error) {
        toast({
          title: "Failed to update password",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Password updated",
          description: "Your password has been successfully updated.",
        });
        setViewState("auth");
        navigate("/auth");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToAuth = () => {
    setViewState("auth");
    setSubmittedEmail("");
    form.reset();
    emailForm.reset();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex gradient-hero">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:flex-1 flex-col justify-between p-12">
        <Logo size="lg" />
        
        <div className="space-y-6 max-w-md">
          <h1 className="font-display text-5xl font-semibold leading-tight text-foreground">
            Connect with women who can help you{" "}
            <span className="text-gradient">grow</span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            A curated matchmaking platform connecting ambitious women based on what they need and what they can offer.
          </p>
          
          <div className="flex items-center gap-4 pt-4">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full bg-luma-rose-light border-2 border-background flex items-center justify-center"
                >
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Join hundreds of women already matched
            </p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          © 2024 Luma Match. All rights reserved.
        </p>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        {viewState === "emailSent" && (
          <Card className="w-full max-w-md shadow-elevated border-0 bg-card/80 backdrop-blur-sm animate-scale-in">
            <CardHeader className="text-center space-y-4 pb-2">
              <div className="lg:hidden mb-4">
                <Logo size="md" className="justify-center" />
              </div>
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="font-display text-2xl">Check your email</CardTitle>
              <CardDescription className="text-base">
                We've sent a verification link to
                <br />
                <span className="font-medium text-foreground">{submittedEmail}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>Click the link in the email to verify your account and complete your registration.</p>
                <p>If you don't see the email, check your spam folder.</p>
              </div>
              
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleResendEmail}
                  disabled={isLoading || resendCooldown > 0}
                >
                  {isLoading ? (
                    <LoadingSpinner size="sm" />
                  ) : resendCooldown > 0 ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Resend in {resendCooldown}s
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Resend verification email
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={handleBackToAuth}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Use a different email
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Already verified?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setViewState("auth");
                      setIsSignUp(false);
                    }}
                    className="font-medium text-primary hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {viewState === "forgotPassword" && (
          <Card className="w-full max-w-md shadow-elevated border-0 bg-card/80 backdrop-blur-sm animate-scale-in">
            <CardHeader className="text-center space-y-2 pb-2">
              <div className="lg:hidden mb-4">
                <Logo size="md" className="justify-center" />
              </div>
              <CardTitle className="font-display text-2xl">Reset your password</CardTitle>
              <CardDescription>
                Enter your email and we'll send you a link to reset your password
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              <form onSubmit={emailForm.handleSubmit(handleForgotPassword)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="you@example.com"
                      className="pl-10"
                      {...emailForm.register("email")}
                    />
                  </div>
                  {emailForm.formState.errors.email && (
                    <p className="text-sm text-destructive">{emailForm.formState.errors.email.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="premium"
                  size="lg"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      Send reset link
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </form>

              <Button
                variant="ghost"
                className="w-full"
                onClick={handleBackToAuth}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to sign in
              </Button>
            </CardContent>
          </Card>
        )}

        {viewState === "resetSent" && (
          <Card className="w-full max-w-md shadow-elevated border-0 bg-card/80 backdrop-blur-sm animate-scale-in">
            <CardHeader className="text-center space-y-4 pb-2">
              <div className="lg:hidden mb-4">
                <Logo size="md" className="justify-center" />
              </div>
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="font-display text-2xl">Check your email</CardTitle>
              <CardDescription className="text-base">
                We've sent a password reset link to
                <br />
                <span className="font-medium text-foreground">{submittedEmail}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>Click the link in the email to reset your password.</p>
                <p>If you don't see the email, check your spam folder.</p>
              </div>
              
              <Button
                variant="ghost"
                className="w-full"
                onClick={handleBackToAuth}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to sign in
              </Button>
            </CardContent>
          </Card>
        )}

        {viewState === "newPassword" && (
          <Card className="w-full max-w-md shadow-elevated border-0 bg-card/80 backdrop-blur-sm animate-scale-in">
            <CardHeader className="text-center space-y-2 pb-2">
              <div className="lg:hidden mb-4">
                <Logo size="md" className="justify-center" />
              </div>
              <CardTitle className="font-display text-2xl">Set new password</CardTitle>
              <CardDescription>
                Enter your new password below
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              <form onSubmit={passwordForm.handleSubmit(handleUpdatePassword)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
                      {...passwordForm.register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordForm.formState.errors.password && (
                    <p className="text-sm text-destructive">{passwordForm.formState.errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10"
                      {...passwordForm.register("confirmPassword")}
                    />
                  </div>
                  {passwordForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-destructive">{passwordForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="premium"
                  size="lg"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      Update password
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {viewState === "auth" && (
          <Card className="w-full max-w-md shadow-elevated border-0 bg-card/80 backdrop-blur-sm animate-scale-in">
            <CardHeader className="text-center space-y-2 pb-2">
              <div className="lg:hidden mb-4">
                <Logo size="md" className="justify-center" />
              </div>
              <CardTitle className="font-display text-2xl">
                {isSignUp ? "Create your account" : "Welcome back"}
              </CardTitle>
              <CardDescription>
                {isSignUp
                  ? "Start your journey to meaningful connections"
                  : "Sign in to continue to your matches"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      className="pl-10"
                      {...form.register("email")}
                    />
                  </div>
                  {form.formState.errors.email && (
                    <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    {!isSignUp && (
                      <button
                        type="button"
                        onClick={() => setViewState("forgotPassword")}
                        className="text-xs text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
                      {...form.register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {form.formState.errors.password && (
                    <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="premium"
                  size="lg"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      {isSignUp ? "Create account" : "Sign in"}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </form>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {isSignUp ? "Already have an account? " : "Don't have an account? "}
                  <span className="font-medium text-primary">
                    {isSignUp ? "Sign in" : "Sign up"}
                  </span>
                </button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
