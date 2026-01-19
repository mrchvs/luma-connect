import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  city: string | null;
  country: string | null;
  timezone: string | null;
  languages: string[];
  short_bio: string | null;
  bio_long: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  portfolio_url: string | null;
  instagram_url: string | null;
  company_name: string | null;
  job_title: string | null;
  years_experience: number | null;
  proof_links: string[];
  credibility_confirmed: boolean;
  completed: boolean;
  status: "pending_review" | "approved" | "rejected" | "suspended";
  avatar_url: string | null;
  // Intent-led orchestration fields
  current_intent: "perspective" | "peers" | "focused_chats" | "quiet" | null;
  availability_status: "available" | "async" | "heads_down" | null;
  currently_navigating: string | null;
  not_looking_for: string[] | null;
  conversation_style: string[] | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  isOwner: boolean;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<{ error: Error | null; attemptsRemaining?: number; lockedUntil?: string }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
    return data as Profile;
  };

  const checkRoles = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (error) {
      console.error("Error checking roles:", error);
      return { isAdmin: false, isOwner: false };
    }
    
    const roles = data?.map((r) => r.role) || [];
    return {
      isOwner: roles.includes("owner"),
      isAdmin: roles.includes("admin") || roles.includes("owner"), // owners have admin privileges
    };
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  useEffect(() => {
    // Handle session cleanup on browser close if rememberMe was false
    const handleBeforeUnload = () => {
      if (sessionStorage.getItem('clearSessionOnClose') === 'true') {
        supabase.auth.signOut();
        sessionStorage.removeItem('clearSessionOnClose');
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(async () => {
            const profileData = await fetchProfile(session.user.id);
            setProfile(profileData);
            const roles = await checkRoles(session.user.id);
            setIsAdmin(roles.isAdmin);
            setIsOwner(roles.isOwner);
            setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setIsAdmin(false);
          setIsOwner(false);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchProfile(session.user.id).then((profileData) => {
          setProfile(profileData);
          checkRoles(session.user.id).then((roles) => {
            setIsAdmin(roles.isAdmin);
            setIsOwner(roles.isOwner);
            setLoading(false);
          });
        });
      } else {
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string, rememberMe: boolean = true): Promise<{ error: Error | null; attemptsRemaining?: number; lockedUntil?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke('secure-login', {
        body: { email, password }
      });

      if (error) {
        return { error: new Error(error.message) };
      }

      // Check for lockout or failed attempt response
      if (data?.error) {
        return { 
          error: new Error(data.message || data.error),
          attemptsRemaining: data.attempts_remaining,
          lockedUntil: data.locked_until
        };
      }

      // Set session from successful login
      if (data?.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token
        });
        
        if (!rememberMe) {
          sessionStorage.setItem('clearSessionOnClose', 'true');
        } else {
          sessionStorage.removeItem('clearSessionOnClose');
        }
      }

      return { error: null };
    } catch (err) {
      console.error('Sign in error:', err);
      return { error: err instanceof Error ? err : new Error('An unexpected error occurred') };
    }
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resendVerificationEmail = async (email: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    return { error };
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/auth?reset=true`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    return { error };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isAdmin,
        isOwner,
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        refreshProfile,
        resendVerificationEmail,
        resetPassword,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
