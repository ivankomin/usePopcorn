"use client";

import { useTransition, Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ChipVariant = "lime" | "blue" | "yellow" | "purple" | "orange" | "neutral";

export interface ActiveChipItem {
  id: string;
  label: string;
  variant: ChipVariant;
  onRemove: () => void;
}

const VARIANT_STYLES: Record<ChipVariant, string> = {
  lime: "bg-[#bbf451] text-black hover:bg-[#a5db42]",
  blue: "bg-[#7b9bf9] text-black hover:bg-[#6a8ce6]",
  yellow: "bg-[#eed562] text-black hover:bg-[#dbc24d]",
  purple: "bg-[#c084fc] text-black hover:bg-[#a855f7]",
  orange: "bg-[#fb923c] text-black hover:bg-[#f97316]",
  neutral: "bg-neutral-800 text-neutral-200 border border-neutral-700 hover:bg-neutral-700",
};

function ActiveFilterChipsInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const updateUrl = (params: URLSearchParams) => {
    // Always reset page to 1 on filter modifications
    params.delete("page");
    const query = params.toString();
    const target = query ? `${pathname}?${query}` : pathname;
    startTransition(() => {
      router.push(target);
    });
  };

  const chips: ActiveChipItem[] = [];

  // 0. Search Query
  const searchQuery = searchParams.get("search");
  if (searchQuery && searchQuery.trim()) {
    chips.push({
      id: "search",
      label: `SEARCH: "${searchQuery.trim()}"`,
      variant: "lime",
      onRemove: () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("search");
        updateUrl(params);
      },
    });
  }

  // 0.5 Media Type (when on watchlist and specific type is chosen)
  const mediaType = searchParams.get("mediaType");
  if (pathname.startsWith("/watchlist") && mediaType && mediaType !== "all") {
    chips.push({
      id: "mediaType",
      label: `TYPE: ${mediaType === "tv" ? "SERIES" : "MOVIES"}`,
      variant: "yellow",
      onRemove: () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("mediaType");
        updateUrl(params);
      },
    });
  }

  // 1. Genres (Multi-select)
  const rawGenres = searchParams.get("genres");
  if (rawGenres) {
    const genresList = rawGenres
      .split(",")
      .map((g) => decodeURIComponent(g).trim())
      .filter(Boolean);

    genresList.forEach((genre) => {
      chips.push({
        id: `genre-${genre}`,
        label: genre.toUpperCase(),
        variant: "blue",
        onRemove: () => {
          const params = new URLSearchParams(searchParams.toString());
          const remaining = genresList.filter((g) => g !== genre);
          if (remaining.length > 0) {
            params.set("genres", remaining.join(","));
          } else {
            params.delete("genres");
          }
          params.delete("genreId");
          updateUrl(params);
        },
      });
    });
  }

  // 2. Seasons (TV Series)
  const seasons = searchParams.get("seasons");
  if (seasons && seasons !== "All Seasons") {
    chips.push({
      id: "seasons",
      label: seasons.toUpperCase(),
      variant: "yellow",
      onRemove: () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("seasons");
        updateUrl(params);
      },
    });
  }

  // 3. Runtime (Movies)
  const runtime = searchParams.get("runtime");
  if (runtime && runtime !== "All Runtimes") {
    chips.push({
      id: "runtime",
      label: runtime.toUpperCase(),
      variant: "yellow",
      onRemove: () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("runtime");
        updateUrl(params);
      },
    });
  }

  // 4. Country
  const country = searchParams.get("country");
  if (country && country !== "All Countries") {
    chips.push({
      id: "country",
      label: `COUNTRY: ${country.toUpperCase()}`,
      variant: "purple",
      onRemove: () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("country");
        updateUrl(params);
      },
    });
  }

  // 5. Budget (Movies)
  const budget = searchParams.get("budget");
  if (budget && budget !== "All Budgets") {
    chips.push({
      id: "budget",
      label: `BUDGET: ${budget.toUpperCase()}`,
      variant: "orange",
      onRemove: () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("budget");
        updateUrl(params);
      },
    });
  }

  // 6. Age Rating
  const ageRating = searchParams.get("ageRating");
  if (ageRating && ageRating !== "All Age Ratings" && ageRating !== "All Ratings") {
    chips.push({
      id: "ageRating",
      label: `AGE: ${ageRating.toUpperCase()}`,
      variant: "purple",
      onRemove: () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("ageRating");
        updateUrl(params);
      },
    });
  }

  // 7. Rating Range (IMDb)
  const minRating = searchParams.has("minRating")
    ? parseFloat(searchParams.get("minRating")!)
    : undefined;
  const maxRating = searchParams.has("maxRating")
    ? parseFloat(searchParams.get("maxRating")!)
    : undefined;

  if (minRating !== undefined || maxRating !== undefined) {
    let label = "IMDb";
    if (minRating !== undefined && maxRating !== undefined) {
      label = `IMDB: ${minRating.toFixed(1)}-${maxRating.toFixed(1)}`;
    } else if (minRating !== undefined) {
      label = `IMDB: ≥ ${minRating.toFixed(1)}`;
    } else if (maxRating !== undefined) {
      label = `IMDB: ≤ ${maxRating.toFixed(1)}`;
    }

    chips.push({
      id: "rating",
      label,
      variant: "lime",
      onRemove: () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("minRating");
        params.delete("maxRating");
        updateUrl(params);
      },
    });
  }

  // 8. Year Range
  const minYear = searchParams.has("minYear")
    ? parseInt(searchParams.get("minYear")!, 10)
    : undefined;
  const maxYear = searchParams.has("maxYear")
    ? parseInt(searchParams.get("maxYear")!, 10)
    : undefined;

  if (minYear !== undefined || maxYear !== undefined) {
    let label = "YEAR";
    if (minYear !== undefined && maxYear !== undefined) {
      label = `YEAR: ${minYear}-${maxYear}`;
    } else if (minYear !== undefined) {
      label = `YEAR: ≥ ${minYear}`;
    } else if (maxYear !== undefined) {
      label = `YEAR: ≤ ${maxYear}`;
    }

    chips.push({
      id: "year",
      label,
      variant: "neutral",
      onRemove: () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("minYear");
        params.delete("maxYear");
        updateUrl(params);
      },
    });
  }

  // If no active filters, render nothing so it takes up zero space
  if (chips.length === 0) {
    return null;
  }

  const handleClearAll = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("search");
    if (pathname.startsWith("/watchlist")) {
      params.delete("mediaType");
    }
    params.delete("genres");
    params.delete("genreId");
    params.delete("seasons");
    params.delete("runtime");
    params.delete("country");
    params.delete("budget");
    params.delete("ageRating");
    params.delete("minRating");
    params.delete("maxRating");
    params.delete("minYear");
    params.delete("maxYear");
    updateUrl(params);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 pb-1 w-full animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center gap-2">
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={chip.onRemove}
            className={cn(
              "group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all shadow-sm cursor-pointer",
              VARIANT_STYLES[chip.variant]
            )}
            title={`Remove filter: ${chip.label}`}
          >
            <span>{chip.label}</span>
            <X className="w-3.5 h-3.5 stroke-[2.5] opacity-70 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={handleClearAll}
        className="text-xs sm:text-sm text-neutral-400 hover:text-white underline underline-offset-4 decoration-neutral-600 hover:decoration-white transition-colors cursor-pointer shrink-0 ml-auto"
      >
        Clear all filters
      </button>
    </div>
  );
}

export default function ActiveFilterChips() {
  return (
    <Suspense fallback={null}>
      <ActiveFilterChipsInner />
    </Suspense>
  );
}
