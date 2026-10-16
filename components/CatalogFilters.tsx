"use client";

import { useState } from "react";
import { ChevronDown, SlidersHorizontal, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FilterDropdown,
  MultiSelectDropdown,
  RatingRangeSlider,
  FILTER_OPTIONS,
} from "@/components/filters";

export default function CatalogFilters() {
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [runtime, setRuntime] = useState("");
  const [country, setCountry] = useState("");
  const [budget, setBudget] = useState("");
  const [ageRating, setAgeRating] = useState("");
  const [minRating, setMinRating] = useState<number>(0.0);
  const [maxRating, setMaxRating] = useState<number>(10.0);
  const [decade, setDecade] = useState("");

  // Manage which dropdown is open so only one flyout is shown at a time
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Mobile collapse state
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleDropdown = (id: string) => {
    setOpenDropdown((prev) => (prev === id ? null : id));
  };

  const closeDropdown = () => {
    setOpenDropdown(null);
  };

  const hasActiveFilters =
    selectedGenres.length > 0 ||
    Boolean(runtime && runtime !== FILTER_OPTIONS.runtime[0]) ||
    Boolean(country && country !== FILTER_OPTIONS.country[0]) ||
    Boolean(budget && budget !== FILTER_OPTIONS.budget[0]) ||
    Boolean(ageRating && ageRating !== FILTER_OPTIONS.ageRating[0]) ||
    Boolean(decade && decade !== FILTER_OPTIONS.decade[0]) ||
    minRating > 0 ||
    maxRating < 10;

  const handleResetFilters = () => {
    setSelectedGenres([]);
    setRuntime("");
    setCountry("");
    setBudget("");
    setAgeRating("");
    setMinRating(0.0);
    setMaxRating(10.0);
    setDecade("");
    setOpenDropdown(null);
  };

  return (
    <aside className="w-full lg:w-64 xl:w-72 shrink-0 select-none lg:sticky lg:top-8 self-start lg:mt-18 z-30">
      <div className="lg:hidden mb-4">
        <button
          type="button"
          onClick={() => setIsMobileOpen((prev) => !prev)}
          className="w-full flex items-center justify-between px-4 py-3 bg-[#181818] border border-neutral-800 rounded-2xl text-white font-medium text-sm cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-brand-lime" />
            Filters
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-brand-lime" />
            )}
          </span>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-neutral-400 transition-transform",
              isMobileOpen && "rotate-180",
            )}
          />
        </button>
      </div>

      <div
        className={cn(
          "bg-[#181818] border border-neutral-800 rounded-3xl p-5 sm:p-6 flex flex-col gap-4 shadow-lg relative overflow-visible",
          "hidden lg:flex",
          isMobileOpen && "flex",
        )}
      >
        {/* Header */}
        <div className="relative flex items-center justify-center min-h-7">
          <h2 className="text-xl font-semibold text-white tracking-tight">
            Filters
          </h2>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="absolute right-0 flex items-center gap-1 text-xs text-neutral-400 hover:text-brand-lime transition-colors cursor-pointer"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>

        <MultiSelectDropdown
          id="genre"
          label="Genre"
          options={FILTER_OPTIONS.genre}
          selected={selectedGenres}
          onChange={setSelectedGenres}
          isOpen={openDropdown === "genre"}
          onToggle={() => toggleDropdown("genre")}
          onClose={closeDropdown}
          align="top"
        />

        <FilterDropdown
          id="runtime"
          label="Runtime"
          options={FILTER_OPTIONS.runtime}
          value={runtime}
          onChange={setRuntime}
          isOpen={openDropdown === "runtime"}
          onToggle={() => toggleDropdown("runtime")}
          onClose={closeDropdown}
          align="top"
        />

        <FilterDropdown
          id="country"
          label="Country"
          options={FILTER_OPTIONS.country}
          value={country}
          onChange={setCountry}
          isOpen={openDropdown === "country"}
          onToggle={() => toggleDropdown("country")}
          onClose={closeDropdown}
          align="top"
        />

        <FilterDropdown
          id="budget"
          label="Budget"
          options={FILTER_OPTIONS.budget}
          value={budget}
          onChange={setBudget}
          isOpen={openDropdown === "budget"}
          onToggle={() => toggleDropdown("budget")}
          onClose={closeDropdown}
          align="bottom"
        />

        <FilterDropdown
          id="ageRating"
          label="Age Rating"
          options={FILTER_OPTIONS.ageRating}
          value={ageRating}
          onChange={setAgeRating}
          isOpen={openDropdown === "ageRating"}
          onToggle={() => toggleDropdown("ageRating")}
          onClose={closeDropdown}
          align="bottom"
        />

        <RatingRangeSlider
          minRating={minRating}
          maxRating={maxRating}
          onMinRatingChange={setMinRating}
          onMaxRatingChange={setMaxRating}
        />
        <FilterDropdown
          id="decade"
          label="Decade"
          options={FILTER_OPTIONS.decade}
          value={decade}
          onChange={setDecade}
          isOpen={openDropdown === "decade"}
          onToggle={() => toggleDropdown("decade")}
          onClose={closeDropdown}
          align="bottom"
        />
      </div>
    </aside>
  );
}
