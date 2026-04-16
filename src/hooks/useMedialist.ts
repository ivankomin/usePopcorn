import { useEffect, useState } from "react";
import { useFilters } from "./useFilters";
import { getMediaType } from "../utils/getMediaType";
import { useLocation, useSearchParams } from "react-router";
import { useMedia } from "../contexts/MediaContext";

export function useMedialist() {
  const { results, searchMedia, loading, clearResults, totalResults } =
    useMedia();
  const location = useLocation();
  const [page, setPage] = useState(1);

  const [searchParams] = useSearchParams();
  const type = getMediaType(location.pathname);
  const query: string | null = searchParams.get("q");
  const {
    filters,
    filteredMedia,
    updateFilters,
    resetFilters,
    hasActiveFilters,
  } = useFilters(results, type);

  const totalPages = Math.ceil(totalResults / 10);

  //fetch some initial media on mount + reset filters and results on unmount
  useEffect(() => {
    searchMedia(query || "man", type, page);
    return () => {
      clearResults();
      // the omdb api limitations strike again, since each page only has 10 results
      // which is why persisting filters between pages makes for very poor ux. unfortunate.
      resetFilters();
    };
  }, [searchMedia, type, clearResults, query, page, resetFilters]);

  useEffect(() => {
    setPage(1);
  }, [query, type]);

  return {
    filters,
    filteredMedia,
    updateFilters,
    resetFilters,
    hasActiveFilters,
    type,
    query,
    totalResults,
    totalPages,
    page,
    setPage,
    loading,
  };
}
