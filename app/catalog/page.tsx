import { Suspense } from "react";
import { getMediaCatalog, getGenres } from "@/lib/api";
import MediaList from "@/components/MediaList";
import Loader from "@/components/Loader";
import CatalogFilters from "@/components/CatalogFilters";
import type { SortOption } from "@/types/media";

interface CatalogPageProps {
  searchParams: Promise<{
    search?: string;
    mediaType?: "all" | "movie" | "tv";
    genreId?: string;
    genres?: string;
    runtime?: string;
    seasons?: string;
    country?: string;
    budget?: string;
    ageRating?: string;
    minRating?: string;
    maxRating?: string;
    minYear?: string;
    maxYear?: string;
    sortBy?: SortOption;
    page?: string;
  }>;
}

function CatalogLoadingFallback({ search }: { search?: string }) {
  return (
    <div className="w-full flex flex-col items-center justify-center min-h-100 py-20">
      <Loader
        size="lg"
        text={search ? `Searching for "${search}"...` : "Loading catalog..."}
      />
    </div>
  );
}

async function CatalogContent({
  searchParams,
}: {
  searchParams: CatalogPageProps["searchParams"];
}) {
  const resolvedParams = await searchParams;
  const search = resolvedParams.search?.trim();
  const mediaType = resolvedParams.mediaType || "movie";
  const genreId = resolvedParams.genreId
    ? parseInt(resolvedParams.genreId, 10)
    : undefined;
  const genres = resolvedParams.genres
    ? resolvedParams.genres
        .split(",")
        .map((g) => decodeURIComponent(g).trim())
        .filter(Boolean)
    : undefined;
  const runtime = resolvedParams.runtime;
  const seasons = resolvedParams.seasons;
  const country = resolvedParams.country;
  const budget = resolvedParams.budget;
  const ageRating = resolvedParams.ageRating;
  const minRating = resolvedParams.minRating
    ? parseFloat(resolvedParams.minRating)
    : undefined;
  const maxRating = resolvedParams.maxRating
    ? parseFloat(resolvedParams.maxRating)
    : undefined;
  const minYear = resolvedParams.minYear
    ? parseInt(resolvedParams.minYear, 10)
    : undefined;
  const maxYear = resolvedParams.maxYear
    ? parseInt(resolvedParams.maxYear, 10)
    : undefined;
  const sortBy = resolvedParams.sortBy || "popularity";
  const page = resolvedParams.page ? parseInt(resolvedParams.page, 10) : 1;

  // Query catalog from Supabase
  const result = await getMediaCatalog({
    search,
    mediaType: mediaType === "all" ? undefined : mediaType,
    genreId,
    genres,
    runtime: mediaType === "tv" ? undefined : runtime,
    seasons: mediaType === "tv" ? seasons : undefined,
    country,
    budget: mediaType === "tv" ? undefined : budget,
    ageRating,
    minRating,
    maxRating,
    minYear,
    maxYear,
    sortBy,
    page,
    pageSize: 20,
  });

  const displayItems = result.items;

  // Title display
  const queryTitle = search ? `"${search}"` : undefined;

  return (
    <MediaList
      items={displayItems}
      totalFound={result.total || displayItems.length}
      queryTitle={queryTitle}
      searchQuery={search}
      currentPage={result.page}
      totalPages={result.totalPages}
      currentSort={sortBy}
    />
  );
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const resolvedParams = await searchParams;
  const suspenseKey = JSON.stringify(resolvedParams);
  const mediaType = resolvedParams.mediaType || "movie";

  const genresData = await getGenres(
    mediaType === "all" ? undefined : (mediaType as "movie" | "tv")
  );
  const availableGenres = genresData.map((g) => g.name);

  return (
    <div className="min-h-screen bg-black text-white px-4 sm:px-6 lg:px-10 py-8 sm:py-10">
      <div className="max-w-360 mx-auto flex flex-col lg:flex-row gap-8 lg:gap-10 items-start justify-center">
        <CatalogFilters
          genres={availableGenres}
          mediaType={mediaType as "movie" | "tv"}
        />
        <div className="flex-1 max-w-235 min-w-0 w-full">
          <Suspense
            key={suspenseKey}
            fallback={<CatalogLoadingFallback search={resolvedParams.search} />}
          >
            <CatalogContent searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
