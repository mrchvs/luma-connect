import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { Eye, EyeOff, Mail, Lock, ArrowRight, Sparkles, CheckCircle, ArrowLeft, RefreshCw, UserPlus, Users, Heart, Zap, Shield } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";

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

type ViewState = "auth" | "emailSent" | "forgotPassword" | "resetSent" | "newPassword" | "inviteWelcome";

export default function Auth() {
  const [searchParams] = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [viewState, setViewState] = useState<ViewState>("auth");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [rememberMe, setRememberMe] = useState(true);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState<string | null>(null);
  const [inviteValidating, setInviteValidating] = useState(false);
  const { signIn, signUp, signInWithGoogle, user, profile, loading, resendVerificationEmail, resetPassword, updatePassword } = useAuth();
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
      return;
    }

    // Check if this is an invitation link
    const token = searchParams.get("invite");
    if (token) {
      setInviteToken(token);
      setInviteValidating(true);
      setIsSignUp(true);
      
      // Validate the invitation token
      supabase.functions.invoke("admin-invite-member", {
        body: { action: "validate_invite", token },
      }).then(({ data, error }) => {
        setInviteValidating(false);
        if (error || !data?.valid) {
          toast({
            title: "Invalid Invitation",
            description: data?.error || "This invitation link is invalid or has expired.",
            variant: "destructive",
          });
          setInviteToken(null);
        } else {
          setInviteEmail(data.email);
          form.setValue("email", data.email);
          setViewState("inviteWelcome");
        }
      });
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
        // If this is an invite signup, mark the invitation as accepted BEFORE signup
        // This ensures the invite is marked even if user is auto-confirmed
        if (inviteToken) {
          try {
            const acceptResult = await supabase.functions.invoke("admin-invite-member", {
              body: { action: "accept_invite", token: inviteToken },
            });
            console.log("Invitation acceptance result:", acceptResult);
          } catch (err) {
            console.error("Failed to mark invitation as accepted:", err);
          }
        }

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
        const { error, attemptsRemaining, lockedUntil } = await signIn(data.email, data.password, rememberMe);
        if (error) {
          if (lockedUntil) {
            const lockedDate = new Date(lockedUntil);
            const minutesRemaining = Math.ceil((lockedDate.getTime() - Date.now()) / 60000);
            toast({
              title: "Account locked",
              description: `Too many failed attempts. Try again in ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}.`,
              variant: "destructive",
            });
          } else if (error.message.includes("Email not confirmed")) {
            toast({
              title: "Email not verified",
              description: "Please check your inbox and verify your email before signing in.",
              variant: "destructive",
            });
          } else {
            const attemptsMsg = attemptsRemaining !== undefined && attemptsRemaining > 0 
              ? ` (${attemptsRemaining} attempt${attemptsRemaining !== 1 ? 's' : ''} remaining)`
              : '';
            toast({
              title: "Sign in failed",
              description: `Invalid email or password.${attemptsMsg}`,
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

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast({
          title: "Google sign in failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const watchedPassword = form.watch("password");
  const watchedNewPassword = passwordForm.watch("password");

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
          © 2025 Luma Circle. All rights reserved.
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
                  <PasswordStrengthIndicator password={watchedNewPassword || ""} />
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

        {viewState === "inviteWelcome" && (
          <div className="w-full max-w-lg animate-scale-in">
            <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur-sm overflow-hidden">
              <div className="bg-gradient-to-br from-primary/10 via-luma-rose-light/50 to-luma-peach-light/50 p-8 text-center">
                <div className="mx-auto w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-6">
                  <Sparkles className="w-10 h-10 text-primary" />
                </div>
                <h1 className="font-display text-3xl font-semibold text-foreground mb-2">
                  You're Invited to Luma Circle
                </h1>
                <p className="text-muted-foreground">
                  Welcome, <span className="font-medium text-foreground">{inviteEmail}</span>
                </p>
              </div>
              
              <CardContent className="p-8 space-y-6">
                <div className="text-center space-y-3">
                  <h2 className="font-display text-xl font-medium text-foreground">
                    A curated community for ambitious women
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Luma Circle is an invite-only matchmaking platform that connects women founders and professionals based on what they need and what they can offer.
                  </p>
                </div>

                <div className="grid gap-4">
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/50">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Zap className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">Smart Matching</h3>
                      <p className="text-sm text-muted-foreground">Get matched with members whose expertise aligns with your needs</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/50">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">Trusted Community</h3>
                      <p className="text-sm text-muted-foreground">Every member is vetted to ensure quality connections</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/50">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Heart className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">Intentional Connections</h3>
                      <p className="text-sm text-muted-foreground">No cold outreach—only warm introductions between aligned members</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 space-y-3">
                  <Button
                    variant="premium"
                    size="lg"
                    className="w-full"
                    onClick={() => setViewState("auth")}
                  >
                    Create My Account
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    By creating an account, you agree to our Terms of Service and Privacy Policy
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {viewState === "auth" && (
          <Card className="w-full max-w-md shadow-elevated border-0 bg-card/80 backdrop-blur-sm animate-scale-in">
            <CardHeader className="text-center space-y-2 pb-2">
              <div className="lg:hidden mb-4">
                <Logo size="md" className="justify-center" />
              </div>
              {inviteEmail && isSignUp ? (
                <>
                  <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserPlus className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="font-display text-2xl">
                    You're Invited!
                  </CardTitle>
                  <CardDescription>
                    Create your account to join the community
                  </CardDescription>
                </>
              ) : (
                <>
                  <CardTitle className="font-display text-2xl">
                    {isSignUp ? "Create your account" : "Welcome back"}
                  </CardTitle>
                  <CardDescription>
                    {isSignUp
                      ? "Start your journey to meaningful connections"
                      : "Sign in to continue to your matches"}
                  </CardDescription>
                </>
              )}
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              {inviteValidating ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner text="Validating invitation..." />
                </div>
              ) : (
                <>
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
                      disabled={!!inviteEmail}
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
                  {isSignUp && <PasswordStrengthIndicator password={watchedPassword || ""} />}
                </div>

                {!isSignUp && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember-me"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked === true)}
                    />
                    <Label 
                      htmlFor="remember-me" 
                      className="text-sm font-normal text-muted-foreground cursor-pointer"
                    >
                      Remember me
                    </Label>
                  </div>
                )}

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

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Button>

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
              </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
