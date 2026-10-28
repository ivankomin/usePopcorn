import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getSystemStateAction } from "@/app/actions/admin";
import { AdminDashboardContainer } from "@/components/admin";
import AdminLoading from "./loading";
import type { GenreRow, MediaItemRow } from "@/types/media";

export const metadata = {
  title: "Admin Dashboard | usePopcorn",
  description: "Administrative catalog management and system lock administration.",
};

export const instant = false;

async function AdminDashboardContent() {
  await connection();
  const supabase = await createServerClient();

  // 1. Authenticate user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login?next=/admin");
  }

  // 2. Authorize role: 'admin'
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    redirect("/profile");
  }

  // 3. Fetch System State (FR-19)
  const systemState = await getSystemStateAction();

  // 4. Fetch Genres list for multi-select
  const { data: genresData } = await supabase
    .from("genres")
    .select("*")
    .order("name", { ascending: true });

  const genres: GenreRow[] = genresData || [];

  // 5. Fetch Recent Media Items
  const { data: recentMediaData } = await supabase
    .from("media_items")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(8);

  const recentMedia: MediaItemRow[] = recentMediaData || [];

  return (
    <div className="max-w-5xl mx-auto">
      <AdminDashboardContainer
        initialSystemStatus={systemState.status}
        initialMessage={systemState.message}
        updatedAt={systemState.updated_at}
        genres={genres}
        recentMedia={recentMedia}
      />
    </div>
  );
}

export default async function AdminPage() {
  await connection();
  return (
    <div className="min-h-screen bg-[#0f0f0f] py-8 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={<AdminLoading />}>
        <AdminDashboardContent />
      </Suspense>
    </div>
  );
}
