"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import type { MediaItem, WatchlistStatus } from "@/types/media";
import { extractYouTubeVideoId, getPosterUrl } from "@/lib/utils";
import {
  MovieDetailsBackLink,
  MovieDetailsPoster,
  MovieDetailsActions,
  MovieDetailsHeader,
  MovieDetailsMetadata,
  MovieDetailsOverview,
  TrailerModal,
  AddToCollectionMenu,
  useMovieDetailsWatchlist,
} from "./movie-details";

export interface MovieDetailsCardProps {
  media: MediaItem;
  initialInWatchlist?: boolean;
  initialAddedAt?: string | null;
  initialWatchlistStatus?: WatchlistStatus;
  initialFrom?: "catalog" | "watchlist" | "recommendations";
  initialUserRating?: number | null;
  onWatchlistToggle?: (mediaId: string, inWatchlist: boolean) => void;
  onStatusChange?: (mediaId: string, status: WatchlistStatus) => void;
}

export default function MovieDetailsCard({
  media,
  initialInWatchlist = false,
  initialAddedAt = null,
  initialWatchlistStatus = "plan_to_watch",
  initialFrom = "catalog",
  initialUserRating = null,
  onWatchlistToggle,
  onStatusChange,
}: MovieDetailsCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);

  const trailerKey = extractYouTubeVideoId(media.metadata?.trailer_key);

  const {
    inWatchlist,
    status,
    addedAt,
    isPending,
    handleAddToWatchlist,
    handleStatusSelect,
    handleRemoveWatchlist,
  } = useMovieDetailsWatchlist({
    mediaId: media.id,
    initialInWatchlist,
    initialAddedAt,
    initialWatchlistStatus,
    onWatchlistToggle,
    onStatusChange,
  });

  const posterSrc = getPosterUrl(media.poster_path, "w780");

  return (
    <div className="relative w-full max-w-5xl lg:max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Subtle Ambient Glow Behind Card */}
      {!imageError && posterSrc && (
        <div
          className="absolute top-12 left-1/2 -translate-x-1/2 w-4/5 h-112 bg-cover bg-center blur-3xl opacity-10 pointer-events-none rounded-full"
          style={{ backgroundImage: `url(${posterSrc})` }}
        />
      )}

      {/* Back Link (Watchlist if navigated from watchlist, otherwise Catalog) */}
      <MovieDetailsBackLink
        initialFrom={initialFrom}
        mediaType={media.media_type}
      />

      {/* Main Details Card Box */}
      <div className="relative bg-[#222222] border border-neutral-800 rounded-3xl p-6 sm:p-8 md:p-10 shadow-2xl shadow-black/80 flex flex-col">
        {/* Top: Poster & Details Columns */}
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
          {/* Left Column: Poster + Action Buttons */}
          <div className="w-full md:w-68 lg:w-76 shrink-0 flex flex-col gap-3.5">
            <MovieDetailsPoster
              title={media.title}
              posterSrc={posterSrc}
              imageError={imageError}
              onError={() => setImageError(true)}
            />
            <MovieDetailsActions
              inWatchlist={inWatchlist}
              status={status}
              isPending={isPending}
              onAddToWatchlist={handleAddToWatchlist}
              onStatusSelect={handleStatusSelect}
              onRemoveFromWatchlist={handleRemoveWatchlist}
            />
            <AddToCollectionMenu mediaId={media.id} />
            {trailerKey && (
              <button
                type="button"
                onClick={() => setIsTrailerOpen(true)}
                className="w-full h-11 px-4 rounded-xl bg-[#181818] border border-neutral-700/80 hover:border-brand-lime hover:text-brand-lime text-white font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer select-none group"
              >
                <Play className="w-4 h-4 fill-current text-brand-lime transition-transform group-hover:scale-110" />
                <span>Watch Trailer</span>
              </button>
            )}
          </div>

          {/* Right Column: Title, Rating, Badges, and Metadata Box */}
          <div className="flex-1 min-w-0 w-full flex flex-col gap-4">
            <MovieDetailsHeader media={media} initialUserRating={initialUserRating} />
            <MovieDetailsMetadata media={media} />
          </div>
        </div>

        {/* Bottom Section: Overview Paragraph & Added At */}
        <MovieDetailsOverview
          overview={media.overview}
          inWatchlist={inWatchlist}
          addedAt={addedAt}
        />
      </div>

      {trailerKey && (
        <TrailerModal
          isOpen={isTrailerOpen}
          title={media.title}
          videoId={trailerKey}
          onClose={() => setIsTrailerOpen(false)}
        />
      )}
    </div>
  );
}
