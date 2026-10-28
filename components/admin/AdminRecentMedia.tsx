"use client";

import Link from "next/link";
import Image from "next/image";
import { Film, Tv, Star, Calendar, ExternalLink } from "lucide-react";
import type { MediaItemRow } from "@/types/media";

export interface AdminRecentMediaProps {
  items: MediaItemRow[];
}

export function AdminRecentMedia({ items }: AdminRecentMediaProps) {
  if (!items || items.length === 0) {
    return (
      <div className="bg-brand-surface border border-neutral-800 rounded-2xl p-6 text-center text-xs text-neutral-400">
        No recent media items found.
      </div>
    );
  }

  return (
    <div className="bg-brand-surface border border-neutral-800 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center justify-between pb-4 border-b border-neutral-800/80 mb-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <span>Recently Added Catalog Records</span>
        </h3>
      </div>

      <div className="divide-y divide-neutral-800/60">
        {items.map((item) => {
          const isMovie = item.media_type === "movie";
          const posterUrl = item.poster_path
            ? item.poster_path.startsWith("http")
              ? item.poster_path
              : `https://image.tmdb.org/t/p/w200${item.poster_path}`
            : null;

          return (
            <div
              key={item.id}
              className="py-3 flex items-center justify-between gap-4 hover:bg-neutral-900/40 px-2 rounded-xl transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-14 relative bg-neutral-900 rounded-md overflow-hidden shrink-0 border border-neutral-800">
                  {posterUrl ? (
                    <Image
                      src={posterUrl}
                      alt={item.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-600">
                      {isMovie ? (
                        <Film className="w-4 h-4" />
                      ) : (
                        <Tv className="w-4 h-4" />
                      )}
                    </div>
                  )}
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-sm truncate">
                      {item.title}
                    </span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                      {item.media_type}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-neutral-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-neutral-500" />
                      {item.release_year}
                    </span>
                    {item.vote_average !== null && item.vote_average > 0 && (
                      <span className="flex items-center gap-1 text-amber-400 font-semibold">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        {item.vote_average.toFixed(1)}
                      </span>
                    )}
                    {item.budget_category && (
                      <span className="text-[11px] font-mono text-brand-lime">
                        {item.budget_category}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <Link
                href={`/movie/${item.id}`}
                className="shrink-0 p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
                title="View in Catalog"
              >
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
