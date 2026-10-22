"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import type { MediaItem } from "@/types/media";
import { formatVoteCount, isMatureRating, cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useRatings } from "@/hooks/useRatings";

export interface MovieDetailsHeaderProps {
  media: MediaItem;
  initialUserRating?: number | null;
  onRateClick?: () => void;
}

export function MovieDetailsHeader({
  media,
  initialUserRating = null,
  onRateClick,
}: MovieDetailsHeaderProps) {
  const { user } = useAuth();
  const { getUserRating } = useRatings();

  const liveRating = getUserRating(media.id);
  const userRating = liveRating !== null ? liveRating : initialUserRating;

  const ratingStr = media.vote_average
    ? Number(media.vote_average).toFixed(1)
    : "0.0";
  const votesStr = formatVoteCount(media.vote_count);
  const isMature = isMatureRating(media.age_rating);
  const isTopRated = (media.vote_average || 0) >= 8.0;

  const metadata = media.metadata as {
    tagline?: string | null;
  } | null;

  const handleScrollToReview = () => {
    if (onRateClick) {
      onRateClick();
    } else {
      const el = document.getElementById("review-section");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <>
      {/* Header: Title, Year, Age Badge & Rating */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-baseline flex-wrap gap-2.5">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
            {media.title}
          </h1>
          {media.release_year && (
            <span className="text-xl sm:text-2xl font-normal text-neutral-400">
              ({media.release_year})
            </span>
          )}
          {media.age_rating && (
            <span
              className={cn(
                "inline-flex items-center justify-center px-1.5 min-w-6 h-6 rounded-full text-[11px] font-bold tracking-tight border",
                isMature
                  ? "border-red-500 text-red-500"
                  : "border-neutral-500 text-neutral-300",
              )}
            >
              {media.age_rating}
            </span>
          )}
        </div>

        {/* Top-Right Rating Display: Dual score if user rated, otherwise standard IMDb rating */}
        <div className="flex flex-col items-end shrink-0 pt-0.5">
          {userRating !== null && userRating > 0 ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base italic text-neutral-300 font-normal">
                  You rated:
                </span>
                <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {userRating.toFixed(1)}
                </span>
                <Star className="w-6 h-6 sm:w-7 sm:h-7 fill-[#8ce648] text-[#8ce648]" />
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-neutral-400">
                <span className="italic">IMDb Rating:</span>
                <span className="font-semibold text-neutral-200">
                  {ratingStr}
                </span>
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {ratingStr}
                </span>
                <Star className="w-6 h-6 sm:w-7 sm:h-7 fill-amber-400 text-amber-400" />
              </div>
              {media.vote_count > 0 && (
                <span className="text-xs text-neutral-400 font-medium">
                  ({votesStr} votes)
                </span>
              )}
              {user && (
                <button
                  type="button"
                  onClick={handleScrollToReview}
                  className="mt-1.5 text-xs text-[#8ce648] hover:text-[#9ded5b] flex items-center gap-1 font-medium transition-colors cursor-pointer"
                >
                  <Star className="w-3.5 h-3.5" />
                  <span>Rate / Review</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tagline (if present in metadata) */}
      {metadata?.tagline && (
        <p className="text-neutral-400 italic text-sm sm:text-base font-normal -mt-2 tracking-wide">
          &ldquo;{metadata.tagline}&rdquo;
        </p>
      )}

      {/* Badges Row (Clickable Genres + Top-500) */}
      <div className="flex flex-wrap items-center gap-2 mt-0.5">
        {media.genres &&
          media.genres.map((genre) => (
            <Link
              key={genre.id}
              href={`/catalog?genres=${encodeURIComponent(genre.name)}`}
              className="px-3 py-1 bg-[#8ce648] hover:bg-[#9ded5b] text-black font-bold text-xs rounded-lg uppercase tracking-wide shadow-sm transition-all hover:scale-102 cursor-pointer"
              title={`Browse all ${genre.name} movies`}
            >
              {genre.name}
            </Link>
          ))}
        {isTopRated && (
          <span className="px-3 py-1 bg-[#f5d061] text-black font-bold text-xs rounded-lg uppercase tracking-wide shadow-sm">
            Top-500
          </span>
        )}
      </div>
    </>
  );
}
