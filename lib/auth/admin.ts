import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

export interface AdminSessionCheckResult {
  isAdmin: boolean;
  user: User | null;
  username: string | null;
  error: string | null;
}

/**
 * Verifies that the active session belongs to an authenticated user with the 'admin' role.
 * Lives outside `"use server"` files so it is never exposed as a public Server Action endpoint.
 */
export async function verifyAdminSession(): Promise<AdminSessionCheckResult> {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      isAdmin: false,
      user: null,
      username: null,
      error: "Authentication required",
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, username, is_blocked")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.is_blocked || profile?.role !== "admin") {
    return {
      isAdmin: false,
      user,
      username: profile?.username ?? null,
      error: "Administrator privileges required",
    };
  }

  return {
    isAdmin: true,
    user,
    username: profile.username ?? null,
    error: null,
  };
}

/**
 * Server Component guard for `/admin/*` pages.
 * Redirects unauthenticated users to `/login?next=<nextPath>` and non-admins to `/profile`.
 */
export async function requireAdmin(nextPath: string): Promise<{
  user: User;
  username: string | null;
}> {
  const session = await verifyAdminSession();

  if (!session.user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  if (!session.isAdmin) {
    redirect("/profile");
  }

  return {
    user: session.user,
    username: session.username,
  };
}
