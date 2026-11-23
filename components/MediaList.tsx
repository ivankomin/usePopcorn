"use client";

import Link from "next/link";
import type { MediaItem } from "@/types/media";
import { useI18n } from "@/hooks/useI18n";
import MediaCard from "./MediaCard";
import Pagination from "./Pagination";
import SortDropdown from "./SortDropdown";
import ActiveFilterChips from "./ActiveFilterChips";

export interface MediaListProps {
  items: MediaItem[];
  totalFound?: number;
  searchQuery?: string;
  currentPage?: number;
  totalPages?: number;
  currentSort?: string;
}

export default function MediaList({
  items,
  totalFound,
  searchQuery,
  currentPage = 1,
  totalPages,
  currentSort,
}: MediaListProps) {
  const { t } = useI18n();
  const count = totalFound !== undefined ? totalFound : items.length;
  const query = searchQuery?.trim();

  return (
    <div className="w-full flex flex-col">
      <div className="mb-6 sm:mb-8 flex flex-col gap-2">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-baseline flex-wrap gap-2">
            <h1 className="text-2xl sm:text-3xl md:text-[32px] font-bold text-white tracking-tight leading-tight">
              {query ? (
                <>
                  {t("catalog.resultsFor")}{" "}
                  <span className="text-white">
                    {query.startsWith('"') ? query : `"${query}"`}
                  </span>
                </>
              ) : (
                t("catalog.browseTitle")
              )}
            </h1>
            <span className="text-neutral-400 font-normal italic text-lg sm:text-xl ml-1">
              {query && `(${t("catalog.found", { count })})`}
            </span>
          </div>

          <SortDropdown currentSort={currentSort} />
        </div>

        <ActiveFilterChips />
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
          <h2 className="text-xl font-bold text-white mb-2">
            {t("catalog.noMediaTitle")}
          </h2>
          <p className="text-sm text-neutral-400 max-w-md mb-6">
            {t("catalog.noMediaDescription")}
          </p>
          <Link
            href="/catalog"
            className="px-5 py-2.5 rounded-md bg-brand-lime text-black font-semibold text-sm hover:bg-[#a8e63e] transition-colors"
          >
            {t("catalog.resetFilters")}
          </Link>
        </div>
      )}
    </div>
  );
}
