"use client";

import { Tag } from "lucide-react";
import type { GenreRow } from "@/types/media";

export interface GenreSelectorFieldProps {
  genres: GenreRow[];
  selectedGenreIds: number[];
  isLocked: boolean;
  onToggleGenre: (genreId: number) => void;
}

export function GenreSelectorField({
  genres,
  selectedGenreIds,
  isLocked,
  onToggleGenre,
}: GenreSelectorFieldProps) {
  return (
    <div className="space-y-3">
      <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
        <Tag className="w-4 h-4 text-brand-lime" />
        Genres &amp; Categories
      </label>
      <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-2 bg-neutral-900/60 border border-neutral-800 rounded-xl">
        {genres.map((g) => {
          const isSelected = selectedGenreIds.includes(g.id);
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => onToggleGenre(g.id)}
              disabled={isLocked}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                isSelected
                  ? "bg-[#85c355] text-black shadow-xs font-bold"
                  : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white"
              } disabled:opacity-50`}
            >
              {g.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
