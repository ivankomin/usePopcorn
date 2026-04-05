import { useEffect } from "react";
import MediaCard from "../components/MediaCard";
import { useMedia } from "../contexts/MediaContext";
import { useLocation, useSearchParams } from "react-router";
import { getMediaType } from "../utils/getMediaType";
import Loader from "../components/Loader";
import { ChevronDown, X } from "lucide-react";
import { useFilters } from "../hooks/useFilters";

function FilterTag({ label, color, textColor = "text-white" }) {
  return (
    <div
      className={`${color} ${textColor} flex items-center gap-2 rounded-md px-3 py-1 text-xs font-bold tracking-wider uppercase`}
    >
      {label}
      <X size={14} className="cursor-pointer opacity-70 hover:opacity-100" />
    </div>
  );
}

export default function MediaList() {
  const { results, searchMedia, loading, clearResults } = useMedia();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const type = getMediaType(location.pathname);
  const query: string | null = searchParams.get("q");
  const { filters, filteredMedia, updateFilters, resetFilters } = useFilters(
    results,
    type,
  );

  //fetch some initial media on mount
  useEffect(() => {
    searchMedia(query || "man", type);
    return () => {
      clearResults();
    };
  }, [searchMedia, type, clearResults, query]);

  return (
    <div className="flex w-full justify-between gap-10 p-8">
      {/* --- SIDEBAR FILTERS --- */}
      <aside className="mt-30 w-72 shrink-0">
        <div className="bg-light-bg rounded-2xl border border-neutral-800/50 p-6 shadow-xl">
          <h2 className="mb-6 text-center text-xl font-medium text-neutral-200">
            Filters
          </h2>

          <div className="flex flex-col gap-5">
            {/* Reusable Filter Dropdown Style */}
            {["Genre", "Runtime", "Country", "Budget", "Age Rating"].map(
              (filter) => (
                <div key={filter} className="relative">
                  <select className="w-full appearance-none rounded-xl border border-neutral-700 bg-transparent px-4 py-2.5 text-sm text-neutral-400 transition-colors outline-none focus:border-neutral-500">
                    <option>{filter}</option>
                  </select>
                  <ChevronDown
                    className="absolute top-1/2 right-4 -translate-y-1/2 text-neutral-500"
                    size={16}
                  />
                </div>
              ),
            )}

            {/* IMDb Rating Slider */}
            <div className="mt-2 px-1">
              <p className="mb-4 text-center text-sm font-medium text-neutral-300">
                IMDb Rating
              </p>
              <div className="flex items-center gap-4">
                <span className="text-xs text-neutral-500">0</span>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.1"
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-neutral-700 accent-[#b4f44d]"
                />
                <span className="text-xs text-neutral-500">5</span>
              </div>
              {/* The dynamic value bubble like in the image */}
              <div className="mt-2 flex justify-center">
                <span className="rounded bg-[#b4f44d] px-2 py-0.5 text-xs font-bold text-black">
                  4
                </span>
              </div>
            </div>

            <div className="relative">
              <select className="w-full appearance-none rounded-xl border border-neutral-700 bg-transparent px-4 py-2.5 text-sm text-neutral-400 outline-none">
                <option>Decade</option>
              </select>
              <ChevronDown
                className="absolute top-1/2 right-4 -translate-y-1/2 text-neutral-500"
                size={16}
              />
            </div>
          </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="ml-50 max-w-6xl flex-1">
        {/* Results Header: Keep visible so user knows what's loading */}
        <div className="mb-6">
          {query && (
            <h1 className="mt-5 mb-5 text-4xl font-bold">
              Results for "{query}"
            </h1>
          )}
        </div>

        {/* 2. Conditional Loading Logic inside the Main Area */}
        {loading ? (
          <div className="flex h-[60vh] items-center justify-center">
            <Loader />
          </div>
        ) : (
          <>
            {/* Active Filter Tags */}
            <div className="mb-8 flex items-center justify-between">
              <div className="flex flex-wrap gap-3">
                <FilterTag
                  label="IMDB: 4-5"
                  color="bg-[#b4f44d]"
                  textColor="text-black"
                />
                <FilterTag label="ACTION" color="bg-[#5c7cfa]" />
                <FilterTag label="DRAMA" color="bg-[#5c7cfa]" />
                <FilterTag
                  label="2-3 HRS"
                  color="bg-[#fcc419]"
                  textColor="text-black"
                />
              </div>
              <button className="text-sm text-neutral-400 underline decoration-neutral-600 underline-offset-4 transition-colors hover:text-white">
                Clear all filters
              </button>
            </div>

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
