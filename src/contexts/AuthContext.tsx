import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  user_id: string;
  name: string;
  business_name: string | null;
  phone: string | null;
  plan: "none" | "base" | "gestao" | "escala";
  plan_status: "active" | "inactive" | "cancelled";
  ai_interactions_used: number;
  ai_interactions_limit: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

interface SubscriptionStatus {
  subscribed: boolean;
  plan: string;
  plan_status: string;
  ai_limit: number;
  subscription_end: string | null;
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

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
        return null;
      }

      return data as Profile | null;
    } catch (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
  };

  const checkSubscription = useCallback(async (): Promise<SubscriptionStatus | null> => {
    if (!session?.access_token) return null;
    
    setIsCheckingSubscription(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error("Error checking subscription:", error);
        return null;
      }

      // Refresh profile after subscription check to get updated data
      if (user) {
        const updatedProfile = await fetchProfile(user.id);
        setProfile(updatedProfile);
      }

      return data as SubscriptionStatus;
    } catch (error) {
      console.error("Error checking subscription:", error);
      return null;
    } finally {
      setIsCheckingSubscription(false);
    }
  }, [session?.access_token, user]);

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Use setTimeout to avoid race conditions with profile creation trigger
          setTimeout(async () => {
            const profileData = await fetchProfile(session.user.id);
            setProfile(profileData);
            setIsLoading(false);
          }, 100);
        } else {
          setProfile(null);
          setIsLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchProfile(session.user.id).then((profileData) => {
          setProfile(profileData);
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Check subscription status periodically and after login
  useEffect(() => {
    if (session?.access_token && user) {
      // Check subscription on login/session restore
      checkSubscription();

      // Set up periodic check every minute
      const interval = setInterval(() => {
        checkSubscription();
      }, 60000);

      return () => clearInterval(interval);
    }
  }, [session?.access_token, user, checkSubscription]);

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
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
