"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Bookmark, ExternalLink, Filter } from "lucide-react";
import type { WatchlistEntry, WatchlistStatus } from "@/types/media";
import { ProfileMovieCard } from "./ProfileMovieCard";

export interface CabinetWatchlistProps {
  entries: WatchlistEntry[];
}

export function CabinetWatchlist({ entries }: CabinetWatchlistProps) {
  const [selectedStatus, setSelectedStatus] = useState<WatchlistStatus | "all">(
    "all",
  );

  const counts = useMemo(() => {
    let plan = 0;
    let watched = 0;
    let favorite = 0;
    for (const e of entries) {
      if (e.status === "plan_to_watch") plan++;
      else if (e.status === "watched") watched++;
      else if (e.status === "favorite") favorite++;
    }
    return { all: entries.length, plan_to_watch: plan, watched, favorite };
  }, [entries]);

  const filteredEntries = useMemo(() => {
    if (selectedStatus === "all") return entries;
    return entries.filter((e) => e.status === selectedStatus);
  }, [entries, selectedStatus]);

  const statusOptions: Array<{
    id: WatchlistStatus | "all";
    label: string;
    count: number;
  }> = [
    { id: "all", label: "All Items", count: counts.all },
    {
      id: "plan_to_watch",
      label: "Plan to Watch",
      count: counts.plan_to_watch,
    },
    { id: "watched", label: "Watched", count: counts.watched },
    { id: "favorite", label: "Favorites", count: counts.favorite },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Top Filter Bar + Link to Full Watchlist */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-brand-surface border border-neutral-800 overflow-x-auto no-scrollbar w-full sm:w-auto">
          {statusOptions.map((opt) => {
            const isActive = selectedStatus === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedStatus(opt.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? "bg-brand-lime text-black shadow-xs"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-800/60"
                }`}
              >
                <span>{opt.label}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    isActive
                      ? "bg-black/20 text-black font-bold"
                      : "bg-neutral-800 text-neutral-400"
                  }`}
                >
                  {opt.count}
                </span>
              </button>
            );
          })}
        </div>

        <Link
          href="/watchlist"
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-xs text-neutral-300 hover:text-white transition-colors shrink-0"
        >
          <span>Advanced Filters & Search</span>
          <ExternalLink className="w-3 h-3 text-neutral-500" />
        </Link>
      </div>

      {/* Grid of Media */}
      {filteredEntries.length === 0 ? (
        <div className="bg-brand-surface border border-neutral-800/80 rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3">
          <Bookmark className="w-10 h-10 text-neutral-600" />
          <h3 className="text-base font-bold text-white">No items found</h3>
          <p className="text-xs text-neutral-400 max-w-sm">
            {selectedStatus === "all"
              ? "You haven't added any movies or series to your watchlist yet."
              : `You have no titles categorized under "${statusOptions.find((s) => s.id === selectedStatus)?.label}".`}
          </p>
          <Link
            href="/catalog"
            className="mt-2 px-4 py-2 rounded-xl bg-brand-lime text-black text-xs font-semibold hover:bg-brand-lime/90 transition-colors"
          >
            Explore Catalog
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
          {filteredEntries.map((item) => {
            if (!item.media) return null;
            return (
              <ProfileMovieCard
                key={item.id}
                media={item.media}
                watchlistStatus={item.status as WatchlistStatus}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
