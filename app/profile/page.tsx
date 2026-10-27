import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentUserProfile,
  getUserCabinetStats,
  getWatchlistWithFilters,
  getUserReviewsArchive,
} from "@/lib/api";
import { ProfileCabinetContainer } from "@/components/profile";
import type { CabinetTabId } from "@/components/profile";
import ProfileLoading from "./loading";

export async function generateMetadata() {
  return {
    title: "User Cabinet & Profile - usePopcorn",
    description:
      "Manage your profile, collections, watchlists, ratings and reviews on usePopcorn.",
  };
}

interface ProfilePageProps {
  searchParams: Promise<{
    tab?: string;
  }>;
}

async function ProfileCabinetContent({
  searchParams,
}: {
  searchParams: ProfilePageProps["searchParams"];
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/profile");
  }

  const resolvedParams = await searchParams;
  const initialTab = (resolvedParams.tab || "overview") as CabinetTabId;

  // Fetch all required data in parallel directly from Supabase
  const [profile, stats, watchlistResult, reviewsArchive] = await Promise.all([
    getCurrentUserProfile(),
    getUserCabinetStats(user.id),
    getWatchlistWithFilters({ pageSize: 100 }, user.id),
    getUserReviewsArchive(user.id),
  ]);

  return (
    <ProfileCabinetContainer
      user={user}
      profile={profile}
      stats={stats}
      watchlistEntries={watchlistResult.items}
      reviewsArchive={reviewsArchive}
      initialTab={initialTab}
    />
  );
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  return (
    <main className="min-h-screen bg-black text-white">
      <Suspense fallback={<ProfileLoading />}>
        <ProfileCabinetContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
