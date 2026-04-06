import GenresDropdown from "./GenresDropdown";
import type { Filter } from "../hooks/useFilters";

interface FilterSidebarProps {
  filters: Filter;
  updateFilters: <K extends keyof Filter>(key: K, value: Filter[K]) => void;
}
export default function FilterSidebar({
  filters,
  updateFilters,
}: FilterSidebarProps) {
  return (
    <aside className="mt-30 w-72 shrink-0">
      <div className="bg-light-bg rounded-2xl border border-neutral-800/50 p-6 shadow-xl">
        <h2 className="mb-6 text-center text-xl font-medium text-neutral-200">
          Filters
        </h2>
        <div className="custom-scrollbar flex max-h-64 flex-col gap-2 overflow-y-auto pr-2">
          <GenresDropdown
            selected={filters.genres}
            onChange={(genres) => updateFilters("genres", genres)}
          />
        </div>
      </div>
    </aside>
  );
}
