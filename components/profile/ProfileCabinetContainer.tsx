"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import type {
  ProfileRow,
  UserCabinetStats,
  WatchlistEntry,
  UserReviewArchiveItem,
} from "@/types/media";
import {
  ProfileHeader,
  CabinetTabs,
  CabinetTabId,
  CabinetOverview,
  CabinetWatchlist,
  UserReviewsArchive,
  ProfileSettings,
} from "./index";

export interface ProfileCabinetContainerProps {
  user: User;
  profile: ProfileRow | null;
  stats: UserCabinetStats;
  watchlistEntries: WatchlistEntry[];
  reviewsArchive: UserReviewArchiveItem[];
  initialTab?: CabinetTabId;
}

export function ProfileCabinetContainer({
  user,
  profile,
  stats,
  watchlistEntries,
  reviewsArchive,
  initialTab = "overview",
}: ProfileCabinetContainerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlTab = searchParams.get("tab") as CabinetTabId | null;
  const [activeTab, setActiveTab] = useState<CabinetTabId>(
    urlTab && ["overview", "watchlist", "reviews", "settings"].includes(urlTab)
      ? urlTab
      : initialTab,
  );

  const handleTabChange = (tab: CabinetTabId) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "overview") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const queryString = params.toString();
    router.replace(`/profile${queryString ? `?${queryString}` : ""}`, {
      scroll: false,
    });
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 1. Profile Header / Account Info Card */}
      <ProfileHeader
        profile={profile}
        userEmail={user.email}
        userCreatedAt={user.created_at}
      />

      {/* 2. Navigation Tabs */}
      <CabinetTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        watchlistCount={watchlistEntries.length}
        reviewsCount={reviewsArchive.length}
      />

      {/* 3. Tab Content View */}
      <div className="w-full min-h-100">
        {activeTab === "overview" && (
          <CabinetOverview
            stats={stats}
            recentWatchlist={watchlistEntries}
            recentReviews={reviewsArchive}
            onTabChange={handleTabChange}
          />
        )}

        {activeTab === "watchlist" && (
          <CabinetWatchlist entries={watchlistEntries} />
        )}

        {activeTab === "reviews" && (
          <UserReviewsArchive initialReviews={reviewsArchive} />
        )}

        {activeTab === "settings" && (
          <ProfileSettings profile={profile} userEmail={user.email} />
        )}
      </div>
    </div>
  );
}
