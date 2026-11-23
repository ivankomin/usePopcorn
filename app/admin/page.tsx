import { Suspense } from "react";
import { connection } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";
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
  await requireAdmin("/admin");

  const supabase = await createServerClient();

  const [systemState, { data: genresData }, { data: recentMediaData }] =
    await Promise.all([
      getSystemStateAction(),
      supabase.from("genres").select("*").order("name", { ascending: true }),
      supabase
        .from("media_items")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

  const genres: GenreRow[] = genresData || [];
  const recentMedia: MediaItemRow[] = recentMediaData || [];

  return (
    <div className="max-w-5xl mx-auto">
      <AdminDashboardContainer
        initialSystemStatus={systemState.status}
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
