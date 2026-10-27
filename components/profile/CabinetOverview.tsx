"use client";

import Link from "next/link";
import { Bookmark, Star, Award, ArrowRight } from "lucide-react";
import type {
  WatchlistEntry,
  UserReviewArchiveItem,
  UserCabinetStats,
  WatchlistStatus,
} from "@/types/media";
import { ProfileMovieCard } from "./ProfileMovieCard";
import type { CabinetTabId } from "./CabinetTabs";
import { formatDate } from "@/lib/utils";

export interface CabinetOverviewProps {
  stats: UserCabinetStats;
  recentWatchlist: WatchlistEntry[];
  recentReviews: UserReviewArchiveItem[];
  onTabChange: (tab: CabinetTabId) => void;
}

export function CabinetOverview({
  stats,
  recentWatchlist,
  recentReviews,
  onTabChange,
}: CabinetOverviewProps) {
  return (
    <div className="flex flex-col gap-10">
      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Watchlist Total */}
        <div className="bg-brand-surface border border-neutral-800 rounded-2xl p-5 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Watchlist Total
            </span>
            <div className="text-blue-400">
              <Bookmark className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-white">
              {stats.watchlistTotal}
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              {stats.planToWatchCount} planned • {stats.watchedCount} watched
            </p>
          </div>
        </div>

        {/* Favorites */}
        <div className="bg-brand-surface border border-neutral-800 rounded-2xl p-5 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Favorites
            </span>
            <div className="text-pink-400 ">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-white">
              {stats.favoriteCount}
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Top-tier personal picks
            </p>
          </div>
        </div>

        {/* Reviews Written */}
        <div className="bg-brand-surface border border-neutral-800 rounded-2xl p-5 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Reviews & Ratings
            </span>
            <div className=" text-brand-lime ">
              <Star className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-white">
              {stats.reviewsCount}
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Films scored or evaluated
            </p>
          </div>
        </div>

        {/* Average Rating Given */}
        <div className="bg-brand-surface border border-neutral-800 rounded-2xl p-5 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Avg Rating Given
            </span>
            <div className="text-yellow-400">
              <Star className="w-5 h-5 fill-yellow-400" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-white">
              {stats.averageRatingGiven !== null
                ? `${stats.averageRatingGiven}`
                : "—"}
              <span className="text-sm text-neutral-500 font-normal ml-1">
                / 10
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Personal score average
            </p>
          </div>
        </div>
      </div>

      {/* Recent Watchlist Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Watchlist Snapshot</h2>
            <p className="text-xs text-neutral-400">
              Recently saved movies and series
            </p>
          </div>
          <button
            type="button"
            onClick={() => onTabChange("watchlist")}
            className="flex items-center gap-1.5 text-xs font-semibold text-brand-lime hover:underline cursor-pointer"
          >
            <span>View All ({stats.watchlistTotal})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentWatchlist.length === 0 ? (
          <div className="bg-brand-surface border border-neutral-800/80 rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-3">
            <Bookmark className="w-8 h-8 text-neutral-600" />
            <p className="text-sm text-neutral-400">
              Your watchlist is currently empty.
            </p>
            <Link
              href="/catalog"
              className="text-xs font-semibold text-brand-lime hover:underline flex items-center gap-1"
            >
              Browse catalog to discover movies{" "}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
            {recentWatchlist.slice(0, 6).map((item) => {
              if (!item.media) return null;
              return (
                <ProfileMovieCard
                  key={item.id}
                  media={item.media}
                  watchlistStatus={item.status as WatchlistStatus}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Reviews Archive Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">
              Recent Ratings & Reviews
            </h2>
            <p className="text-xs text-neutral-400">
              Your latest movie evaluations
            </p>
          </div>
          <button
            type="button"
            onClick={() => onTabChange("reviews")}
            className="flex items-center gap-1.5 text-xs font-semibold text-brand-lime hover:underline cursor-pointer"
          >
            <span>View All ({stats.reviewsCount})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentReviews.length === 0 ? (
          <div className="bg-brand-surface border border-neutral-800/80 rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-3">
            <Star className="w-8 h-8 text-neutral-600" />
            <p className="text-sm text-neutral-400">
              You haven&apos;t reviewed or rated any movies yet.
            </p>
            <Link
              href="/catalog"
              className="text-xs font-semibold text-brand-lime hover:underline flex items-center gap-1"
            >
              Start rating movies from the catalog{" "}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentReviews.slice(0, 4).map((review) => {
              const media = review.media;
              const dateStr = formatDate(
                review.updated_at || review.created_at,
              );
              return (
                <div
                  key={review.id}
                  className="bg-brand-surface border border-neutral-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-3 shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col">
                      <Link
                        href={media ? `/movie/${media.id}` : "#"}
                        className="font-bold text-white hover:text-brand-lime transition-colors text-base line-clamp-1"
                      >
                        {media?.title || "Untitled Media"}
                      </Link>
                      <span className="text-xs text-neutral-400">
                        {media?.release_year} •{" "}
                        {media?.media_type === "tv" ? "TV Series" : "Movie"}
                      </span>
                    </div>

                    {review.rating !== null && (
                      <div className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-xl text-yellow-200 text-xs font-bold font-mono">
                        <Star className="w-3 h-3 fill-yellow-200 text-yellow-200" />
                        <span>{review.rating}/10</span>
                      </div>
                    )}
                  </div>

                  {review.content ? (
                    <p className="text-xs sm:text-sm text-neutral-300 line-clamp-3 italic">
                      &ldquo;{review.content}&rdquo;
                    </p>
                  ) : (
                    <p className="text-xs text-neutral-500 italic">
                      Rated without a written review.
                    </p>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-neutral-500 border-t border-neutral-800/80 pt-2.5">
                    <span>{dateStr}</span>
                    <Link
                      href={media ? `/movie/${media.id}` : "#"}
                      className="text-brand-lime hover:underline flex items-center gap-1 font-semibold"
                    >
                      <span>Movie page</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
