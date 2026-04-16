import MediaCard from "../../components/MediaCard";
import Loader from "../../components/Loader";
import FilterSidebar from "../../components/Filters/FilterSidebar";
import Pagination from "../../components/Layout/Pagination";
import { useMedialist } from "../../hooks/useMedialist";

export default function MediaList() {
  const {
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
  } = useMedialist();

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
