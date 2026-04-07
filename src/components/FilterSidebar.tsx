import GenresDropdown from "./GenresDropdown";
import type { Filter } from "../types/Filter";

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
  return (
    <aside className="mt-30 w-72 shrink-0">
      <div className="bg-light-bg rounded-2xl border border-neutral-800/50 p-6 shadow-xl">
        <div className="flex items-baseline justify-between">
          <h2 className="mb-6 text-center text-xl font-medium text-neutral-200">
            Filters
          </h2>
          <button
            onClick={() => resetFilters()}
            className="text-[15px] text-neutral-400 transition-colors hover:cursor-pointer hover:text-neutral-300 hover:underline"
          >
            Clear all
          </button>
        </div>

        <div className="custom-scrollbar flex max-h-64 flex-col gap-2 overflow-y-auto pr-2">
          <GenresDropdown
            selected={filters.genres}
            onChange={(genres) => updateFilters("genres", genres)}
          />
        </div>

        <div className="mt-2 flex items-center justify-between">
          <div>
            <p className="text-neutral-500">Min Year</p>

            <input
              type="number"
              min="1900"
              defaultValue={1900}
              max={new Date().getFullYear()}
              value={filters.minYear}
              onChange={(e) =>
                updateFilters("minYear", parseInt(e.target.value) || 0)
              }
            />
          </div>

          <div>
            <p className="text-neutral-500">Max Year</p>
            <input
              type="number"
              min="1900"
              defaultValue={new Date().getFullYear()}
              max={new Date().getFullYear()}
              value={filters.maxYear}
              onChange={(e) =>
                updateFilters("maxYear", parseInt(e.target.value) || 0)
              }
            />
          </div>
        </div>

        <p className="my-2 text-base text-neutral-400">Min Rating (0-10)</p>
        <div className="flex justify-between">
          <input
            type="range"
            min="0"
            max="10"
            step="0.1"
            value={filters.minRating}
            onChange={(e) =>
              updateFilters("minRating", parseFloat(e.target.value))
            }
          />
  
          <span className="ml-2">{filters.minRating.toFixed(1)}</span>
        </div>

        <p className="mb-2 block text-base text-neutral-400">
          Max Rating (0-10)
        </p>

        <div className="flex justify-between">
          <input
            type="range"
            min="0"
            max="10"
            step="0.1"
            value={filters.maxRating}
            onChange={(e) =>
              updateFilters("maxRating", parseFloat(e.target.value))
            }
          />
          <span className="ml-2">{filters.maxRating.toFixed(1)}</span>
        </div>

        <p className="my-2 text-base text-neutral-400">Runtime</p>
        <select
          onChange={(e) => {
            const [min, max] = e.target.value.split("-").map(Number);
            updateFilters("minRuntime", min);
            updateFilters("maxRuntime", max || Infinity);
          }}
          value={`${filters.minRuntime}-${filters.maxRuntime || ""}`}
        >
          <option value="0-0">Any</option>
          <option value="0-60">Under 1 hour</option>
          <option value="60-120">1–2 hours</option>
          <option value="120-180">2–3 hours</option>
          <option value="180-">3+ hours</option>
        </select>
      </div>
    </aside>
  );
}
