"use client";

import { formatAddedAtDate } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";

export interface MovieDetailsOverviewProps {
  overview?: string | null;
  inWatchlist: boolean;
  addedAt?: string | null;
}

export function MovieDetailsOverview({
  overview,
  inWatchlist,
  addedAt,
}: MovieDetailsOverviewProps) {
  const { t } = useI18n();
  const formattedAddedOn = formatAddedAtDate(addedAt);

  if (!overview && (!inWatchlist || !formattedAddedOn)) {
    return null;
  }

  return (
    <div className="mt-8 pt-6 border-t border-neutral-800 flex flex-col gap-4">
      {overview && (
        <p className="text-sm sm:text-base text-neutral-300 leading-relaxed font-normal">
          {overview}
        </p>
      )}

      {inWatchlist && formattedAddedOn && (
        <div className="pt-2">
          <span className="text-neutral-400 text-sm font-normal">
            {t("movieDetails.addedOn")} {formattedAddedOn}
          </span>
        </div>
      )}
    </div>
  );
}
