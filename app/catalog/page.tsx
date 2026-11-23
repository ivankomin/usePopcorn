import { Suspense } from "react";
import { connection } from "next/server";
import { getMediaCatalog, getGenres } from "@/lib/api";
import {
  parseMediaFilterParams,
  type RawMediaFilterSearchParams,
} from "@/lib/filters";
import MediaList from "@/components/MediaList";
import Loader from "@/components/Loader";
import CatalogFilters from "@/components/CatalogFilters";
import type { SortOption } from "@/types/media";

interface CatalogPageProps {
  searchParams: Promise<
    RawMediaFilterSearchParams & {
      sortBy?: SortOption;
    }
  >;
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
  const parsed = parseMediaFilterParams(resolvedParams, "movie");
  const sortBy = resolvedParams.sortBy || "popularity";

  const result = await getMediaCatalog({
    search: parsed.search,
    mediaType: parsed.mediaType === "all" ? undefined : parsed.mediaType,
    genreId: parsed.genreId,
    genres: parsed.genres,
    runtime: parsed.mediaType === "tv" ? undefined : parsed.runtime,
    seasons: parsed.mediaType === "tv" ? parsed.seasons : undefined,
    country: parsed.country,
    budget: parsed.mediaType === "tv" ? undefined : parsed.budget,
    ageRating: parsed.ageRating,
    minRating: parsed.minRating,
    maxRating: parsed.maxRating,
    minYear: parsed.minYear,
    maxYear: parsed.maxYear,
    sortBy,
    page: parsed.page,
    pageSize: 20,
  });

  const displayItems = result.items;
  const queryTitle = parsed.search ? `"${parsed.search}"` : undefined;

  return (
    <MediaList
      items={displayItems}
      totalFound={result.total || displayItems.length}
      queryTitle={queryTitle}
      searchQuery={parsed.search}
      currentPage={result.page}
      totalPages={result.totalPages}
      currentSort={sortBy}
    />
  );
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  await connection();
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
