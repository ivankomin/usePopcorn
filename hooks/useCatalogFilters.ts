"use client";

import { useState, useTransition, useCallback, useMemo, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { FILTER_OPTIONS } from "@/components/filters";

export interface UseCatalogFiltersOptions {
  genres?: string[];
  mediaType?: "all" | "movie" | "tv";
}

export function useCatalogFilters(options: UseCatalogFiltersOptions = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const urlMediaType = searchParams.get("mediaType") as
    | "all"
    | "movie"
    | "tv"
    | null;
  const defaultMediaType = pathname.startsWith("/catalog") ? "movie" : "all";
  const mediaType = urlMediaType || options.mediaType || defaultMediaType;

  const isTV = mediaType === "tv";
  const isMovie = mediaType === "movie";
  const isAll = mediaType === "all";

  const genreOptions =
    options.genres && options.genres.length > 0
      ? options.genres
      : FILTER_OPTIONS.genre;

  const ageRatingOptions = isTV
    ? FILTER_OPTIONS.ageRatingTV
    : isMovie
      ? FILTER_OPTIONS.ageRatingMovie
      : FILTER_OPTIONS.ageRatingAll;

  // 1. Derive discrete filter values directly from the URL (single source of truth)
  const selectedGenres = useMemo(() => {
    const raw = searchParams.get("genres");
    if (!raw) return [];
    return raw
      .split(",")
      .map((g) => decodeURIComponent(g).trim())
      .filter(Boolean);
  }, [searchParams]);

  const runtime = searchParams.get("runtime") || "";
  const seasons = searchParams.get("seasons") || "";
  const country = searchParams.get("country") || "";
  const budget = searchParams.get("budget") || "";
  const ageRating = searchParams.get("ageRating") || "";

  const minYear = searchParams.has("minYear")
    ? parseInt(searchParams.get("minYear")!, 10)
    : 1900;
  const maxYear = searchParams.has("maxYear")
    ? parseInt(searchParams.get("maxYear")!, 10)
    : 2026;

  const urlMinRating = searchParams.has("minRating")
    ? parseFloat(searchParams.get("minRating")!)
    : 0.0;
  const urlMaxRating = searchParams.has("maxRating")
    ? parseFloat(searchParams.get("maxRating")!)
    : 10.0;

  // 2. Local state for smooth real-time slider dragging
  const [prevUrlRating, setPrevUrlRating] = useState({
    min: urlMinRating,
    max: urlMaxRating,
  });
  const [sliderMinRating, setSliderMinRating] = useState(urlMinRating);
  const [sliderMaxRating, setSliderMaxRating] = useState(urlMaxRating);

  // Sync slider state during render when URL params change externally (e.g. Back/Forward/Reset)
  if (
    prevUrlRating.min !== urlMinRating ||
    prevUrlRating.max !== urlMaxRating
  ) {
    setPrevUrlRating({ min: urlMinRating, max: urlMaxRating });
    setSliderMinRating(urlMinRating);
    setSliderMaxRating(urlMaxRating);
  }

  // 3. Dropdown popup & mobile accordion state
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const applyFilters = useCallback(
    (
      updates: Partial<{
        genres: string[];
        runtime: string;
        seasons: string;
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
      const nextSeasons =
        updates.seasons !== undefined ? updates.seasons : seasons;
      const nextCountry =
        updates.country !== undefined ? updates.country : country;
      const nextBudget =
        updates.budget !== undefined ? updates.budget : budget;
      const nextAgeRating =
        updates.ageRating !== undefined ? updates.ageRating : ageRating;
      const nextMinRating =
        updates.minRating !== undefined ? updates.minRating : sliderMinRating;
      const nextMaxRating =
        updates.maxRating !== undefined ? updates.maxRating : sliderMaxRating;
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

      // 2. Runtime (Movies) vs Seasons (TV)
      if (isTV) {
        params.delete("runtime");
        if (nextSeasons && nextSeasons !== FILTER_OPTIONS.seasons[0]) {
          params.set("seasons", nextSeasons);
        } else {
          params.delete("seasons");
        }
      } else {
        params.delete("seasons");
        if (nextRuntime && nextRuntime !== FILTER_OPTIONS.runtime[0]) {
          params.set("runtime", nextRuntime);
        } else {
          params.delete("runtime");
        }
      }

      // 3. Country
      if (nextCountry && nextCountry !== FILTER_OPTIONS.country[0]) {
        params.set("country", nextCountry);
      } else {
        params.delete("country");
      }

      // 4. Budget (Movies only)
      if (!isTV && nextBudget && nextBudget !== FILTER_OPTIONS.budget[0]) {
        params.set("budget", nextBudget);
      } else {
        params.delete("budget");
      }

      // 5. Age Rating
      if (nextAgeRating && nextAgeRating !== ageRatingOptions[0]) {
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
      seasons,
      country,
      budget,
      ageRating,
      sliderMinRating,
      sliderMaxRating,
      minYear,
      maxYear,
      isTV,
      ageRatingOptions,
      pathname,
      router,
    ]
  );

  // Debounced sync for rating range sliders
  useEffect(() => {
    if (
      Math.abs(urlMinRating - sliderMinRating) < 0.05 &&
      Math.abs(urlMaxRating - sliderMaxRating) < 0.05
    ) {
      return;
    }

    const timer = setTimeout(() => {
      applyFilters({ minRating: sliderMinRating, maxRating: sliderMaxRating });
    }, 400);

    return () => clearTimeout(timer);
  }, [sliderMinRating, sliderMaxRating, applyFilters, urlMinRating, urlMaxRating]);

  const toggleDropdown = (id: string) => {
    setOpenDropdown((prev) => (prev === id ? null : id));
  };

  const closeDropdown = () => {
    setOpenDropdown(null);
  };

  const handleGenresChange = (genres: string[]) => {
    applyFilters({ genres });
  };

  const handleRuntimeChange = (val: string) => {
    applyFilters({ runtime: val });
  };

  const handleSeasonsChange = (val: string) => {
    applyFilters({ seasons: val });
  };

  const handleCountryChange = (val: string) => {
    applyFilters({ country: val });
  };

  const handleBudgetChange = (val: string) => {
    applyFilters({ budget: val });
  };

  const handleAgeRatingChange = (val: string) => {
    applyFilters({ ageRating: val });
  };

  const handleMinYearChange = (val: number) => {
    applyFilters({ minYear: val });
  };

  const handleMaxYearChange = (val: number) => {
    applyFilters({ maxYear: val });
  };

  const handleMediaTypeChange = useCallback(
    (newType: "all" | "movie" | "tv") => {
      const params = new URLSearchParams(searchParams.toString());
      if (newType === "all") {
        if (pathname.startsWith("/watchlist")) {
          params.delete("mediaType");
        } else {
          params.set("mediaType", "all");
        }
      } else {
        params.set("mediaType", newType);
      }

      // Clear incompatible filters when switching specific types
      if (newType === "tv") {
        params.delete("runtime");
        params.delete("budget");
      } else if (newType === "movie") {
        params.delete("seasons");
      }

      params.delete("page");
      const query = params.toString();
      const target = query ? `${pathname}?${query}` : pathname;
      startTransition(() => {
        router.push(target);
      });
    },
    [searchParams, pathname, router],
  );

  const hasActiveFilters =
    selectedGenres.length > 0 ||
    Boolean(seasons && seasons !== FILTER_OPTIONS.seasons[0]) ||
    Boolean(runtime && runtime !== FILTER_OPTIONS.runtime[0]) ||
    Boolean(country && country !== FILTER_OPTIONS.country[0]) ||
    Boolean(budget && budget !== FILTER_OPTIONS.budget[0]) ||
    Boolean(ageRating && ageRating !== ageRatingOptions[0]) ||
    minYear !== 1900 ||
    maxYear !== 2026 ||
    urlMinRating > 0 ||
    urlMaxRating < 10 ||
    sliderMinRating > 0 ||
    sliderMaxRating < 10;

  // Sync the current catalog URL and filters to sessionStorage so navigating back from media details restores filters
  useEffect(() => {
    if (typeof window !== "undefined" && pathname.startsWith("/catalog")) {
      try {
        const currentUrl = window.location.pathname + window.location.search;
        sessionStorage.setItem("last_catalog_url", currentUrl);
        if (isTV) {
          sessionStorage.setItem("last_tv_catalog_url", currentUrl);
        } else if (isMovie) {
          sessionStorage.setItem("last_movie_catalog_url", currentUrl);
        }
      } catch {
        // Ignore sessionStorage errors
      }
    }
  }, [pathname, searchParams, isTV, isMovie]);

  return {
    isTV,
    isMovie,
    isAll,
    currentMediaType: mediaType,
    handleMediaTypeChange,
    genreOptions,
    selectedGenres,
    runtime,
    seasons,
    country,
    budget,
    ageRating,
    ageRatingOptions,
    minRating: sliderMinRating,
    maxRating: sliderMaxRating,
    minYear,
    maxYear,
    openDropdown,
    isMobileOpen,
    setIsMobileOpen,
    hasActiveFilters,
    setMinRating: setSliderMinRating,
    setMaxRating: setSliderMaxRating,
    toggleDropdown,
    closeDropdown,
    handleGenresChange,
    handleRuntimeChange,
    handleSeasonsChange,
    handleCountryChange,
    handleBudgetChange,
    handleAgeRatingChange,
    handleMinYearChange,
    handleMaxYearChange,
  };
}
