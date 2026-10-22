import { formatAddedAtDate } from "@/lib/utils";

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
            Added on: {formattedAddedOn}
          </span>
        </div>
      )}
    </div>
  );
}
