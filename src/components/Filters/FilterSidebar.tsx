import GenresDropdown from "./GenresDropdown.tsx";
import type { Filter } from "../../types/Filter.ts";
import YearInput from "./YearInput.tsx";
import RuntimeSeasonsDropdown from "./RuntimeSeasonsDropdown.tsx";

interface FilterSidebarProps {
  filters: Filter;
  updateFilters: <K extends keyof Filter>(key: K, value: Filter[K]) => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;
  type: "" | "movie" | "series" | "watchlist";
}
export default function FilterSidebar({
  filters,
  updateFilters,
  resetFilters,
  hasActiveFilters,
  type,
}: FilterSidebarProps) {
  const runtimeSeasonsValues = {
    min: type === "movie" ? filters.minRuntime : filters.minSeasons,
    max: type === "movie" ? filters.maxRuntime : filters.maxSeasons,
  };
  function handleRuntimeSeasonsChange(min: number, max: number) {
    if (type === "movie") {
      updateFilters("minRuntime", min);
      updateFilters("maxRuntime", max);
    } else {
      updateFilters("minSeasons", min);
      updateFilters("maxSeasons", max);
    }
  }

  return (
    <aside className="mt-30 w-72 shrink-0">
      <div className="bg-light-bg rounded-3xl border border-neutral-800/50 p-6 shadow-2xl">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-body-text text-xl font-bold tracking-tight">
            Filters
          </h2>
          {hasActiveFilters && (
            <button
              onClick={() => resetFilters()}
              className="hover:text-body-text text-xs font-bold tracking-widest text-neutral-400 uppercase transition-colors hover:cursor-pointer hover:underline"
            >
              Clear all
            </button>
          )}
        </div>

        <div className="space-y-8">
          <section>
            <p className="mb-3 text-xs font-extrabold tracking-widest text-neutral-400 uppercase">
              Genres
            </p>
            <div className="custom-scrollbar flex max-h-48 flex-col gap-1 overflow-y-auto pr-2">
              <GenresDropdown
                selected={filters.genres}
                onChange={(genres) => updateFilters("genres", genres)}
              />
            </div>
          </section>

          <section>
            <YearInput
              label="Min Year"
              value={filters.minYear}
              min={1900}
              max={2026}
              onChange={(value) => updateFilters("minYear", value)}
            />
            <span className="my-6 text-neutral-700">—</span>
            <YearInput
              label="Max Year"
              value={filters.maxYear}
              min={1900}
              max={2026}
              onChange={(value) => updateFilters("maxYear", value)}
            />
          </section>

          <section className="space-y-5">
            <div className="space-y-2">
              <div className="flex justify-between">
                <p className="text-xs font-extrabold tracking-widest text-neutral-400 uppercase">
                  Min Rating
                </p>
                <span className="text-accent text-xs font-bold">
                  {filters.minRating.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="0.1"
                className="accent-accent h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-neutral-800"
                value={filters.minRating}
                onChange={(e) =>
                  updateFilters("minRating", parseFloat(e.target.value))
                }
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <p className="text-xs font-extrabold tracking-widest text-neutral-400 uppercase">
                  Max Rating
                </p>
                <span className="text-accent text-xs font-bold">
                  {filters.maxRating.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="0.1"
                className="accent-accent h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-neutral-800"
                value={filters.maxRating}
                onChange={(e) =>
                  updateFilters("maxRating", parseFloat(e.target.value))
                }
              />
            </div>
          </section>

          <section>
            <p className="mb-3 text-xs font-extrabold tracking-widest text-neutral-400 uppercase">
              {type === "movie" ? "Runtime" : "Seasons"}
            </p>
            <RuntimeSeasonsDropdown
              min={runtimeSeasonsValues.min}
              max={runtimeSeasonsValues.max}
              onChange={(min, max) => {
                handleRuntimeSeasonsChange(min, max);
              }}
              type={type}
            />
          </section>
        </div>
      </div>
    </aside>
  );
}
