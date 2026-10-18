"use client";

import { useState, useEffect, useTransition, useCallback, Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, SlidersHorizontal, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FilterDropdown,
  MultiSelectDropdown,
  RatingRangeSlider,
  YearRangeInput,
  FILTER_OPTIONS,
} from "@/components/filters";

export interface CatalogFiltersProps {
  genres?: string[];
}

function CatalogFiltersInner({ genres: initialGenres }: CatalogFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const genreOptions =
    initialGenres && initialGenres.length > 0
      ? initialGenres
      : FILTER_OPTIONS.genre;

  // Helper to parse searchParams genres
  const getInitialGenres = () => {
    const raw = searchParams.get("genres");
    if (!raw) return [];
    return raw
      .split(",")
      .map((g) => decodeURIComponent(g).trim())
      .filter(Boolean);
  };

  const [selectedGenres, setSelectedGenres] = useState<string[]>(getInitialGenres);
  const [runtime, setRuntime] = useState<string>(
    () => searchParams.get("runtime") || ""
  );
  const [country, setCountry] = useState<string>(
    () => searchParams.get("country") || ""
  );
  const [budget, setBudget] = useState<string>(
    () => searchParams.get("budget") || ""
  );
  const [ageRating, setAgeRating] = useState<string>(
    () => searchParams.get("ageRating") || ""
  );
  const [minRating, setMinRating] = useState<number>(() =>
    searchParams.has("minRating")
      ? parseFloat(searchParams.get("minRating")!)
      : 0.0
  );
  const [maxRating, setMaxRating] = useState<number>(() =>
    searchParams.has("maxRating")
      ? parseFloat(searchParams.get("maxRating")!)
      : 10.0
  );
  const [minYear, setMinYear] = useState<number>(() =>
    searchParams.has("minYear")
      ? parseInt(searchParams.get("minYear")!, 10)
      : 1900
  );
  const [maxYear, setMaxYear] = useState<number>(() =>
    searchParams.has("maxYear")
      ? parseInt(searchParams.get("maxYear")!, 10)
      : 2026
  );

  // Manage which dropdown is open so only one flyout is shown at a time
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Mobile collapse state
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Synchronize state with searchParams when external navigation occurs
  useEffect(() => {
    const rawGenres = searchParams.get("genres");
    const parsedGenres = rawGenres
      ? rawGenres
          .split(",")
          .map((g) => decodeURIComponent(g).trim())
          .filter(Boolean)
      : [];
    setSelectedGenres(parsedGenres);
    setRuntime(searchParams.get("runtime") || "");
    setCountry(searchParams.get("country") || "");
    setBudget(searchParams.get("budget") || "");
    setAgeRating(searchParams.get("ageRating") || "");
    setMinRating(
      searchParams.has("minRating")
        ? parseFloat(searchParams.get("minRating")!)
        : 0.0
    );
    setMaxRating(
      searchParams.has("maxRating")
        ? parseFloat(searchParams.get("maxRating")!)
        : 10.0
    );
    setMinYear(
      searchParams.has("minYear")
        ? parseInt(searchParams.get("minYear")!, 10)
        : 1900
    );
    setMaxYear(
      searchParams.has("maxYear")
        ? parseInt(searchParams.get("maxYear")!, 10)
        : 2026
    );
  }, [searchParams]);

  const applyFilters = useCallback(
    (
      updates: Partial<{
        genres: string[];
        runtime: string;
        country: string;
        budget: string;
        ageRating: string;
        minRating: number;
        maxRating: number;
        minYear: number;
        maxYear: number;
      }>
    ) => {
      const params = new URLSearchParams(searchParams.toString());

      const nextGenres =
        updates.genres !== undefined ? updates.genres : selectedGenres;
      const nextRuntime =
        updates.runtime !== undefined ? updates.runtime : runtime;
      const nextCountry =
        updates.country !== undefined ? updates.country : country;
      const nextBudget =
        updates.budget !== undefined ? updates.budget : budget;
      const nextAgeRating =
        updates.ageRating !== undefined ? updates.ageRating : ageRating;
      const nextMinRating =
        updates.minRating !== undefined ? updates.minRating : minRating;
      const nextMaxRating =
        updates.maxRating !== undefined ? updates.maxRating : maxRating;
      const nextMinYear =
        updates.minYear !== undefined ? updates.minYear : minYear;
      const nextMaxYear =
        updates.maxYear !== undefined ? updates.maxYear : maxYear;

      // 1. Genres
      if (nextGenres.length > 0) {
        params.set("genres", nextGenres.join(","));
        params.delete("genreId");
      } else {
        params.delete("genres");
        params.delete("genreId");
      }

      // 2. Runtime
      if (nextRuntime && nextRuntime !== FILTER_OPTIONS.runtime[0]) {
        params.set("runtime", nextRuntime);
      } else {
        params.delete("runtime");
      }

      // 3. Country
      if (nextCountry && nextCountry !== FILTER_OPTIONS.country[0]) {
        params.set("country", nextCountry);
      } else {
        params.delete("country");
      }

      // 4. Budget
      if (nextBudget && nextBudget !== FILTER_OPTIONS.budget[0]) {
        params.set("budget", nextBudget);
      } else {
        params.delete("budget");
      }

      // 5. Age Rating
      if (nextAgeRating && nextAgeRating !== FILTER_OPTIONS.ageRating[0]) {
        params.set("ageRating", nextAgeRating);
      } else {
        params.delete("ageRating");
      }

      // 6. Rating Range
      if (nextMinRating > 0) {
        params.set("minRating", nextMinRating.toFixed(1));
      } else {
        params.delete("minRating");
      }
      if (nextMaxRating < 10) {
        params.set("maxRating", nextMaxRating.toFixed(1));
      } else {
        params.delete("maxRating");
      }

      // 7. Year Range
      if (nextMinYear > 1900) {
        params.set("minYear", nextMinYear.toString());
      } else {
        params.delete("minYear");
      }
      if (nextMaxYear < 2026) {
        params.set("maxYear", nextMaxYear.toString());
      } else {
        params.delete("maxYear");
      }

      // Reset to page 1 upon changing filters
      params.delete("page");

      const queryString = params.toString();
      const target = queryString ? `${pathname}?${queryString}` : pathname;
      startTransition(() => {
        router.push(target);
      });
    },
    [
      searchParams,
      selectedGenres,
      runtime,
      country,
      budget,
      ageRating,
      minRating,
      maxRating,
      minYear,
      maxYear,
      pathname,
      router,
    ]
  );

  // Debounced sync for rating range sliders
  useEffect(() => {
    const currentMinParam = searchParams.has("minRating")
      ? parseFloat(searchParams.get("minRating")!)
      : 0.0;
    const currentMaxParam = searchParams.has("maxRating")
      ? parseFloat(searchParams.get("maxRating")!)
      : 10.0;

    if (
      Math.abs(currentMinParam - minRating) < 0.05 &&
      Math.abs(currentMaxParam - maxRating) < 0.05
    ) {
      return;
    }

    const timer = setTimeout(() => {
      applyFilters({ minRating, maxRating });
    }, 400);

    return () => clearTimeout(timer);
  }, [minRating, maxRating, applyFilters, searchParams]);

  const toggleDropdown = (id: string) => {
    setOpenDropdown((prev) => (prev === id ? null : id));
  };

  const closeDropdown = () => {
    setOpenDropdown(null);
  };

  const handleGenresChange = (genres: string[]) => {
    setSelectedGenres(genres);
    applyFilters({ genres });
  };

  const handleRuntimeChange = (val: string) => {
    setRuntime(val);
    applyFilters({ runtime: val });
  };

  const handleCountryChange = (val: string) => {
    setCountry(val);
    applyFilters({ country: val });
  };

  const handleBudgetChange = (val: string) => {
    setBudget(val);
    applyFilters({ budget: val });
  };

  const handleAgeRatingChange = (val: string) => {
    setAgeRating(val);
    applyFilters({ ageRating: val });
  };

  const handleMinYearChange = (val: number) => {
    setMinYear(val);
    applyFilters({ minYear: val });
  };

  const handleMaxYearChange = (val: number) => {
    setMaxYear(val);
    applyFilters({ maxYear: val });
  };

  const hasActiveFilters =
    selectedGenres.length > 0 ||
    Boolean(runtime && runtime !== FILTER_OPTIONS.runtime[0]) ||
    Boolean(country && country !== FILTER_OPTIONS.country[0]) ||
    Boolean(budget && budget !== FILTER_OPTIONS.budget[0]) ||
    Boolean(ageRating && ageRating !== FILTER_OPTIONS.ageRating[0]) ||
    minYear !== 1900 ||
    maxYear !== 2026 ||
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
    setMinYear(1900);
    setMaxYear(2026);
    setOpenDropdown(null);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("genres");
    params.delete("genreId");
    params.delete("runtime");
    params.delete("country");
    params.delete("budget");
    params.delete("ageRating");
    params.delete("minRating");
    params.delete("maxRating");
    params.delete("minYear");
    params.delete("maxYear");
    params.delete("page");

    const queryString = params.toString();
    const target = queryString ? `${pathname}?${queryString}` : pathname;
    startTransition(() => {
      router.push(target);
    });
  };

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
              isMobileOpen && "rotate-180"
            )}
          />
        </button>
      </div>

      {/* Main Filter Sidebar Box */}
      <div
        className={cn(
          "bg-[#181818] border border-neutral-800 rounded-3xl p-5 sm:p-6 flex flex-col gap-4 shadow-lg relative overflow-visible",
          "hidden lg:flex",
          isMobileOpen && "flex"
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

        {/* Rating Range Sliders (Min Rating & Max Rating) */}
        <RatingRangeSlider
          minRating={minRating}
          maxRating={maxRating}
          onMinRatingChange={setMinRating}
          onMaxRatingChange={setMaxRating}
        />

        {/* Year Range Inputs (Min Year & Max Year) */}
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
