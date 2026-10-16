import Link from "next/link";
import type { MediaItem } from "@/types/media";
import MediaCard from "./MediaCard";
import Pagination from "./Pagination";

export interface FilterChip {
  id: string;
  label: string;
  variant: "lime" | "blue" | "yellow";
}

export interface MediaListProps {
  items: MediaItem[];
  totalFound?: number;
  queryTitle?: string;
  searchQuery?: string;
  filterChips?: FilterChip[];
  showClearButton?: boolean;
  onClear?: () => void;
  currentPage?: number;
  totalPages?: number;
}

export default function MediaList({
  items,
  totalFound,
  queryTitle,
  searchQuery,
  showClearButton = true,
  onClear,
  currentPage = 1,
  totalPages,
}: MediaListProps) {
  const count = totalFound !== undefined ? totalFound : items.length;
  const query = (searchQuery || queryTitle)?.trim();

  return (
    <div className="w-full flex flex-col">
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
          <div className="flex items-baseline flex-wrap gap-2">
            <h1 className="text-2xl sm:text-3xl md:text-[32px] font-bold text-white tracking-tight">
              {query ? (
                <>
                  Results for:{" "}
                  <span className="text-white">
                    {query.startsWith('"') ? query : `"${query}"`}
                  </span>
                </>
              ) : (
                "Browse the catalog"
              )}
            </h1>
            <span className="text-neutral-400 font-normal italic text-lg sm:text-xl ml-1">
              {query && `(${count} Found)`}
            </span>
          </div>

          {showClearButton &&
            (onClear ? (
              <button
                type="button"
                onClick={onClear}
                className="text-xs sm:text-sm text-neutral-300 hover:text-white underline underline-offset-4 cursor-pointer transition-colors"
              >
                Clear all filters
              </button>
            ) : (
              <Link
                href="/catalog"
                className="text-xs sm:text-sm text-neutral-300 hover:text-white underline underline-offset-4 cursor-pointer transition-colors"
              >
                Clear all filters
              </Link>
            ))}
        </div>
      </div>

      {items.length > 0 ? (
        <div className="flex flex-col gap-5 sm:gap-6 w-full">
          {items.map((item) => (
            <MediaCard key={item.id} media={item} />
          ))}

          {totalPages !== undefined && totalPages > 1 && (
            <Pagination currentPage={currentPage} totalPages={totalPages} />
          )}
        </div>
      ) : (
        <div className="bg-[#181818] border border-neutral-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center my-8">
          <span className="text-4xl mb-3">🍿</span>
          <h2 className="text-xl font-bold text-white mb-2">No media found</h2>
          <p className="text-sm text-neutral-400 max-w-md mb-6">
            We couldn&apos;t find any movies or TV series matching your query.
            Try adjusting your search or clearing active filters.
          </p>
          <Link
            href="/catalog"
            className="px-5 py-2.5 rounded-md bg-brand-lime text-black font-semibold text-sm hover:bg-[#a8e63e] transition-colors"
          >
            Reset Filters
          </Link>
        </div>
      )}
    </div>
  );
}
