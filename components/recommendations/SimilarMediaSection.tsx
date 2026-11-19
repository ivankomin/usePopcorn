"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import type { SimilarMediaItem } from "@/types/media";
import { getPosterUrl } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface SimilarMediaSectionProps {
  items: SimilarMediaItem[];
}

function SimilarMediaCard({ item }: { item: SimilarMediaItem }) {
  const { media, matchPercent, matchReasons } = item;
  const [imageError, setImageError] = useState(false);

  const posterSrc = getPosterUrl(media.poster_path, "w500");
  const hasUserReviews =
    (media.vote_count || 0) > 0 && (media.vote_average || 0) > 0;
  const ratingValue = hasUserReviews
    ? media.vote_average
    : media.imdb_rating || null;

  return (
    <Link
      href={`/movie/${media.id}`}
      className="group bg-[#181818] border border-neutral-800/90 hover:border-neutral-700 rounded-2xl overflow-hidden flex flex-col transition-all duration-200 hover:shadow-xl hover:shadow-black/60"
    >
      <div className="relative w-full aspect-2/3 bg-neutral-900 overflow-hidden">
        {!imageError && posterSrc ? (
          <Image
            src={posterSrc}
            alt={media.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 220px"
            className="object-cover object-center group-hover:scale-103 transition-transform duration-300"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-neutral-500">
            <span className="text-3xl mb-1.5">🎬</span>
            <span className="text-xs font-medium line-clamp-2">
              {media.title}
            </span>
          </div>
        )}
      </div>

      <div className="p-3.5 flex flex-col gap-2 flex-1">
        <div className="space-y-1">
          <h3 className="text-sm sm:text-base font-bold text-white leading-snug line-clamp-1 group-hover:text-brand-lime transition-colors">
            {media.title}
          </h3>
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>
              {media.release_year} &middot;{" "}
              {media.media_type === "tv" ? "Series" : "Movie"}
            </span>
            {ratingValue !== null && ratingValue > 0 && (
              <span className="inline-flex items-center gap-1 text-neutral-200 font-semibold">
                <Star className="w-3 h-3 fill-[#f5c518] text-[#f5c518]" />
                {Number(ratingValue).toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export function SimilarMediaSection({ items }: SimilarMediaSectionProps) {
  const { user } = useAuth();

  if (items.length === 0) return null;

  return (
    <section className="w-full max-w-5xl lg:max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-12">
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Similar Titles
          </h2>
        </div>

        {user && (
          <Link
            href="/recommendations"
            className="text-xs sm:text-sm font-medium text-neutral-400 hover:text-brand-lime transition-colors shrink-0"
          >
            See your For You picks &rarr;
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {items.map((item) => (
          <SimilarMediaCard key={item.media.id} item={item} />
        ))}
      </div>
    </section>
  );
}
