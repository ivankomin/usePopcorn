import { useState } from "react";
import type { Media } from "../types/Media";
import type { Filter } from "../types/Filter";

const defaultFilters: Filter = {
  minRating: 0,
  maxRating: 10,
  minYear: 1900,
  maxYear: 2026,
  minRuntime: 0,
  maxRuntime: 300,
  genres: [],
};

export function useFilters(media: Media[], type: string) {
  const [filters, setFilters] = useState<Filter>(defaultFilters);

  function updateFilters<K extends keyof Filter>(key: K, value: Filter[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function resetFilters() {
    setFilters(defaultFilters);
  }

  const filteredMedia = media.filter((m) => {
    if (m.type !== type) return false;
    if (m.imdbRating < filters.minRating) return false;
    if (m.imdbRating > filters.maxRating) return false;
    if (Number(m.year.replace(/\D+$/, "")) < filters.minYear) return false;
    if (Number(m.year.replace(/\D+$/, "")) > filters.maxYear) return false;
    if (m.runtime < filters.minRuntime) return false;
    if (m.runtime > filters.maxRuntime) return false;

    if (
      filters.genres.length > 0 &&
      !filters.genres.every((g) => m.genres.includes(g))
    )
      return false;
    return true;
  });

  return {
    filters,
    filteredMedia,
    updateFilters,
    resetFilters,
  };
}
