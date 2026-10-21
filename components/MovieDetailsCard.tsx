"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  PlusCircle,
  Check,
  Trash2,
  Share2,
  Star,
  ChevronLeft,
} from "lucide-react";
import type { MediaItem } from "@/types/media";
import { useWatchlist } from "@/components/WatchlistProvider";
import {
  getPosterUrl,
  formatRuntime,
  formatCurrency,
  formatDate,
  formatVoteCount,
  formatAddedAtDate,
  isMatureRating,
  cn,
} from "@/lib/utils";

export interface MovieDetailsCardProps {
  media: MediaItem;
  initialInWatchlist?: boolean;
  initialAddedAt?: string | null;
  onWatchlistToggle?: (mediaId: string, inWatchlist: boolean) => void;
}

export default function MovieDetailsCard({
  media,
  initialInWatchlist = false,
  initialAddedAt = null,
  onWatchlistToggle,
}: MovieDetailsCardProps) {
  const {
    isInWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    isLoading: isWatchlistLoading,
  } = useWatchlist();

  const [isPending, setIsPending] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(initialInWatchlist);
  const [addedAt, setAddedAt] = useState<string | null>(initialAddedAt || null);
  const [imageError, setImageError] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sync state with watchlist context once hydrated
  useEffect(() => {
    if (!isWatchlistLoading) {
      const inList = isInWatchlist(media.id);
      setInWatchlist(inList);
      if (!inList) {
        setAddedAt(null);
      }
    }
  }, [isWatchlistLoading, isInWatchlist, media.id]);

  const isTV = media.media_type === "tv";
  const posterSrc = getPosterUrl(media.poster_path, "w780");

  const ratingStr = media.vote_average
    ? Number(media.vote_average).toFixed(1)
    : "0.0";
  const votesStr = formatVoteCount(media.vote_count);

  const runtimeText = isTV
    ? `${media.seasons_count || 1} ${(media.seasons_count || 1) === 1 ? "Season" : "Seasons"}`
    : formatRuntime(media.runtime);

  const formattedBudget = formatCurrency(media.budget);
  const formattedRevenue = formatCurrency(media.revenue);
  const formattedDate = formatDate(media.release_date);
  const formattedAddedAt = formatAddedAtDate(addedAt);
  const isMature = isMatureRating(media.age_rating);

  const metadata = media.metadata as {
    tagline?: string | null;
    directors?: string[];
    creators?: string[];
    cast?: string[];
  } | null;

  const crewList = isTV ? metadata?.creators : metadata?.directors;
  const crewNames =
    crewList && crewList.length > 0 ? crewList.join(", ") : null;
  const castNames =
    metadata?.cast && metadata.cast.length > 0
      ? metadata.cast.slice(0, 5).join(", ")
      : null;

  const countryDisplay =
    media.country || (media.countries && media.countries[0]) || "USA";

  // Check if media qualifies for Top-500 badge (rating >= 8.0 or high popularity)
  const isTopRated = (media.vote_average || 0) >= 8.0;

  const handleAddToWatchlist = async () => {
    if (isPending) return;
    setIsPending(true);
    const nowIso = new Date().toISOString();
    setInWatchlist(true);
    setAddedAt(nowIso);

    try {
      const success = await addToWatchlist(media.id);
      if (!success) {
        setInWatchlist(false);
        setAddedAt(null);
      } else if (onWatchlistToggle) {
        onWatchlistToggle(media.id, true);
      }
    } finally {
      setIsPending(false);
    }
  };

  const handleRemoveWatchlist = async () => {
    if (isPending) return;
    setIsPending(true);
    setInWatchlist(false);
    setAddedAt(null);

    try {
      const success = await removeFromWatchlist(media.id);
      if (!success) {
        setInWatchlist(true);
        setAddedAt(initialAddedAt || null);
      } else if (onWatchlistToggle) {
        onWatchlistToggle(media.id, false);
      }
    } finally {
      setIsPending(false);
    }
  };

  const handleShare = async () => {
    try {
      if (typeof window !== "undefined") {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Fallback
    }
  };

  return (
    <div className="relative w-full max-w-5xl lg:max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Subtle Ambient Glow Behind Card */}
      {!imageError && posterSrc && (
        <div
          className="absolute top-12 left-1/2 -translate-x-1/2 w-4/5 h-112 bg-cover bg-center blur-3xl opacity-10 pointer-events-none rounded-full"
          style={{ backgroundImage: `url(${posterSrc})` }}
        />
      )}

      {/* Back to Catalog Link */}
      <Link
        href="/catalog"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-400 hover:text-white transition-colors mb-5 group"
      >
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        <span>Back to catalog</span>
      </Link>

      {/* Main Details Card Box */}
      <div className="relative bg-[#222222] border border-neutral-800 rounded-3xl p-6 sm:p-8 md:p-10 shadow-2xl shadow-black/80 flex flex-col">
        {/* Top: Poster & Details Columns */}
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
          {/* Left Column: Poster + Action Buttons */}
          <div className="w-full md:w-68 lg:w-76 shrink-0 flex flex-col gap-3.5">
            <div className="relative aspect-2/3 w-full rounded-2xl overflow-hidden bg-neutral-900 border border-white/5 shadow-xl">
              {!imageError && posterSrc ? (
                <Image
                  src={posterSrc}
                  alt={media.title}
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 304px"
                  className="object-cover object-center"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-neutral-900 text-neutral-500">
                  <span className="text-4xl mb-2">🎬</span>
                  <span className="text-sm font-medium">{media.title}</span>
                </div>
              )}
            </div>

            {/* Actions Row */}
            {inWatchlist ? (
              <div className="flex items-center justify-between w-full px-1 py-1 mt-1">
                <div className="flex items-center gap-2 select-none">
                  <span className="w-5 h-5 rounded-full bg-[#8ce648] flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 text-black stroke-3" />
                  </span>
                  <span className="text-[#8ce648] font-medium text-sm">
                    In Watchlist
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleRemoveWatchlist}
                    disabled={isPending}
                    title="Remove from Watchlist"
                    aria-label="Remove from Watchlist"
                    className="p-1 text-red-500 hover:text-red-400 hover:scale-110 active:scale-95 transition-all cursor-pointer select-none"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    onClick={handleShare}
                    title={copied ? "Link copied to clipboard!" : "Share link"}
                    aria-label="Share"
                    className="relative p-1 text-white hover:text-neutral-300 hover:scale-110 active:scale-95 transition-all cursor-pointer select-none"
                  >
                    <Share2 className="w-5 h-5" />
                    {copied && (
                      <span className="absolute -top-8 -right-2 px-2 py-1 rounded bg-neutral-900 border border-neutral-700 text-[10px] text-white font-bold shadow-lg animate-in fade-in">
                        Copied!
                      </span>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 w-full mt-1">
                <button
                  type="button"
                  onClick={handleAddToWatchlist}
                  disabled={isPending}
                  className="flex-1 h-11 px-4 rounded-xl bg-transparent border border-neutral-700/80 hover:border-neutral-500 hover:bg-neutral-800/60 text-white font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer select-none"
                >
                  <PlusCircle className="w-4 h-4 text-neutral-300" />
                  <span>Add to Watchlist</span>
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  title={copied ? "Link copied to clipboard!" : "Share link"}
                  aria-label="Share"
                  className="relative w-11 h-11 shrink-0 rounded-xl bg-transparent border border-neutral-700/80 hover:border-neutral-500 hover:bg-neutral-800/60 text-neutral-300 hover:text-white flex items-center justify-center transition-all cursor-pointer select-none"
                >
                  <Share2 className="w-4 h-4" />
                  {copied && (
                    <span className="absolute -top-8 px-2 py-1 rounded bg-neutral-900 border border-neutral-700 text-[10px] text-white font-bold shadow-lg animate-in fade-in">
                      Copied!
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Title, Rating, Badges, and Metadata Box */}
          <div className="flex-1 min-w-0 w-full flex flex-col gap-4">
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

              {/* Top-Right Big Rating Score + Vote Count */}
              <div className="flex flex-col items-end shrink-0 pt-0.5">
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
                    className="px-3 py-1 bg-[#85c355] hover:bg-[#9ded5b] text-black font-bold text-xs rounded-lg uppercase tracking-wide shadow-sm transition-all hover:scale-102 cursor-pointer"
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

            {/* Structured Metadata Box */}
            <div className="w-full rounded-2xl border border-neutral-700/60 bg-[#181818]/70 p-5 sm:p-6 flex flex-col gap-2.5 text-sm mt-1">
              <div className="flex items-baseline gap-2">
                <span className="text-neutral-400 font-medium">Country:</span>
                <span className="text-white font-medium">{countryDisplay}</span>
              </div>

              {runtimeText && (
                <div className="flex items-baseline gap-2">
                  <span className="text-neutral-400 font-medium">
                    {isTV ? "Seasons:" : "Runtime:"}
                  </span>
                  <span className="text-white font-medium">{runtimeText}</span>
                </div>
              )}

              {formattedBudget && !isTV && (
                <div className="flex items-baseline gap-2">
                  <span className="text-neutral-400 font-medium">Budget:</span>
                  <span className="text-white font-medium">
                    {formattedBudget}
                  </span>
                </div>
              )}

              {formattedRevenue && !isTV && (
                <div className="flex items-baseline gap-2">
                  <span className="text-neutral-400 font-medium">
                    Box Office:
                  </span>
                  <span className="text-[#8ce648] font-semibold">
                    {formattedRevenue}
                  </span>
                </div>
              )}

              {isTV && media.episodes_count && (
                <div className="flex items-baseline gap-2">
                  <span className="text-neutral-400 font-medium">
                    Episodes:
                  </span>
                  <span className="text-white font-medium">
                    {media.episodes_count}{" "}
                    {media.episodes_count === 1 ? "episode" : "episodes"}
                  </span>
                </div>
              )}

              {isTV && media.status && (
                <div className="flex items-baseline gap-2">
                  <span className="text-neutral-400 font-medium">Status:</span>
                  <span className="text-white font-medium">{media.status}</span>
                </div>
              )}

              {media.age_rating && (
                <div className="flex items-baseline gap-2">
                  <span className="text-neutral-400 font-medium">
                    Age rating:
                  </span>
                  <span
                    className={cn(
                      "font-semibold",
                      isMature ? "text-red-400" : "text-white",
                    )}
                  >
                    {media.age_rating}
                  </span>
                </div>
              )}

              {formattedDate && (
                <div className="flex items-baseline gap-2">
                  <span className="text-neutral-400 font-medium">
                    Premiered on:
                  </span>
                  <span className="text-white font-medium">
                    {formattedDate}
                    {countryDisplay ? ` (${countryDisplay})` : ""}
                  </span>
                </div>
              )}

              {crewNames && (
                <div className="flex items-baseline gap-2">
                  <span className="text-neutral-400 font-medium">
                    {isTV ? "Creator:" : "Director:"}
                  </span>
                  <span className="text-white font-medium">{crewNames}</span>
                </div>
              )}

              {castNames && (
                <div className="flex items-baseline gap-2">
                  <span className="text-neutral-400 font-medium">Stars:</span>
                  <span className="text-white font-medium">{castNames}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Section: Overview Paragraph & Added At */}
        {media.overview && (
          <div className="mt-8 pt-6 border-t border-neutral-800 flex flex-col gap-4">
            <p className="text-sm sm:text-base text-neutral-300 leading-relaxed font-normal">
              {media.overview}
            </p>

            {inWatchlist && formattedAddedAt && (
              <div className="pt-2">
                <span className="text-neutral-400 text-sm font-normal">
                  Added on: {formattedAddedAt}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
