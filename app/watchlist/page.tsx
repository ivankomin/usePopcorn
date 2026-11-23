import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import {
  getWatchlistWithFilters,
  getGenres,
  getUserCollectionsWithMedia,
  filterCollectionItems,
} from "@/lib/api";
import {
  parseMediaFilterParams,
  type RawMediaFilterSearchParams,
} from "@/lib/filters";
import Loader from "@/components/Loader";
import CatalogFilters from "@/components/CatalogFilters";
import WatchlistMediaList from "@/components/WatchlistMediaList";
import type { WatchlistSortOption, WatchlistStatus } from "@/types/media";

export const metadata: Metadata = {
  title: "My Watchlist - usePopcorn",
  description: "View and manage your watchlist and custom lists on usePopcorn.",
};

export const instant = false;

interface WatchlistPageProps {
  searchParams: Promise<
    RawMediaFilterSearchParams & {
      status?: string;
      collection?: string;
      sortBy?: WatchlistSortOption;
    }
  >;
}

function WatchlistLoadingFallback() {
  return (
    <div className="w-full flex flex-col items-center justify-center min-h-100 py-20">
      <Loader size="lg" text="Loading your watchlist..." />
    </div>
  );
}

async function WatchlistContent({
  searchParams,
}: {
  searchParams: WatchlistPageProps["searchParams"];
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/watchlist");
  }

  const resolvedParams = await searchParams;
  const parsed = parseMediaFilterParams(resolvedParams, "all");
  const status = (resolvedParams.status || "all") as WatchlistStatus | "all";
  const sortBy = resolvedParams.sortBy || "added_desc";
  const collectionIdParam = resolvedParams.collection?.trim() || null;

  const filterParams = {
    status,
    search: parsed.search,
    mediaType: parsed.mediaType,
    genreId: parsed.genreId,
    genres: parsed.genres,
    runtime: parsed.mediaType === "tv" ? undefined : parsed.runtime,
    seasons: parsed.mediaType === "movie" ? undefined : parsed.seasons,
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
  };

  const [watchlistResult, collections] = await Promise.all([
    getWatchlistWithFilters(filterParams, user.id),
    getUserCollectionsWithMedia(user.id),
  ]);

  const activeCollection = collectionIdParam
    ? collections.find((c) => c.id === collectionIdParam) ?? null
    : null;

  const filteredCollection = activeCollection
    ? filterCollectionItems(activeCollection, filterParams)
    : null;

  return (
    <div className="flex flex-col gap-6 w-full">
      <WatchlistMediaList
        items={watchlistResult.items}
        totalFound={
          filteredCollection ? filteredCollection.total : watchlistResult.total
        }
        statusCounts={watchlistResult.statusCounts}
        currentStatus={status}
        currentPage={
          filteredCollection ? filteredCollection.page : watchlistResult.page
        }
        totalPages={
          filteredCollection
            ? filteredCollection.totalPages
            : watchlistResult.totalPages
        }
        currentSort={sortBy}
        searchQuery={parsed.search}
        hasAnyWatchlistItems={watchlistResult.statusCounts.all > 0}
        collections={collections}
        activeCollection={activeCollection}
        collectionItems={filteredCollection?.items ?? []}
      />
    </div>
  );
}

export default async function WatchlistPage({
  searchParams,
}: WatchlistPageProps) {
  await connection();
  const resolvedParams = await searchParams;
  const suspenseKey = JSON.stringify(resolvedParams);
  const mediaType = resolvedParams.mediaType || "all";

  const genresData = await getGenres(
    mediaType === "all" ? undefined : (mediaType as "movie" | "tv"),
  );
  const availableGenres = genresData.map((g) => g.name);

  return (
    <div className="min-h-screen bg-black text-white px-4 sm:px-6 lg:px-10 py-8 sm:py-10">
      <div className="max-w-360 mx-auto flex flex-col lg:flex-row gap-8 lg:gap-10 items-start justify-center">
        {/* Filters Sidebar */}
        <CatalogFilters
          genres={availableGenres}
          mediaType={mediaType as "all" | "movie" | "tv"}
          showMediaTypeFilter={true}
        />

        {/* Main List Area */}
        <div className="flex-1 max-w-235 min-w-0 w-full">
          <Suspense key={suspenseKey} fallback={<WatchlistLoadingFallback />}>
            <WatchlistContent searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
