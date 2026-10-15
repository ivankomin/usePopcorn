import { Suspense } from "react";
import { getMediaCatalog } from "@/lib/api";
import MediaCardList, { FilterChip } from "@/components/MediaCardList";

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
      <div className="flex gap-2 mb-6">
        <div className="h-7 w-24 bg-neutral-800 rounded-md" />
        <div className="h-7 w-20 bg-neutral-800 rounded-md" />
        <div className="h-7 w-20 bg-neutral-800 rounded-md" />
      </div>
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
  const queryTitle = search
    ? `"${search}"`
    : mediaType === "tv"
      ? "Series"
      : "Movies";

  // Filter chips matching the Figma screenshot
  const initialChips: FilterChip[] = [
    { id: "imdb", label: "IMDb: 4–5", variant: "lime" },
    { id: "action", label: "ACTION", variant: "blue" },
    { id: "drama", label: "DRAMA", variant: "blue" },
    { id: "runtime", label: "2–3 HRS", variant: "yellow" },
  ];

  return (
    <MediaCardList
      items={displayItems}
      totalFound={result.total || displayItems.length}
      queryTitle={queryTitle}
      filterChips={initialChips}
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
