import FilterSidebar from "../../components/Filters/FilterSidebar";
import MediaCard from "../../components/MediaCard";
import { useWatchlist } from "../../contexts/WatchlistContext";
import { useFilters } from "../../hooks/useFilters";

export default function Watchlist() {
  const { watchlist } = useWatchlist();
  const { filters, updateFilters, resetFilters, hasActiveFilters } = useFilters(
    watchlist,
    "watchlist",
  );
  const type = "watchlist";
  return (
    <div className="flex w-full justify-between gap-10 p-8">
      <FilterSidebar
        filters={filters}
        updateFilters={updateFilters}
        resetFilters={resetFilters}
        hasActiveFilters={hasActiveFilters}
        type={type}
      />

      <main className="ml-50 max-w-6xl flex-1">
        <div className="mb-6">
          <h1 className="mt-5 mb-5 text-4xl font-bold">Your Watchlist</h1>
        </div>

        {watchlist.length > 0 ? (
          <div className="flex flex-col gap-6">
            {watchlist.map((media) => (
              <MediaCard key={media.imdbID} media={media} />
            ))}
          </div>
        ) : (
          <p className="text-lg text-gray-400">
            Your watchlist is empty. Start adding movies and series you want to
            watch!
          </p>
        )}
      </main>
      <div className="hidden w-72 shrink-0 xl:block" aria-hidden="true" />
    </div>
  );
}
