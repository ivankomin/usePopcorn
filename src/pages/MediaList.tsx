import { useEffect } from "react";
import MediaCard from "../components/MediaCard";
import { useMedia } from "../contexts/MediaContext";
import { useLocation, useSearchParams } from "react-router";
import { getMediaType } from "../utils/getMediaType";
import Loader from "../components/Loader";
import { useFilters } from "../hooks/useFilters";
import FilterSidebar from "../components/FilterSidebar";

export default function MediaList() {
  const { results, searchMedia, loading, clearResults } = useMedia();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const type = getMediaType(location.pathname);
  const query: string | null = searchParams.get("q");
  const { filters, filteredMedia, updateFilters } = useFilters(results, type);

  //fetch some initial media on mount
  useEffect(() => {
    searchMedia(query || "man", type);
    return () => {
      clearResults();
    };
  }, [searchMedia, type, clearResults, query]);

  return (
    //TODO: improve UI, add functional input fields, implement filtering logic
    <div className="flex w-full justify-between gap-10 p-8">
      <FilterSidebar filters={filters} updateFilters={updateFilters} />

      <main className="ml-50 max-w-6xl flex-1">
        <div className="mb-6">
          {query && (
            <h1 className="mt-5 mb-5 text-4xl font-bold">
              Results for "{query}"
            </h1>
          )}
        </div>

        {loading ? (
          <div className="flex h-[60vh] items-center justify-center">
            <Loader />
          </div>
        ) : (
          <>
            {/* Media Cards List */}
            <div className="flex flex-col gap-6">
              {filteredMedia.map((media) => (
                <MediaCard key={media.imdbID} media={media} />
              ))}
            </div>
          </>
        )}
      </main>
      <div className="hidden w-72 shrink-0 xl:block" aria-hidden="true" />
    </div>
  );
}
