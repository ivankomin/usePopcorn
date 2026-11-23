"use client";

import type { MediaItem } from "@/types/media";
import { Star } from "lucide-react";
import {
  formatMediaDuration,
  formatCurrency,
  formatDate,
  isMatureRating,
  cn,
} from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";

export interface MovieDetailsMetadataProps {
  media: MediaItem;
}

export function MovieDetailsMetadata({ media }: MovieDetailsMetadataProps) {
  const { t, tFilter } = useI18n();
  const isTV = media.media_type === "tv";
  const runtimeText = formatMediaDuration(media);

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

  const rawCountry =
    media.country || (media.countries && media.countries[0]) || "USA";
  const countryDisplay = tFilter(rawCountry);

  return (
    <div className="w-full rounded-2xl border border-neutral-700/60 bg-[#181818]/70 p-5 sm:p-6 flex flex-col gap-2.5 text-sm mt-1">
      <div className="flex items-baseline gap-2">
        <span className="text-neutral-400 font-medium">
          {t("movieDetails.country")}
        </span>
        <span className="text-white font-medium">{countryDisplay}</span>
      </div>

      {runtimeText && (
        <div className="flex items-baseline gap-2">
          <span className="text-neutral-400 font-medium">
            {isTV ? t("movieDetails.seasons") : t("movieDetails.runtime")}
          </span>
          <span className="text-white font-medium">{runtimeText}</span>
        </div>
      )}

      {formattedBudget && !isTV && (
        <div className="flex items-baseline gap-2">
          <span className="text-neutral-400 font-medium">
            {t("movieDetails.budget")}
          </span>
          <span className="text-white font-medium">{formattedBudget}</span>
        </div>
      )}

      {formattedRevenue && !isTV && (
        <div className="flex items-baseline gap-2">
          <span className="text-neutral-400 font-medium">
            {t("movieDetails.boxOffice")}
          </span>
          <span className="text-[#8ce648] font-semibold">
            {formattedRevenue}
          </span>
        </div>
      )}

      {isTV && media.episodes_count && (
        <div className="flex items-baseline gap-2">
          <span className="text-neutral-400 font-medium">
            {t("movieDetails.episodes")}
          </span>
          <span className="text-white font-medium">
            {media.episodes_count}{" "}
            {media.episodes_count === 1
              ? t("movieDetails.episodeSingular")
              : t("movieDetails.episodePlural")}
          </span>
        </div>
      )}

      {isTV && media.status && (
        <div className="flex items-baseline gap-2">
          <span className="text-neutral-400 font-medium">
            {t("movieDetails.status")}
          </span>
          <span className="text-white font-medium">{media.status}</span>
        </div>
      )}

      {media.age_rating && (
        <div className="flex items-baseline gap-2">
          <span className="text-neutral-400 font-medium">
            {t("movieDetails.ageRating")}
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

      {media.imdb_rating && (
        <div className="flex items-baseline gap-2">
          <span className="text-neutral-400 font-medium">
            {t("movieDetails.imdbRating")}
          </span>
          <div className="flex items-center gap-1.5 font-semibold text-white">
            <span>{Number(media.imdb_rating).toFixed(1)}</span>
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          </div>
        </div>
      )}

      {formattedDate && (
        <div className="flex items-baseline gap-2">
          <span className="text-neutral-400 font-medium">
            {t("movieDetails.premieredOn")}
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
            {isTV ? t("movieDetails.creator") : t("movieDetails.director")}
          </span>
          <span className="text-white font-medium">{crewNames}</span>
        </div>
      )}

      {castNames && (
        <div className="flex items-baseline gap-2">
          <span className="text-neutral-400 font-medium">
            {t("movieDetails.stars")}
          </span>
          <span className="text-white font-medium">{castNames}</span>
        </div>
      )}
    </div>
  );
}
