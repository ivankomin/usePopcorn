"use client";

import { useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import type { MediaItem } from "@/types/media";
import MediaCard from "./MediaCard";

export interface FilterChip {
  id: string;
  label: string;
  variant: "lime" | "blue" | "yellow";
}

export interface MediaCardListProps {
  items: MediaItem[];
  totalFound?: number;
  queryTitle?: string;
  filterChips?: FilterChip[];
}

export default function MediaCardList({
  items,
  totalFound,
  queryTitle = "Movies",
  filterChips = [],
}: MediaCardListProps) {
  const [chips, setChips] = useState<FilterChip[]>(filterChips);
  const count = totalFound !== undefined ? totalFound : items.length;

  const handleRemoveChip = (chipId: string) => {
    setChips((prev) => prev.filter((c) => c.id !== chipId));
  };

  const handleClearAllChips = () => {
    setChips([]);
  };

  return (
    <div className="w-full flex flex-col">
      <div className="mb-6 sm:mb-8">
        <div className="flex items-baseline flex-wrap gap-2 mb-4">
          <h1 className="text-2xl sm:text-3xl md:text-[32px] font-bold text-white tracking-tight">
            Results for:{" "}
            <span className="text-white">{queryTitle}</span>
          </h1>
          <span className="text-neutral-400 font-normal italic text-lg sm:text-xl ml-1">
            ({count} Found)
          </span>
        </div>

        {chips.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2.5">
              {chips.map((chip) => {
                let badgeStyle = "bg-[#b9f84d] text-black";
                if (chip.variant === "blue") {
                  badgeStyle = "bg-[#6b8afd] text-black";
                } else if (chip.variant === "yellow") {
                  badgeStyle = "bg-[#e2dc7b] text-black";
                }

                return (
                  <span
                    key={chip.id}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs sm:text-sm font-semibold tracking-wide shadow-sm select-none transition-transform hover:scale-102 ${badgeStyle}`}
                  >
                    <span>{chip.label}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveChip(chip.id)}
                      className="cursor-pointer hover:opacity-75 transition-opacity"
                      aria-label={`Remove filter ${chip.label}`}
                    >
                      <X className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </span>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleClearAllChips}
              className="text-xs sm:text-sm text-neutral-300 hover:text-white underline underline-offset-4 cursor-pointer transition-colors"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {items.length > 0 ? (
        <div className="flex flex-col gap-5 sm:gap-6 w-full">
          {items.map((item) => (
            <MediaCard key={item.id} media={item} />
          ))}
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
