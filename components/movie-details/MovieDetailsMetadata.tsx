import type { MediaItem } from "@/types/media";
import {
  formatRuntime,
  formatCurrency,
  formatDate,
  isMatureRating,
  cn,
} from "@/lib/utils";

export interface MovieDetailsMetadataProps {
  media: MediaItem;
}

export function MovieDetailsMetadata({ media }: MovieDetailsMetadataProps) {
  const isTV = media.media_type === "tv";
  const runtimeText = isTV
    ? `${media.seasons_count || 1} ${(media.seasons_count || 1) === 1 ? "Season" : "Seasons"}`
    : formatRuntime(media.runtime);

  const formattedBudget = formatCurrency(media.budget);
  const formattedRevenue = formatCurrency(media.revenue);
  const formattedDate = formatDate(media.release_date);
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

  return (
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
          <span className="text-white font-medium">{formattedBudget}</span>
        </div>
      )}

      {formattedRevenue && !isTV && (
        <div className="flex items-baseline gap-2">
          <span className="text-neutral-400 font-medium">Box Office:</span>
          <span className="text-[#8ce648] font-semibold">
            {formattedRevenue}
          </span>
        </div>
      )}

      {isTV && media.episodes_count && (
        <div className="flex items-baseline gap-2">
          <span className="text-neutral-400 font-medium">Episodes:</span>
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
          <span className="text-neutral-400 font-medium">Age rating:</span>
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
          <span className="text-neutral-400 font-medium">Premiered on:</span>
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
  );
}
