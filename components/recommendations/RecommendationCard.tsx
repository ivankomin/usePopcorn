"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Plus, Check, Star } from "lucide-react";
import type { RecommendedMediaItem } from "@/types/media";
import { formatRuntime, getPosterUrl } from "@/lib/utils";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useAuth } from "@/hooks/useAuth";
import { useRatings } from "@/hooks/useRatings";

const Rating = dynamic(() => import("@mui/material/Rating"), {
  ssr: false,
  loading: () => (
    <span
      className="inline-flex items-center gap-0.5 text-[#383838] select-none"
      aria-hidden="true"
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className="text-base sm:text-lg leading-none">
          ★
        </span>
      ))}
    </span>
  ),
});

export interface RecommendationCardProps {
  item: RecommendedMediaItem;
  onUserInteraction?: () => void;
}

export function RecommendationCard({
  item,
  onUserInteraction,
}: RecommendationCardProps) {
  const { media, matchReasons } = item;
  const router = useRouter();
  const { user } = useAuth();
  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  const { getUserRating, rateMedia } = useRatings();

  const inWatchlist = isInWatchlist(media.id);
  const userRating = getUserRating(media.id);

  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  const hasUserReviews =
    (media.vote_count || 0) > 0 && (media.vote_average || 0) > 0;
  const displayScore10 = hasUserReviews
    ? media.vote_average || 0
    : media.imdb_rating || 0;
  const ratingStars =
    displayScore10 > 0 ? Math.min(5, Math.max(0, displayScore10 / 2)) : 0;
  const userStars = userRating ? userRating / 2 : 0;

  const genreText =
    media.genres && media.genres.length > 0
      ? media.genres.map((g) => g.name).join(", ")
      : null;

  const runtimeText =
    media.media_type === "tv"
      ? `${media.seasons_count || 1} ${(media.seasons_count || 1) === 1 ? "Season" : "Seasons"}`
      : formatRuntime(media.runtime);

  const posterSrc = getPosterUrl(media.poster_path, "w500");
  const movieHref = `/movie/${media.id}?from=recommendations`;

  const recordNavigation = () => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("internal_nav_from", "recommendations");
      } catch {
        // Ignore storage restrictions
      }
    }
  };

  const handleCardClick = () => {
    if (typeof window !== "undefined" && window.getSelection()?.toString()) {
      return;
    }
    recordNavigation();
    router.push(movieHref);
  };

  const handleToggleWatchlist = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await toggleWatchlist(media.id);
    if (success && onUserInteraction) {
      onUserInteraction();
    }
  };

  const handleRatingChange = async (newStars: number | null) => {
    if (!newStars) return;
    const score10 = Math.round(newStars * 2);
    setIsRatingOpen(false);
    await rateMedia(media.id, score10);
    if (onUserInteraction) {
      onUserInteraction();
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="group relative bg-[#181818] border border-neutral-800/80 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-center sm:items-stretch gap-5 sm:gap-6 transition-all duration-200 hover:border-neutral-700 hover:shadow-xl hover:shadow-black/50 cursor-pointer"
    >
      {/* Poster */}
      <Link
        href={movieHref}
        onClick={recordNavigation}
        className="relative w-28.75 sm:w-31 aspect-2/3 shrink-0 rounded-xl overflow-hidden bg-neutral-900 border border-white/5 shadow-md block cursor-pointer"
      >
        {!imageError && posterSrc ? (
          <Image
            src={posterSrc}
            alt={media.title}
            fill
            sizes="(max-width: 640px) 115px, 124px"
            className="object-cover object-center group-hover:scale-102 transition-transform duration-300"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-neutral-900 text-neutral-500">
            <span className="text-2xl mb-1">🎬</span>
            <span className="text-[11px] font-medium leading-tight line-clamp-2">
              {media.title}
            </span>
          </div>
        )}
      </Link>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
        <div>
          {/* Match Score + Explainability Reasons */}
          <div className="flex items-center flex-wrap gap-2 mb-2.5">
            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium uppercase tracking-wide bg-neutral-900 text-neutral-400 border border-neutral-800">
              {media.media_type === "tv" ? "Series" : "Movie"}
            </span>

            {matchReasons.map((reason) => (
              <span
                key={reason}
                className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-900/90 text-neutral-300 border border-neutral-800"
              >
                {reason}
              </span>
            ))}
          </div>

          {/* Title & Year */}
          <div className="flex items-baseline flex-wrap gap-x-2.5 leading-snug">
            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight">
              <Link
                href={movieHref}
                onClick={recordNavigation}
                className="hover:text-brand-lime transition-colors"
              >
                {media.title}
              </Link>
            </h3>
            {media.release_year && (
              <span className="text-base sm:text-lg font-normal text-neutral-400">
                ({media.release_year})
              </span>
            )}
          </div>

          {/* Genres & Runtime */}
          {(genreText || runtimeText) && (
            <div className="text-xs sm:text-sm text-neutral-400 font-normal mt-1 flex items-center flex-wrap gap-2">
              {genreText && <span>{genreText}</span>}
              {genreText && runtimeText && (
                <span className="text-neutral-500">&bull;</span>
              )}
              {runtimeText && <span>{runtimeText}</span>}
            </div>
          )}

          {/* Overview */}
          {media.overview && (
            <p className="text-xs sm:text-sm text-neutral-300 italic line-clamp-2 sm:line-clamp-3 leading-relaxed mt-2.5 mb-3">
              {media.overview}
            </p>
          )}
        </div>

        {/* Ratings Row */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center flex-wrap gap-y-2 text-xs sm:text-sm mt-auto pt-1 relative z-10"
        >
          {ratingStars > 0 && (
            <div className="flex items-center gap-1.5 mr-2">
              <span className="font-semibold text-white">
                {hasUserReviews ? "Rating:" : "IMDb:"}
              </span>
              <Rating
                value={ratingStars}
                precision={0.1}
                readOnly
                size="small"
                sx={{
                  color: "#f5c518",
                  "& .MuiRating-iconEmpty": { color: "#383838" },
                  "& .MuiRating-icon": {
                    fontSize: { xs: "1.1rem", sm: "1.25rem" },
                  },
                }}
              />
              <span className="text-neutral-400 font-medium">
                {Number(displayScore10).toFixed(1)}
              </span>
            </div>
          )}

          {userStars > 0 ? (
            <>
              {ratingStars > 0 && (
                <div className="h-3.5 w-px bg-neutral-700 mx-3 sm:mx-4 hidden xs:block" />
              )}
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-white">Your rating:</span>
                <Rating
                  value={userStars}
                  precision={0.5}
                  onChange={(_, val) => handleRatingChange(val)}
                  size="small"
                  sx={{
                    color: "#b9f84d",
                    "& .MuiRating-iconEmpty": { color: "#383838" },
                    "& .MuiRating-iconFilled": { color: "#b9f84d" },
                    "& .MuiRating-iconHover": { color: "#d4fc79" },
                    "& .MuiRating-icon": {
                      fontSize: { xs: "1.1rem", sm: "1.25rem" },
                    },
                  }}
                />
              </div>
            </>
          ) : user && isRatingOpen ? (
            <>
              {ratingStars > 0 && (
                <div className="h-3.5 w-px bg-neutral-700 mx-3 sm:mx-4 hidden xs:block" />
              )}
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-white">Rate:</span>
                <Rating
                  value={0}
                  precision={0.5}
                  onChange={(_, val) => handleRatingChange(val)}
                  size="small"
                  sx={{
                    color: "#b9f84d",
                    "& .MuiRating-iconEmpty": { color: "#383838" },
                    "& .MuiRating-iconHover": { color: "#b9f84d" },
                    "& .MuiRating-icon": {
                      fontSize: { xs: "1.1rem", sm: "1.25rem" },
                    },
                  }}
                />
              </div>
            </>
          ) : user ? (
            <>
              {ratingStars > 0 && (
                <div className="h-3.5 w-px bg-neutral-700 mx-3 sm:mx-4 hidden xs:block" />
              )}
              <button
                type="button"
                onClick={() => setIsRatingOpen(true)}
                className="text-xs text-neutral-400 hover:text-brand-lime flex items-center gap-1 transition-colors cursor-pointer py-0.5 px-1.5 rounded hover:bg-white/5"
                title="Add your rating"
              >
                <Star className="w-3.5 h-3.5 text-neutral-500 hover:text-brand-lime" />
                <span>Rate</span>
              </button>
            </>
          ) : null}
        </div>
      </div>

      {/* Watchlist Action */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="shrink-0 flex items-center justify-center pl-2 sm:pl-4 self-center relative z-10"
      >
        <button
          type="button"
          onClick={handleToggleWatchlist}
          aria-label={
            inWatchlist ? "Remove from watchlist" : "Add to watchlist"
          }
          title={inWatchlist ? "In Watchlist" : "Add to Watchlist"}
          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
            inWatchlist
              ? "bg-brand-lime text-black"
              : "border-2 border-white/80 hover:border-brand-lime text-white hover:text-brand-lime"
          }`}
        >
          {inWatchlist ? (
            <Check className="w-5 h-5 sm:w-6 sm:h-6 stroke-3" />
          ) : (
            <Plus className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
          )}
        </button>
      </div>
    </div>
  );
}
