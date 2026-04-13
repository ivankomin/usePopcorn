import { useEffect, useState } from "react";
import MediaCard from "../../components/MediaCard";
import { useMedia } from "../../contexts/MediaContext";
import { useLocation, useSearchParams } from "react-router";
import { getMediaType } from "../../utils/getMediaType";
import Loader from "../../components/Loader";
import { useFilters } from "../../hooks/useFilters";
import FilterSidebar from "../../components/Filters/FilterSidebar";
import Pagination from "../../components/Layout/Pagination";

export default function MediaList() {
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

  return (
    <div className="flex w-full justify-between gap-10 p-8">
      <FilterSidebar
        filters={filters}
        updateFilters={updateFilters}
        resetFilters={resetFilters}
        hasActiveFilters={hasActiveFilters}
        type={type}
      />

      <main className="ml-50 max-w-6xl flex-1">
        <div className="mb-6">
          {query ? (
            <div className="flex items-baseline gap-5">
              <h1 className="mt-5 mb-5 text-4xl font-bold">
                Results for "{query}"
              </h1>
              <span className="text-2xl text-gray-500 italic">
                ({totalResults} found)
              </span>
            </div>
          ) : (
            <h1 className="mt-5 mb-5 text-4xl font-bold">
              Search for your favorite {type === "movie" ? "movies" : "series"}{" "}
              here!
            </h1>
          )}
        </div>

        {loading ? (
          <div className="flex h-[60vh] items-center justify-center">
            <Loader />
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-6">
              {filteredMedia.map((media) => (
                <MediaCard key={media.imdbID} media={media} />
              ))}
            </div>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </>
        )}
      </main>
      <div className="hidden w-72 shrink-0 xl:block" aria-hidden="true" />
    </div>
  );
}
