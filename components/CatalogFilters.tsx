"use client";

import { Suspense } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FilterDropdown,
  MultiSelectDropdown,
  RatingRangeSlider,
  YearRangeInput,
  FILTER_OPTIONS,
} from "@/components/filters";
import { useCatalogFilters } from "@/hooks";

export interface CatalogFiltersProps {
  genres?: string[];
}

function CatalogFiltersInner({ genres }: CatalogFiltersProps) {
  const {
    genreOptions,
    selectedGenres,
    runtime,
    country,
    budget,
    ageRating,
    minRating,
    maxRating,
    minYear,
    maxYear,
    openDropdown,
    isMobileOpen,
    setIsMobileOpen,
    hasActiveFilters,
    setMinRating,
    setMaxRating,
    toggleDropdown,
    closeDropdown,
    handleGenresChange,
    handleRuntimeChange,
    handleCountryChange,
    handleBudgetChange,
    handleAgeRatingChange,
    handleMinYearChange,
    handleMaxYearChange,
  } = useCatalogFilters({ genres });

  return (
    <aside className="w-full lg:w-64 xl:w-72 shrink-0 select-none lg:sticky lg:top-8 self-start lg:mt-18 z-30">
      {/* Mobile Toggle Button */}
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

      {/* Main Filter Sidebar Box */}
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
        </div>

        {/* 1. Genre (Multi-select) */}
        <MultiSelectDropdown
          id="genre"
          label="Genre"
          options={genreOptions}
          selected={selectedGenres}
          onChange={handleGenresChange}
          isOpen={openDropdown === "genre"}
          onToggle={() => toggleDropdown("genre")}
          onClose={closeDropdown}
          align="top"
        />

        {/* 2. Runtime */}
        <FilterDropdown
          id="runtime"
          label="Runtime"
          options={FILTER_OPTIONS.runtime}
          value={runtime}
          onChange={handleRuntimeChange}
          isOpen={openDropdown === "runtime"}
          onToggle={() => toggleDropdown("runtime")}
          onClose={closeDropdown}
          align="top"
        />

        {/* 3. Country */}
        <FilterDropdown
          id="country"
          label="Country"
          options={FILTER_OPTIONS.country}
          value={country}
          onChange={handleCountryChange}
          isOpen={openDropdown === "country"}
          onToggle={() => toggleDropdown("country")}
          onClose={closeDropdown}
          align="top"
        />

        {/* 4. Budget */}
        <FilterDropdown
          id="budget"
          label="Budget"
          options={FILTER_OPTIONS.budget}
          value={budget}
          onChange={handleBudgetChange}
          isOpen={openDropdown === "budget"}
          onToggle={() => toggleDropdown("budget")}
          onClose={closeDropdown}
          align="bottom"
        />

        {/* 5. Age Rating */}
        <FilterDropdown
          id="ageRating"
          label="Age Rating"
          options={FILTER_OPTIONS.ageRating}
          value={ageRating}
          onChange={handleAgeRatingChange}
          isOpen={openDropdown === "ageRating"}
          onToggle={() => toggleDropdown("ageRating")}
          onClose={closeDropdown}
          align="bottom"
        />

        {/* 6. Rating Range Sliders (Min Rating & Max Rating) */}
        <RatingRangeSlider
          minRating={minRating}
          maxRating={maxRating}
          onMinRatingChange={setMinRating}
          onMaxRatingChange={setMaxRating}
        />

        {/* 7. Year Range Inputs (Min Year & Max Year) */}
        <YearRangeInput
          minYear={minYear}
          maxYear={maxYear}
          onMinYearChange={handleMinYearChange}
          onMaxYearChange={handleMaxYearChange}
        />
      </div>
    </aside>
  );
}

function CatalogFiltersFallback() {
  return (
    <aside className="w-full lg:w-64 xl:w-72 shrink-0 select-none lg:sticky lg:top-8 self-start lg:mt-18 z-30">
      <div className="bg-[#181818] border border-neutral-800 rounded-3xl p-5 sm:p-6 flex flex-col gap-4 shadow-lg min-h-125 animate-pulse" />
    </aside>
  );
}

export default function CatalogFilters(props: CatalogFiltersProps = {}) {
  return (
    <Suspense fallback={<CatalogFiltersFallback />}>
      <CatalogFiltersInner {...props} />
    </Suspense>
  );
}
