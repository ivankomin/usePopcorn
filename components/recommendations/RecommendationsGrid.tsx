"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Compass } from "lucide-react";
import Button from "@/components/Button";
import type { RecommendedMediaItem } from "@/types/media";
import { RecommendationCard } from "./RecommendationCard";

interface RecommendationsGridProps {
  items: RecommendedMediaItem[];
  mediaType: "all" | "movie" | "tv";
  autoRefreshOnInteraction?: boolean;
}

export function RecommendationsGrid({
  items,
  mediaType,
  autoRefreshOnInteraction = false,
}: RecommendationsGridProps) {
  const router = useRouter();
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [isRefreshing, startRefreshing] = useTransition();

  const handleRefresh = () => {
    startRefreshing(() => {
      setHasPendingChanges(false);
      router.refresh();
    });
  };

  const handleUserInteraction = () => {
    if (autoRefreshOnInteraction) {
      startRefreshing(() => {
        router.refresh();
      });
    } else {
      setHasPendingChanges(true);
    }
  };

  if (items.length === 0) {
    return (
      <div className="bg-[#181818] border border-neutral-800 rounded-2xl p-10 text-center flex flex-col items-center gap-4">
        <p className="text-lg font-semibold text-white">
          You&apos;ve already explored all{" "}
          {mediaType === "movie"
            ? "movies"
            : mediaType === "tv"
              ? "series"
              : "titles"}{" "}
          in this category!
        </p>
        <p className="text-sm text-neutral-400 max-w-md">
          Try switching the filter tab above or browse the full catalog to
          revisit your favorites.
        </p>
        <Button href="/catalog" size="md">
          <span className="inline-flex items-center gap-2">
            <Compass className="w-4 h-4" />
            Explore Catalog
          </span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {hasPendingChanges && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-brand-lime/10 rounded-xl px-4 py-3 text-sm">
          <span className="text-neutral-200">
            Your preferences were updated. Refresh to recalculate your
            recommendations.
          </span>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-brand-lime text-black font-semibold text-xs hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-60 shrink-0"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span>{isRefreshing ? "Updating..." : "Refresh Now"}</span>
          </button>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {items.map((item) => (
          <RecommendationCard
            key={item.media.id}
            item={item}
            onUserInteraction={handleUserInteraction}
          />
        ))}
      </div>
    </div>
  );
}
