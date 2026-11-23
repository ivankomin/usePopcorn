"use client";

import { useEffect, useMemo, useRef, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  RefreshCw,
  Film,
  Tv,
  Compass,
  CircleHelp,
} from "lucide-react";
import Button from "@/components/Button";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useRatings } from "@/hooks/useRatings";
import { useI18n } from "@/hooks/useI18n";
import type { UserTasteProfile } from "@/types/media";

interface TasteProfileBannerProps {
  profile: UserTasteProfile;
}

export function TasteProfileBanner({ profile }: TasteProfileBannerProps) {
  const router = useRouter();
  const { tGenre } = useI18n();
  const [isRefreshing, startRefreshing] = useTransition();
  const { watchlistIds, isLoading: isWatchlistLoading } = useWatchlist();
  const { userRatings, userReviews, isLoading: isRatingsLoading } =
    useRatings();
  const hasCheckedInitialSyncRef = useRef(false);

  const liveSignalCount = useMemo(() => {
    if (isWatchlistLoading || isRatingsLoading) {
      return profile.signalCount;
    }
    const ids = new Set<string>(watchlistIds);
    for (const id of userReviews.keys()) {
      ids.add(id);
    }
    for (const id of userRatings.keys()) {
      ids.add(id);
    }
    return ids.size;
  }, [
    isWatchlistLoading,
    isRatingsLoading,
    watchlistIds,
    userReviews,
    userRatings,
    profile.signalCount,
  ]);

  const topGenres = useMemo(
    () =>
      (profile.topGenres || [])
        .map((genre) => genre.trim())
        .filter((name) => name.length > 0),
    [profile.topGenres],
  );

  // Sync if the page loaded from a stale prefetched server payload after interacting elsewhere
  useEffect(() => {
    if (isWatchlistLoading || isRatingsLoading) return;
    if (hasCheckedInitialSyncRef.current) return;
    hasCheckedInitialSyncRef.current = true;

    if (liveSignalCount !== profile.signalCount) {
      startRefreshing(() => {
        router.refresh();
      });
    }
  }, [
    isWatchlistLoading,
    isRatingsLoading,
    liveSignalCount,
    profile.signalCount,
    router,
  ]);

  const handleRefresh = () => {
    startRefreshing(() => {
      router.refresh();
    });
  };

  // Cold-start (0 signals) or warming (1–2 signals)
  if (profile.stage === "cold" || profile.stage === "warming") {
    const progress = Math.min(3, liveSignalCount);
    const progressPercent = Math.round((progress / 3) * 100);
    const effectiveStage = liveSignalCount === 0 ? "cold" : "warming";
    const isUnlocking =
      liveSignalCount >= 3 && liveSignalCount !== profile.signalCount;

    return (
      <section className="bg-[#181818] border border-neutral-800 rounded-2xl p-6 sm:p-7 flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-lime">
              <span>
                {effectiveStage === "cold"
                  ? "Build Your Taste Profile"
                  : "Warming Up Your Profile"}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white">
              {effectiveStage === "cold"
                ? "Rate or favorite 3 titles to unlock personalized picks"
                : isUnlocking
                  ? "3 of 3 titles recorded — unlocking your personalized profile..."
                  : progress >= 3
                    ? "Rate a title positively or add a favorite to unlock personalized picks"
                    : `${progress} of 3 titles recorded — early personalized picks are live!`}
            </h2>
            <p className="text-sm text-neutral-400 leading-relaxed">
              {effectiveStage === "cold"
                ? "Until you interact with a few titles, we've curated diverse top-rated movies and series across genres below. You can rate or add any card directly here."
                : "Add a couple more ratings or favorites to sharpen genre, director, cast, and era matching."}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {effectiveStage === "warming" && (
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 hover:border-brand-lime text-sm font-medium text-white transition-colors cursor-pointer disabled:opacity-60"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
                <span>Refresh</span>
              </button>
            )}
            <Button href="/catalog" size="md">
              <span className="inline-flex items-center gap-2">
                <Compass className="w-4 h-4" />
                Browse Catalog
              </span>
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Personalization progress</span>
            <span className="font-semibold text-white">{progress} / 3</span>
          </div>
          <div className="w-full h-2 rounded-full bg-neutral-900 overflow-hidden border border-neutral-800">
            <div
              className="h-full bg-brand-lime rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {topGenres.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-neutral-400 mr-1">
              Emerging genres:
            </span>
            {topGenres.map((genre) => (
              <Link
                key={genre}
                href={`/catalog?genres=${encodeURIComponent(genre)}`}
                title={tGenre(genre)}
                className="px-3 py-1 bg-[#85c355] hover:bg-[#9ded5b] text-black font-bold text-xs rounded-lg uppercase tracking-wide shadow-sm transition-all hover:scale-102 cursor-pointer"
              >
                {tGenre(genre)}
              </Link>
            ))}
          </div>
        )}
      </section>
    );
  }

  // Fully personalized taste profile (3+ signals)
  return (
    <section className="bg-[#181818] border border-neutral-800 rounded-2xl p-6 sm:p-7 flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-lime">
            <span>Your Taste Profile</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-700 hover:border-brand-lime text-sm font-medium text-white transition-colors cursor-pointer disabled:opacity-60 self-start sm:self-auto"
        >
          <RefreshCw
            className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          <span>{isRefreshing ? "Refreshing..." : "Refresh Picks"}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 border-t border-neutral-800/80">
        {/* Top Genres */}
        <div className="flex flex-col gap-2.5 pt-3 md:pt-2">
          <span className="text-xs font-medium uppercase tracking-wider text-neutral-400">
            Top Genres
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {topGenres.length > 0 ? (
              topGenres.map((genre) => (
                <Link
                  key={genre}
                  href={`/catalog?genres=${encodeURIComponent(genre)}`}
                  title={tGenre(genre)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#85c355] hover:bg-[#9ded5b] text-black font-bold text-xs rounded-lg uppercase tracking-wide shadow-sm transition-all hover:scale-102 cursor-pointer"
                >
                  <span>{tGenre(genre)}</span>
                </Link>
              ))
            ) : (
              <span className="text-xs text-neutral-500">
                Rate more titles positively to surface favorite genres
              </span>
            )}
          </div>
        </div>

        {/* Preferred Era */}
        <div className="space-y-2 pt-3 md:pt-2">
          <span className="text-xs font-medium uppercase tracking-wider text-neutral-400">
            Preferred Era:{" "}
          </span>
          <span className="text-base font-bold">
            {profile.preferredDecade || "Mixed Eras"}
          </span>
        </div>

        {/* Format Balance */}
        <div className="space-y-2 pt-3 md:pt-2">
          <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-neutral-400">
            <span>Format Split</span>
            <div className="relative inline-flex items-center group">
              <button
                type="button"
                aria-label={`Format split: ${profile.movieRatio}% Movies, ${profile.tvRatio}% Series`}
                className="inline-flex items-center text-neutral-500 hover:text-neutral-200 focus:text-neutral-200 focus:outline-none transition-colors cursor-help"
              >
                <CircleHelp className="w-3.5 h-3.5" />
              </button>
              <div
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 whitespace-nowrap rounded-lg bg-neutral-900 border border-neutral-700 px-2.5 py-1.5 text-xs font-semibold normal-case tracking-normal text-neutral-200 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-150"
              >
                {profile.movieRatio}% Movies &middot; {profile.tvRatio}% Series
                <span
                  aria-hidden="true"
                  className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 rotate-45 bg-neutral-900 border-r border-b border-neutral-700"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-brand-lime shrink-0" />
            <div className="flex-1 h-2 rounded-full bg-neutral-900 overflow-hidden border border-neutral-800 flex">
              <div
                className="h-full bg-brand-lime"
                style={{ width: `${profile.movieRatio}%` }}
              />
              <div
                className="h-full bg-neutral-500"
                style={{ width: `${profile.tvRatio}%` }}
              />
            </div>
            <Tv className="w-4 h-4 text-neutral-400 shrink-0" />
          </div>
        </div>
      </div>
    </section>
  );
}
