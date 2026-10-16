import { Suspense } from "react";
import { getMediaCatalog } from "@/lib/api";
import MediaList from "@/components/MediaList";

interface CatalogPageProps {
  searchParams: Promise<{
    search?: string;
    mediaType?: "all" | "movie" | "tv";
    genreId?: string;
    sortBy?: "popularity" | "vote_average" | "release_year" | "title";
    page?: string;
  }>;
}

function CatalogLoadingSkeleton() {
  return (
    <div className="w-full flex flex-col gap-6 animate-pulse">
      <div className="h-8 w-64 bg-neutral-800 rounded-md mb-2" />
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-48 w-full bg-[#181818] border border-neutral-800 rounded-2xl"
        />
      ))}
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
  const sortBy = resolvedParams.sortBy || "popularity";
  const page = resolvedParams.page ? parseInt(resolvedParams.page, 10) : 1;

  // Query catalog from Supabase
  const result = await getMediaCatalog({
    search,
    mediaType: mediaType === "all" ? undefined : mediaType,
    genreId,
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
    />
  );
}

export default function CatalogPage({ searchParams }: CatalogPageProps) {
  return (
    <div className="min-h-screen bg-black text-white px-4 sm:px-8 lg:px-12 py-8 sm:py-10">
      <div className="max-w-360 mx-auto flex flex-col items-center">
        <div className="w-full max-w-235">
          <Suspense fallback={<CatalogLoadingSkeleton />}>
            <CatalogContent searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
