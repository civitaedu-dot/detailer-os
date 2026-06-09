import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  business_name: string | null;
  phone: string | null;
  plan: "none" | "base" | "gestao" | "escala";
  plan_status: "active" | "inactive" | "cancelled" | "trial";
  ai_interactions_used: number;
  ai_interactions_limit: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  trial_start: string | null;
  trial_end: string | null;
  trial_used: boolean;
  created_at: string;
  updated_at: string;
}

export const isTrialActive = (profile: Profile | null): boolean => {
  if (!profile) return false;
  if (profile.plan_status !== "trial") return false;
  if (!profile.trial_end) return false;
  return new Date(profile.trial_end) > new Date();
};

export const getTrialDaysRemaining = (profile: Profile | null): number => {
  if (!profile?.trial_end) return 0;
  const diff = new Date(profile.trial_end).getTime() - new Date().getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

export const isTrialExpired = (profile: Profile | null): boolean => {
  if (!profile) return false;
  if (profile.plan_status === "active") return false;
  if (profile.plan_status === "trial" && profile.trial_end) {
    return new Date(profile.trial_end) <= new Date();
  }
  return false;
};

interface SubscriptionStatus {
  subscribed: boolean;
  plan: string;
  plan_status: string;
  ai_limit: number;
  subscription_end: string | null;
  error?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isCheckingSubscription: boolean;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  checkSubscription: () => Promise<SubscriptionStatus | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Production redirect URL (Vercel). Falls back to current origin in dev/preview.
const PRODUCTION_URL = "https://detailer-os-c2wp.vercel.app";
const getRedirectUrl = (): string => {
  if (typeof window === "undefined") return PRODUCTION_URL;
  const host = window.location.hostname;
  // Use production URL when on the Vercel domain or any non-localhost/non-preview host.
  if (host === "detailer-os-c2wp.vercel.app") return PRODUCTION_URL;
  // For local dev and Lovable preview, use current origin so links work in-context.
  return window.location.origin;
};

const normalizeAuthError = (error: unknown): Error => {
  const message = error instanceof Error ? error.message : String(error ?? "");

  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return new Error("Não foi possível conectar ao serviço de autenticação. Verifique se o backend está ativo e tente novamente.");
  }

  return error instanceof Error ? error : new Error("Erro inesperado de autenticação.");
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(false);
  
  // Track latest profile request so slower responses don't overwrite newer auth state
  const profileFetchRequest = useRef(0);
  const lastSubscriptionCheck = useRef<number>(0);

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    const requestId = ++profileFetchRequest.current;
    
    try {
      console.log("[AuthContext] Fetching profile for user:", userId);
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (requestId !== profileFetchRequest.current) return null;

      if (error) {
        console.error("[AuthContext] Error fetching profile:", error);
        return null;
      }

      if (!data) {
        console.log("[AuthContext] No profile found for user, waiting for trigger");
        // Wait a bit and retry once (for trigger to create profile)
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { data: retryData, error: retryError } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();
        
        if (requestId !== profileFetchRequest.current) return null;

        if (retryError) {
          console.error("[AuthContext] Retry error fetching profile:", retryError);
          return null;
        }
        
        console.log("[AuthContext] Retry profile result:", retryData ? "found" : "not found");
        return retryData as Profile | null;
      }

      console.log("[AuthContext] Profile fetched:", { 
        id: data.id, 
        plan: data.plan, 
        status: data.plan_status 
      });
      
      return data as Profile;
    } catch (error) {
      console.error("[AuthContext] Error fetching profile:", error);
      return null;
    }
  }, []);

  const checkSubscription = useCallback(async (): Promise<SubscriptionStatus | null> => {
    // Prevent checking too frequently (minimum 10 seconds between checks)
    const now = Date.now();
    if (now - lastSubscriptionCheck.current < 10000) {
      console.log("[AuthContext] Subscription check throttled");
      return null;
    }
    
    setIsCheckingSubscription(true);
    lastSubscriptionCheck.current = now;
    
    try {
      console.log("[AuthContext] Checking subscription status...");

      // Ensure we use a fresh, non-expired token. supabase.auth.getSession()
      // auto-refreshes if needed. Then let functions.invoke attach it.
      const { data: { session: freshSession } } = await supabase.auth.getSession();
      if (!freshSession?.access_token) {
        console.log("[AuthContext] No active session for subscription check");
        return null;
      }

      const { data, error } = await supabase.functions.invoke("check-subscription", {
        headers: {
          Authorization: `Bearer ${freshSession.access_token}`,
        },
      });

      if (error) {
        console.error("[AuthContext] Subscription check error:", error);
        return null;
      }

      console.log("[AuthContext] Subscription check result:", data);

      // Refresh profile after subscription check to get updated data
      if (user) {
        const updatedProfile = await fetchProfile(user.id);
        if (updatedProfile) {
          setProfile(updatedProfile);
        }
      }

      return data as SubscriptionStatus;
    } catch (error) {
      console.error("[AuthContext] Error checking subscription:", error);
      return null;
    } finally {
      setIsCheckingSubscription(false);
    }
  }, [session?.access_token, user, fetchProfile]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      console.log("[AuthContext] Refreshing profile...");
      const profileData = await fetchProfile(user.id);
      if (profileData) {
        setProfile(profileData);
      }
    }
  }, [user, fetchProfile]);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;
    let authEventTimer: ReturnType<typeof setTimeout> | undefined;
    
    const initializeAuth = async () => {
      console.log("[AuthContext] Initializing auth...");
      
      try {
        // Get initial session
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (initialSession?.user) {
          console.log("[AuthContext] Initial session found:", initialSession.user.email);
          setSession(initialSession);
          setUser(initialSession.user);
          
          const profileData = await fetchProfile(initialSession.user.id);
          if (mounted && profileData) {
            setProfile(profileData);
          }
        } else {
          console.log("[AuthContext] No initial session");
        }
      } catch (error) {
        console.error("[AuthContext] Init error:", error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    // Set up auth state listener. Keep this callback synchronous to avoid auth deadlocks.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log("[AuthContext] Auth state changed:", event, newSession?.user?.email);
        
        if (!mounted) return;
        
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          if (authEventTimer) clearTimeout(authEventTimer);
          // Defer profile queries until after auth has finished updating storage/session.
          authEventTimer = setTimeout(async () => {
            if (!mounted) return;
            const profileData = await fetchProfile(newSession.user.id);
            if (mounted && profileData) {
              setProfile(profileData);
            }
            setIsLoading(false);
          }, 500);
        } else if (event === "SIGNED_OUT") {
          setProfile(null);
          setIsLoading(false);
        }
      }
    );

    initializeAuth();

    return () => {
      mounted = false;
      if (authEventTimer) clearTimeout(authEventTimer);
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // Periodic subscription check
  useEffect(() => {
    if (!session?.access_token || !user) return;

    // Initial check after login
    const initialCheck = setTimeout(() => {
      checkSubscription();
    }, 2000);

    // Periodic check every 60 seconds
    const interval = setInterval(() => {
      checkSubscription();
    }, 60000);

    return () => {
      clearTimeout(initialCheck);
      clearInterval(interval);
    };
  }, [session?.access_token, user, checkSubscription]);

  const signUp = async (email: string, password: string, name: string) => {
    try {
      console.log("[AuthContext] Signing up:", email);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
          emailRedirectTo: getRedirectUrl(),
        },
      });

      if (error) {
        console.error("[AuthContext] Signup error:", error);
        return { error: normalizeAuthError(error) };
      }

      console.log("[AuthContext] Signup successful:", data.user?.id);
      return { error: null };
    } catch (error) {
      console.error("[AuthContext] Signup exception:", error);
      return { error: normalizeAuthError(error) };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log("[AuthContext] Signing in:", email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("[AuthContext] Signin error:", error);
        return { error: normalizeAuthError(error) };
      }

      console.log("[AuthContext] Signin successful:", data.user?.id);
      return { error: null };
    } catch (error) {
      console.error("[AuthContext] Signin exception:", error);
      return { error: normalizeAuthError(error) };
    }
  };

  const signOut = async () => {
    console.log("[AuthContext] Signing out...");
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const value = {
    user,
    session,
    profile,
    isLoading,
    isCheckingSubscription,
    signUp,
    signIn,
    signOut,
    refreshProfile,
    checkSubscription,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
