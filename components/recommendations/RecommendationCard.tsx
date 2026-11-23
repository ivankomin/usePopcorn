"use client";

import type { RecommendedMediaItem } from "@/types/media";
import MediaCard from "@/components/MediaCard";

export interface RecommendationCardProps {
  item: RecommendedMediaItem;
  onUserInteraction?: () => void;
}

export function RecommendationCard({
  item,
  onUserInteraction,
}: RecommendationCardProps) {
  const { media, matchReasons } = item;

  return (
    <MediaCard
      media={media}
      href={`/movie/${media.id}?from=recommendations`}
      navSource="recommendations"
      showImdbFallback={true}
      cardBorderClassName="border-neutral-800/80"
      onWatchlistToggle={onUserInteraction ? () => onUserInteraction() : undefined}
      onRate={onUserInteraction ? () => onUserInteraction() : undefined}
      headerSlot={
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
      }
    />
  );
}
