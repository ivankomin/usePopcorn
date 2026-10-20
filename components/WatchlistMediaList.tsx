"use client";

import { useState } from "react";
import Link from "next/link";
import { Film } from "lucide-react";
import type { WatchlistEntry, WatchlistStatus } from "@/types/media";
import MediaCard from "./MediaCard";
import Pagination from "./Pagination";
import SortDropdown, { WATCHLIST_SORT_OPTIONS } from "./SortDropdown";
import ActiveFilterChips from "./ActiveFilterChips";
import Button from "./Button";

export interface WatchlistMediaListProps {
  items: WatchlistEntry[];
  totalFound: number;
  currentStatus?: WatchlistStatus | "all";
  currentPage?: number;
  totalPages?: number;
  currentSort?: string;
  searchQuery?: string;
  hasAnyWatchlistItems?: boolean;
}

export default function WatchlistMediaList({
  items,
  totalFound,
  currentStatus = "all",
  currentPage = 1,
  totalPages,
  currentSort = "added_desc",
  searchQuery,
  hasAnyWatchlistItems = true,
}: WatchlistMediaListProps) {
  // Local state to allow instant removal animation when unchecking items on /watchlist
  const [prevItems, setPrevItems] = useState(items);
  const [displayedItems, setDisplayedItems] = useState(items);

  // Sync state if server items prop changes (e.g., page navigation or filter change)
  if (prevItems !== items) {
    setPrevItems(items);
    setDisplayedItems(items);
  }

  const handleWatchlistToggle = (mediaId: string, inWatchlist: boolean) => {
    if (!inWatchlist) {
      setDisplayedItems((prev) =>
        prev.filter((e) => e.media_id !== mediaId && e.media?.id !== mediaId),
      );
    }
  };

  const getStatusLabel = () => {
    if (searchQuery) return `Results for "${searchQuery}"`;
    switch (currentStatus) {
      case "plan_to_watch":
        return "Plan to Watch";
      case "watched":
        return "Watched";
      case "favorite":
        return "Favorites";
      case "all":
      default:
        return "All Saved Titles";
    }
  };

  // 1. Completely empty watchlist (user has not saved anything at all yet)
  if (!hasAnyWatchlistItems) {
    return (
      <div className="w-full bg-[#181818] border border-neutral-800 rounded-3xl p-10 sm:p-16 text-center flex flex-col items-center justify-center my-4 shadow-xl">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 tracking-tight">
          Your watchlist is empty
        </h2>
        <p className="text-sm sm:text-base text-neutral-400 max-w-md mb-8 leading-relaxed">
          Explore thousands of movies and TV series, and click the plus icon to
          save titles you want to watch later.
        </p>
        <Button href="/catalog?mediaType=movie" size="lg">
          <Film className="w-4 h-4 mr-2 inline-block" />
          Browse Catalog
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col">
      {/* Header with Title & Sort */}
      <div className="mb-6 sm:mb-8 flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-baseline flex-wrap gap-2">
            <h1 className="text-2xl sm:text-3xl md:text-[32px] font-bold text-white tracking-tight leading-tight">
              {getStatusLabel()}
            </h1>
            <span className="text-neutral-400 font-normal italic text-lg sm:text-xl ml-1">
              ({totalFound} {totalFound === 1 ? "Item" : "Items"})
            </span>
          </div>

          <SortDropdown
            currentSort={currentSort}
            options={WATCHLIST_SORT_OPTIONS}
            defaultSort="added_desc"
          />
        </div>

        <ActiveFilterChips />
      </div>

      {/* Media Cards List */}
      {displayedItems.length > 0 ? (
        <div className="flex flex-col gap-5 sm:gap-6 w-full">
          {displayedItems.map((entry) => {
            if (!entry.media) return null;
            return (
              <MediaCard
                key={entry.id}
                media={entry.media}
                initialInWatchlist={true}
                onWatchlistToggle={handleWatchlistToggle}
              />
            );
          })}

          {totalPages !== undefined && totalPages > 1 && (
            <Pagination currentPage={currentPage} totalPages={totalPages} />
          )}
        </div>
      ) : (
        <div className="bg-[#181818] border border-neutral-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center my-6">
          <h2 className="text-xl font-bold text-white mb-2">No titles found</h2>
          <p className="text-sm text-neutral-400 max-w-md mb-6">
            No items in your watchlist match your selected filters or status
            category.
          </p>
          <Link
            href="/watchlist"
            className="px-5 py-2.5 rounded-md bg-brand-lime text-black font-semibold text-sm hover:bg-[#a8e63e] transition-colors"
          >
            Reset Watchlist Filters
          </Link>
        </div>
      )}
    </div>
  );
}
