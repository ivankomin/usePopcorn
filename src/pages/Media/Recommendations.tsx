import { useEffect, useState } from "react";
import MediaCard from "../../components/MediaCard";
import FilterSidebar from "../../components/Filters/FilterSidebar";
import Loader from "../../components/Loader";
import { useFilters } from "../../hooks/useFilters";
import { transformMedia } from "../../utils/transformMedia";
import { Sparkles, Zap } from "lucide-react";
import type { Media } from "../../types/Media";

const apiKey = import.meta.env.VITE_API_KEY;

// ABSOLUTE SLOP (look i feel bad but its just some quick static bs for demo purposes for FUCKING RGR GOLOVCHENKA kk?? >w<)
// Curated list of IDs for the "Recommendations" feel
const REC_IDS = ["tt0903747", "tt0468569", "tt1375666", "tt0816692", "tt0110912"];

export default function Recommendations() {
  const [rawRecs, setRawRecs] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Fetch full details for our curated list
  useEffect(() => {
    async function getRecommendations() {
      try {
        setLoading(true);
        const requests = REC_IDS.map((id) =>
          fetch(`https://www.omdbapi.com/?i=${id}&apikey=${apiKey}&plot=full`)
            .then((res) => res.json())
            .then((data) => (data.Response === "True" ? transformMedia(data) : null))
        );

        const results = (await Promise.all(requests)).filter(Boolean) as Media[];
        setRawRecs(results);
      } catch (err) {
        console.error("Failed to fetch recommendations:", err);
      } finally {
        setLoading(false);
      }
    }

    getRecommendations();
  }, []);

  // 2. Hook into your existing filter logic
  const {
    filters,
    filteredMedia,
    updateFilters,
    resetFilters,
    hasActiveFilters,
  } = useFilters(rawRecs, "movie");

  return (
    <div className="flex w-full justify-between gap-10 p-8">
      {/* Sidebar - Fully functional with the recommendation set */}
      <FilterSidebar
        filters={filters}
        updateFilters={updateFilters}
        resetFilters={resetFilters}
        hasActiveFilters={hasActiveFilters}
        type="movie"
      />

      <main className="ml-50 max-w-6xl flex-1">
        <div className="mb-10">
          <div className="flex items-center gap-3">
            <Sparkles className="text-accent" size={32} />
            <h1 className="mt-5 mb-5 text-4xl font-bold">
              Recommended <span className="text-accent">for You</span>
            </h1>
          </div>
          <p className="text-neutral-500 text-sm italic">
            Hand-picked cinematic masterpieces based on your taste.
          </p>
        </div>

        {loading ? (
          <div className="flex h-[60vh] items-center justify-center">
            <Loader />
          </div>
        ) : (
          <div className="flex flex-col gap-12">
            <section>
              <div className="mb-6 flex items-center gap-2 border-b border-neutral-800 pb-2">
                <Zap size={18} className="text-accent" />
                <h2 className="text-xs font-black tracking-widest text-neutral-400 uppercase">
                  Top Discoveries
                </h2>
              </div>
              
              <div className="flex flex-col gap-6">
                {filteredMedia.length > 0 ? (
                  filteredMedia.map((media) => (
                    <MediaCard key={media.imdbID} media={media} />
                  ))
                ) : (
                  <p className="py-10 text-center text-neutral-500">
                    No recommendations match your current filters.
                  </p>
                )}
              </div>
            </section>
          </div>
        )}
      </main>

      <div className="hidden w-72 shrink-0 xl:block" aria-hidden="true" />
    </div>
  );
}