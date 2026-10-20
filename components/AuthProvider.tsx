"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import type { ProfileRow } from "@/types/media";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export interface AuthContextType {
  user: User | null;
  profile: ProfileRow | null;
  isLoading: boolean;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    username: string,
  ) => Promise<{
    error: string | null;
    success: boolean;
    message?: string | null;
  }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export interface AuthProviderProps {
  children: ReactNode;
  initialUser?: User | null;
  initialProfile?: ProfileRow | null;
}

export function AuthProvider({
  children,
  initialUser = null,
  initialProfile = null,
}: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [profile, setProfile] = useState<ProfileRow | null>(initialProfile);
  const [isLoading, setIsLoading] = useState<boolean>(!initialUser);
  const router = useRouter();

  const supabase = useMemo(() => createClient(), []);

  const fetchProfile = useCallback(
    async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();

        if (!error && data) {
          setProfile(data);
        }
      } catch (err) {
        console.error("Failed to load user profile:", err);
      }
    },
    [supabase],
  );

  const userId = user?.id;

  const refreshProfile = useCallback(async () => {
    if (userId) {
      await fetchProfile(userId);
    }
  }, [userId, fetchProfile]);

  const signIn = useCallback(
    async (
      email: string,
      password: string,
    ): Promise<{ error: string | null }> => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          const isInvalid = error.message
            .toLowerCase()
            .includes("invalid login credentials");
          return {
            error: isInvalid
              ? "Invalid email or password. Please try again."
              : error.message,
          };
        }

        if (data?.user) {
          setUser(data.user);
          await fetchProfile(data.user.id);
        }

        return { error: null };
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred.";
        return { error: message };
      }
    },
    [supabase, fetchProfile],
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      username: string,
    ): Promise<{
      error: string | null;
      success: boolean;
      message?: string | null;
    }> => {
      try {
        // Check if username is already taken
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .ilike("username", username)
          .maybeSingle();

        if (existingProfile) {
          return {
            error: "This username is already taken. Please choose another.",
            success: false,
          };
        }

        const origin =
          typeof window !== "undefined" ? window.location.origin : "";
        const emailRedirectTo = origin ? `${origin}/auth/callback` : undefined;

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username,
            },
            emailRedirectTo,
          },
        });

        if (error) {
          return {
            error: error.message,
            success: false,
          };
        }

        if (data?.session && data.user) {
          setUser(data.user);
          await fetchProfile(data.user.id);
          return {
            success: true,
            error: null,
          };
        }

        return {
          success: true,
          error: null,
          message:
            "Account created! Please check your email inbox to verify your account before logging in.",
        };
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred.";
        return {
          error: message,
          success: false,
        };
      }
    },
    [supabase, fetchProfile],
  );

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Failed to sign out:", err);
    }
  }, [supabase, router]);

  //this effect handles the initial auth
  // check on startup, keeps user data synchronized across browser tabs in real time and fetches the custom database profile
  useEffect(() => {
    let isMounted = true; // flag ensures that state setters are never executed if the component has already unmounted (if the user navigates away from the page before the async function completes)

    async function initAuth() {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();

        if (!isMounted) return;

        setUser(currentUser);
        if (currentUser) {
          await fetchProfile(currentUser.id);
        }
      } catch (err) {
        console.error("Error initializing auth:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    if (!initialUser) {
      initAuth();
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;

      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await fetchProfile(currentUser.id);
      } else {
        setProfile(null);
      }

      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, initialUser, fetchProfile]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
