"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

// MUI Rating component is dynamically imported to avoid SSR issues
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
import { Plus, Check, Star } from "lucide-react";
import type { MediaItem } from "@/types/media";
import { formatRuntime, getPosterUrl } from "@/lib/utils";
import { useWatchlist } from "@/hooks/useWatchlist";

export interface MediaCardProps {
  media: MediaItem;
  initialInWatchlist?: boolean;
  initialUserRating?: number | null; // scale 1-10 (e.g. 9 or 10)
  fromWatchlist?: boolean;
  onWatchlistToggle?: (mediaId: string, inWatchlist: boolean) => void;
  onRate?: (mediaId: string, rating10: number) => void;
}

export default function MediaCard({
  media,
  initialInWatchlist = false,
  initialUserRating = null,
  fromWatchlist = false,
  onWatchlistToggle,
  onRate,
}: MediaCardProps) {
  const router = useRouter();
  const { isInWatchlist, toggleWatchlist, isLoading: isWatchlistLoading } =
    useWatchlist();

  // If watchlist is still loading on mount and initialInWatchlist was provided by SSR, trust it
  const isSaved = isInWatchlist(media.id);
  const inWatchlist = isWatchlistLoading && initialInWatchlist ? true : isSaved;

  const [userRating, setUserRating] = useState<number | null>(
    initialUserRating,
  );
  const [isRatingOpen, setIsRatingOpen] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);

  // Format IMDb 10-point scale into a 5-point scale for MUI Rating
  const imdbStars = Math.min(5, Math.max(0, (media.vote_average || 0) / 2));

  // User rating 10-point scale into a 5-point scale (or 0 if unrated)
  const userStars = userRating ? userRating / 2 : 0;

  // Format genres list
  const genreText =
    media.genres && media.genres.length > 0
      ? media.genres.map((g) => g.name).join(", ")
      : null;

  // Format runtime / duration
  const runtimeText =
    media.media_type === "tv"
      ? `${media.seasons_count || 1} ${(media.seasons_count || 1) === 1 ? "Season" : "Seasons"}`
      : formatRuntime(media.runtime);

  const posterSrc = getPosterUrl(media.poster_path, "w500");
  const movieHref = fromWatchlist
    ? `/movie/${media.id}?from=watchlist`
    : `/movie/${media.id}`;

  const handleCardClick = () => {
    if (typeof window !== "undefined" && window.getSelection()?.toString()) {
      return;
    }
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

  const handleRatingChange = (newStars: number | null) => {
    if (!newStars) return;
    const score10 = Math.round(newStars * 2);
    setUserRating(score10);
    setIsRatingOpen(false);

    if (onRate) {
      onRate(media.id, score10);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="group relative bg-[#181818] border-[#181818] rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-center sm:items-stretch gap-5 sm:gap-6 transition-all border duration-200 hover:border-neutral-700 hover:shadow-xl hover:shadow-black/50 cursor-pointer"
    >
      <Link
        href={movieHref}
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

      <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
        <div>
          <div className="flex items-baseline flex-wrap gap-x-2.5 leading-snug">
            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight">
              <Link
                href={movieHref}
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
          <div className="flex items-center gap-1.5 mr-2">
            <span className="font-semibold text-white">IMDb:</span>
            <Rating
              value={imdbStars}
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
          </div>

          {userStars > 0 ? (
            <>
              <div className="h-3.5 w-px bg-neutral-700 mx-3 sm:mx-4 hidden xs:block" />
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-white">Your rating:</span>
                <Rating
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
          ) : isRatingOpen ? (
            <>
              <div className="h-3.5 w-px bg-neutral-700 mx-3 sm:mx-4 hidden xs:block" />
              <div className="flex items-center gap-1.5 animate-fadeIn">
                <span className="font-semibold text-white">Rate:</span>
                <Rating
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
          ) : (
            <button
              type="button"
              onClick={() => setIsRatingOpen(true)}
              className="ml-3 text-xs text-neutral-400 hover:text-brand-lime flex items-center gap-1 transition-colors cursor-pointer py-0.5 px-1.5 rounded hover:bg-white/5"
              title="Add your rating"
            >
              <Star className="w-3.5 h-3.5 text-neutral-500 hover:text-brand-lime" />
              <span>Rate</span>
            </button>
          )}
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
