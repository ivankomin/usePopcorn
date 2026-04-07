import GenresDropdown from "./GenresDropdown";
import type { Filter } from "../types/Filter";
import { ChevronDown } from "lucide-react";
import YearInput from "./YearInput";

interface FilterSidebarProps {
  filters: Filter;
  updateFilters: <K extends keyof Filter>(key: K, value: Filter[K]) => void;
  resetFilters: () => void;
}
export default function FilterSidebar({
  filters,
  updateFilters,
  resetFilters,
}: FilterSidebarProps) {
  //TODO: rework the runtime dropdown into separate component and style with radix ui, probably think some more on general styling of the sidebar as well
  return (
    <aside className="mt-30 w-72 shrink-0">
      <div className="bg-light-bg rounded-3xl border border-neutral-800/50 p-6 shadow-2xl">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-body-text text-xl font-bold tracking-tight">
            Filters
          </h2>
          <button
            onClick={() => resetFilters()}
            className="hover:text-body-text text-xs font-bold tracking-widest text-neutral-400 uppercase transition-colors hover:cursor-pointer hover:underline"
          >
            Clear all
          </button>
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
              Duration
            </p>
            <div className="relative">
              <select
                className="focus:border-accent w-full cursor-pointer appearance-none rounded-xl border border-neutral-800 bg-[#141414] px-4 py-2.5 text-sm text-neutral-300 transition-colors outline-none hover:border-neutral-700"
                onChange={(e) => {
                  const [min, max] = e.target.value.split("-").map(Number);
                  updateFilters("minRuntime", min);
                  updateFilters("maxRuntime", max || Infinity);
                }}
                value={`${filters.minRuntime}-${filters.maxRuntime || ""}`}
              >
                <option value="0-0">Any Runtime</option>
                <option value="0-60">Under 1 hour</option>
                <option value="60-120">1–2 hours</option>
                <option value="120-180">2–3 hours</option>
                <option value="180-">3+ hours</option>
              </select>
              <ChevronDown
                className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-neutral-500"
                size={16}
              />
            </div>
          </section>
        </div>
      </div>
    </aside>
  );
}
