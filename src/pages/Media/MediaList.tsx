import { useEffect, useState } from "react";
import MediaCard from "../../components/MediaCard";
import { useMedia } from "../../contexts/MediaContext";
import { useLocation, useSearchParams } from "react-router";
import { getMediaType } from "../../utils/getMediaType";
import Loader from "../../components/Loader";
import { useFilters } from "../../hooks/useFilters";
import FilterSidebar from "../../components/Filters/FilterSidebar";
import { MoveLeft, MoveRight } from "lucide-react";

export default function MediaList() {
  const { results, searchMedia, loading, clearResults } = useMedia();
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

  //fetch some initial media on mount + reset filters and results on unmount
  useEffect(() => {
    searchMedia(query || "man", type, page);
    return () => {
      clearResults();
      resetFilters();
    };
  }, [searchMedia, type, clearResults, query, resetFilters, page]);

  useEffect(() => {
    setPage(1);
  }, [query, type]);

  function nextPage() {
    setPage((prev) => prev + 1);
  }

  function previousPage() {
    setPage((prev) => Math.max(prev - 1, 1));
  }

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
            <h1 className="mt-5 mb-5 text-4xl font-bold">
              Results for "{query}"
            </h1>
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
          </>
        )}

        {/* TODO: gotta improve pagination UX */}
        <div className="mt-8 flex items-center justify-between">
          {page > 1 && (
            <button
              onClick={() => previousPage()}
              className="hover:text-body-text flex items-center gap-2 text-sm font-bold text-neutral-400 uppercase transition-colors hover:cursor-pointer hover:underline"
            >
              <MoveLeft size={16} strokeWidth={2.5} />
              Previous page
            </button>
          )}

          <button
            onClick={() => nextPage()}
            className="hover:text-body-text ml-auto flex items-center gap-2 text-sm font-bold tracking-widest text-neutral-400 uppercase transition-colors hover:cursor-pointer hover:underline"
          >
            Next page
            <MoveRight size={16} strokeWidth={2.5} />
          </button>
        </div>
      </main>
      <div className="hidden w-72 shrink-0 xl:block" aria-hidden="true" />
    </div>
  );
}
