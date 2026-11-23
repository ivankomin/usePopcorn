"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Check, Star } from "lucide-react";
import type { MediaItem } from "@/types/media";
import { cn, formatMediaDuration, getPosterUrl } from "@/lib/utils";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useAuth } from "@/hooks/useAuth";
import { useRatings } from "@/hooks/useRatings";
import { StarRating } from "./StarRating";
import { MediaPoster } from "./MediaPoster";

export interface MediaCardProps {
  media: MediaItem;
  initialInWatchlist?: boolean;
  initialUserRating?: number | null; // scale 1-10 (e.g. 9 or 10)
  fromWatchlist?: boolean;
  /** Optional explicit detail route (e.g. `/movie/<id>?from=recommendations`). */
  href?: string;
  /** Optional navigation source stored in sessionStorage for back-link routing. */
  navSource?: "catalog" | "watchlist" | "recommendations";
  /** Optional slot rendered above the media title (e.g. recommendation match badges). */
  headerSlot?: ReactNode;
  /** When true, falls back to IMDb rating with numeric label if no user reviews exist. */
  showImdbFallback?: boolean;
  /** Optional override for the resting border color class. */
  cardBorderClassName?: string;
  onWatchlistToggle?: (mediaId: string, inWatchlist: boolean) => void;
  onRate?: (mediaId: string, rating10: number) => void;
}

export default function MediaCard({
  media,
  initialInWatchlist = false,
  initialUserRating = null,
  fromWatchlist = false,
  href,
  navSource,
  headerSlot,
  showImdbFallback = false,
  cardBorderClassName = "border-[#181818]",
  onWatchlistToggle,
  onRate,
}: MediaCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const {
    isInWatchlist,
    toggleWatchlist,
    isLoading: isWatchlistLoading,
  } = useWatchlist();
  const { getUserRating, rateMedia } = useRatings();

  // If watchlist is still loading on mount and initialInWatchlist was provided by SSR, trust it
  const isSaved = isInWatchlist(media.id);
  const inWatchlist = isWatchlistLoading && initialInWatchlist ? true : isSaved;

  const liveRating = getUserRating(media.id);
  const userRating = liveRating !== null ? liveRating : initialUserRating;

  const [isRatingOpen, setIsRatingOpen] = useState<boolean>(false);

  // User reviews rating 10-point scale into a 5-point scale for MUI Rating
  const hasUserReviews =
    (media.vote_count || 0) > 0 && (media.vote_average || 0) > 0;
  const displayScore10 = hasUserReviews
    ? media.vote_average || 0
    : showImdbFallback
      ? media.imdb_rating || 0
      : 0;
  const ratingStars =
    displayScore10 > 0 ? Math.min(5, Math.max(0, displayScore10 / 2)) : 0;

  // User rating 10-point scale into a 5-point scale (or 0 if unrated)
  const userStars = userRating ? userRating / 2 : 0;

  // Format genres list
  const genreText =
    media.genres && media.genres.length > 0
      ? media.genres.map((g) => g.name).join(", ")
      : null;

  const runtimeText = formatMediaDuration(media);
  const posterSrc = getPosterUrl(media.poster_path, "w500");

  const resolvedNavSource =
    navSource ?? (fromWatchlist ? "watchlist" : "catalog");
  const currentQuery = searchParams ? searchParams.toString() : "";
  const movieHref =
    href ??
    (fromWatchlist
      ? `/movie/${media.id}?from=watchlist`
      : currentQuery
        ? `/movie/${media.id}?${currentQuery}`
        : `/movie/${media.id}`);

  const recordNavigation = () => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("internal_nav_from", resolvedNavSource);
        if (resolvedNavSource === "catalog") {
          const currentUrl = currentQuery
            ? `/catalog?${currentQuery}`
            : "/catalog";
          sessionStorage.setItem("last_catalog_url", currentUrl);
          if (media.media_type === "tv") {
            sessionStorage.setItem("last_tv_catalog_url", currentUrl);
          } else {
            sessionStorage.setItem("last_movie_catalog_url", currentUrl);
          }
        }
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
    const nextState = !inWatchlist;
    const success = await toggleWatchlist(media.id);
    if (success && onWatchlistToggle) {
      onWatchlistToggle(media.id, nextState);
    }
  };

  const handleRatingChange = async (newStars: number | null) => {
    if (!newStars) return;
    const score10 = Math.round(newStars * 2);
    setIsRatingOpen(false);

    const success = await rateMedia(media.id, score10);
    if (success && onRate) {
      onRate(media.id, score10);
    }
  };

  const showRatingBlock = showImdbFallback ? ratingStars > 0 : hasUserReviews;

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        "group relative bg-[#181818] rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-center sm:items-stretch gap-5 sm:gap-6 transition-all border duration-200 hover:border-neutral-700 hover:shadow-xl hover:shadow-black/50 cursor-pointer",
        cardBorderClassName,
      )}
    >
      <Link
        href={movieHref}
        onClick={recordNavigation}
        className="relative w-28.75 sm:w-31 aspect-2/3 shrink-0 rounded-xl overflow-hidden bg-neutral-900 border border-white/5 shadow-md block cursor-pointer"
      >
        <MediaPoster
          title={media.title}
          src={posterSrc}
          sizes="(max-width: 640px) 115px, 124px"
          imageClassName="group-hover:scale-102 transition-transform duration-300"
        />
      </Link>

      <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
        <div>
          {headerSlot}

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
          {(genreText || runtimeText) && (
            <div className="text-xs sm:text-sm text-neutral-400 font-normal mt-1 flex items-center flex-wrap gap-2">
              {genreText && <span>{genreText}</span>}
              {genreText && runtimeText && (
                <span className="text-neutral-500">•</span>
              )}
              {runtimeText && <span>{runtimeText}</span>}
            </div>
          )}

          {media.overview && (
            <p className="text-xs sm:text-sm text-neutral-300 italic line-clamp-2 sm:line-clamp-3 leading-relaxed mt-2.5 mb-3">
              {media.overview}
            </p>
          )}
        </div>
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center flex-wrap gap-y-2 text-xs sm:text-sm mt-auto pt-1 relative z-10"
        >
          {showRatingBlock && (
            <div className="flex items-center gap-1.5 mr-2">
              <span className="font-semibold text-white">
                {hasUserReviews ? "Rating:" : "IMDb:"}
              </span>
              <StarRating
                value={ratingStars}
                precision={0.1}
                readOnly
                size="small"
                sx={{
                  color: "#f5c518",
                  "& .MuiRating-iconEmpty": {
                    color: "#383838",
                  },
                  "& .MuiRating-icon": {
                    fontSize: { xs: "1.1rem", sm: "1.25rem" },
                  },
                }}
              />
              {showImdbFallback && (
                <span className="text-neutral-400 font-medium">
                  {Number(displayScore10).toFixed(1)}
                </span>
              )}
            </div>
          )}

          {userStars > 0 ? (
            <>
              {showRatingBlock && (
                <div className="h-3.5 w-px bg-neutral-700 mx-3 sm:mx-4 hidden xs:block" />
              )}
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-white">Your rating:</span>
                <StarRating
                  value={userStars}
                  precision={0.5}
                  onChange={(_, val) => handleRatingChange(val)}
                  size="small"
                  sx={{
                    color: "#b9f84d",
                    "& .MuiRating-iconEmpty": {
                      color: "#383838",
                    },
                    "& .MuiRating-iconFilled": {
                      color: "#b9f84d",
                    },
                    "& .MuiRating-iconHover": {
                      color: "#d4fc79",
                    },
                    "& .MuiRating-icon": {
                      fontSize: { xs: "1.1rem", sm: "1.25rem" },
                    },
                  }}
                />
              </div>
            </>
          ) : user && isRatingOpen ? (
            <>
              {showRatingBlock && (
                <div className="h-3.5 w-px bg-neutral-700 mx-3 sm:mx-4 hidden xs:block" />
              )}
              <div className="flex items-center gap-1.5 animate-fadeIn">
                <span className="font-semibold text-white">Rate:</span>
                <StarRating
                  value={0}
                  precision={0.5}
                  onChange={(_, val) => handleRatingChange(val)}
                  size="small"
                  sx={{
                    color: "#b9f84d",
                    "& .MuiRating-iconEmpty": {
                      color: "#383838",
                    },
                    "& .MuiRating-iconHover": {
                      color: "#b9f84d",
                    },
                    "& .MuiRating-icon": {
                      fontSize: { xs: "1.1rem", sm: "1.25rem" },
                    },
                  }}
                />
              </div>
            </>
          ) : user ? (
            <>
              {showRatingBlock && (
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
