"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import type { MediaItem, WatchlistStatus } from "@/types/media";
import { getPosterUrl, formatRuntime } from "@/lib/utils";
import { useRatings } from "@/hooks/useRatings";

export interface ProfileMovieCardProps {
  media: MediaItem;
  watchlistStatus?: WatchlistStatus;
  initialUserRating?: number | null;
  onRemove?: (mediaId: string) => void;
}

export function ProfileMovieCard({
  media,
  initialUserRating = null,
}: ProfileMovieCardProps) {
  const router = useRouter();
  const { getUserRating } = useRatings();

  const [imageError, setImageError] = useState(false);

  const liveRating = getUserRating(media.id);
  const userRating = liveRating !== null ? liveRating : initialUserRating;

  // Runtime / Seasons
  const runtimeText =
    media.media_type === "tv"
      ? `${media.seasons_count || 1} ${(media.seasons_count || 1) === 1 ? "Season" : "Seasons"}`
      : formatRuntime(media.runtime);

  const posterSrc = getPosterUrl(media.poster_path, "w500");

  const handleCardClick = () => {
    router.push(`/movie/${media.id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="group relative bg-[#181818] border border-neutral-800/80 hover:border-neutral-700 rounded-2xl overflow-hidden flex flex-col transition-all duration-200 hover:shadow-xl hover:shadow-black/70 cursor-pointer"
    >
      {/* POSTER AREA */}
      <div className="relative aspect-2/3 w-full bg-neutral-900 overflow-hidden">
        {!imageError && posterSrc ? (
          <Image
            src={posterSrc}
            alt={media.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 240px"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-800 text-neutral-500 p-4 text-center">
            <span className="text-xs font-medium">{media.title}</span>
          </div>
        )}

        {/* Gradient shadow overlay for badge readability */}
        <div className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-black/70 via-black/20 to-transparent pointer-events-none" />

        {/* Top-left: Media Type Badge */}
        <div className="absolute top-2.5 left-2.5 z-10">
          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider font-semibold bg-black/60 backdrop-blur-md text-neutral-300 border border-white/10 shadow-xs">
            {media.media_type === "tv" ? "TV" : "Movie"}
          </span>
        </div>
      </div>

      {/* CARD DETAILS */}
      <div className="p-3.5 sm:p-4 flex flex-col flex-1 justify-between gap-2.5">
        <div className="flex flex-col gap-1.5">
          <Link
            href={`/movie/${media.id}`}
            onClick={(e) => e.stopPropagation()}
            className="font-bold text-white text-sm sm:text-base leading-snug line-clamp-1 transition-colors"
          >
            {media.title}
          </Link>

          <div className="flex items-center gap-1.5 text-xs text-neutral-400">
            {media.release_year && <span>{media.release_year}</span>}
            {runtimeText && (
              <>
                <span className="text-neutral-600">•</span>
                <span className="truncate">{runtimeText}</span>
              </>
            )}
          </div>
        </div>

        {/* RATINGS ROW */}
        <div className="flex items-center justify-between text-xs pt-2 border-t border-neutral-800/80 mt-1">
          {/* Average Rating */}
          <div className="flex items-center gap-1 text-neutral-300">
            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400 shrink-0" />
            <span className="font-semibold text-xs">
              {media.vote_average ? media.vote_average.toFixed(1) : "—"}
            </span>
          </div>

          {/* User Score (if rated) */}
          {userRating !== null && userRating !== undefined ? (
            <div className="flex items-center gap-1 text-brand-lime text-xs font-bold font-mono">
              <Star className="w-3.5 h-3.5 fill-brand-lime text-brand-lime shrink-0" />
              <span>{userRating}/10</span>
            </div>
          ) : (
            <span className="text-[11px] text-neutral-500">Unrated</span>
          )}
        </div>
      </div>
    </div>
  );
}
