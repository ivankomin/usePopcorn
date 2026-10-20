import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWatchlistWithFilters, getGenres } from "@/lib/api";
import Loader from "@/components/Loader";
import CatalogFilters from "@/components/CatalogFilters";
import WatchlistStatusTabs from "@/components/WatchlistStatusTabs";
import WatchlistMediaList from "@/components/WatchlistMediaList";
import type {
  WatchlistSortOption,
  WatchlistStatus,
} from "@/types/media";

export const instant = false;

interface WatchlistPageProps {
  searchParams: Promise<{
    status?: string;
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
    sortBy?: WatchlistSortOption;
    page?: string;
  }>;
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
  const status = (resolvedParams.status || "all") as WatchlistStatus | "all";
  const search = resolvedParams.search?.trim();
  const mediaType = resolvedParams.mediaType || "all";
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
  const sortBy = resolvedParams.sortBy || "added_desc";
  const page = resolvedParams.page ? parseInt(resolvedParams.page, 10) : 1;

  // Query watchlist from internal Supabase table
  const result = await getWatchlistWithFilters(
    {
      status,
      search,
      mediaType,
      genreId,
      genres,
      runtime: mediaType === "tv" ? undefined : runtime,
      seasons: mediaType === "movie" ? undefined : seasons,
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
    },
    user.id,
  );

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Top Status Tabs */}
      <WatchlistStatusTabs
        statusCounts={result.statusCounts}
        currentStatus={status}
      />

      <WatchlistMediaList
        items={result.items}
        totalFound={result.total}
        currentStatus={status}
        currentPage={result.page}
        totalPages={result.totalPages}
        currentSort={sortBy}
        searchQuery={search}
        hasAnyWatchlistItems={result.statusCounts.all > 0}
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
          mediaType={mediaType as "movie" | "tv"}
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
