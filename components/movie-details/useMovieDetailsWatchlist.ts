"use client";

import { useState } from "react";
import type { WatchlistStatus } from "@/types/media";
import { useWatchlist } from "@/components/WatchlistProvider";

export interface UseMovieDetailsWatchlistOptions {
  mediaId: string;
  initialInWatchlist?: boolean;
  initialAddedAt?: string | null;
  initialWatchlistStatus?: WatchlistStatus;
  onWatchlistToggle?: (mediaId: string, inWatchlist: boolean) => void;
  onStatusChange?: (mediaId: string, status: WatchlistStatus) => void;
}

export function useMovieDetailsWatchlist({
  mediaId,
  initialInWatchlist = false,
  initialAddedAt = null,
  initialWatchlistStatus = "plan_to_watch",
  onWatchlistToggle,
  onStatusChange,
}: UseMovieDetailsWatchlistOptions) {
  const {
    isInWatchlist,
    getWatchlistStatus,
    addToWatchlist,
    updateWatchlistStatus,
    removeFromWatchlist,
    isLoading: isWatchlistLoading,
  } = useWatchlist();

  const [isPending, setIsPending] = useState(false);
  const [addedAtOverride, setAddedAtOverride] = useState<string | null>(null);

  const inWatchlist = isWatchlistLoading
    ? Boolean(initialInWatchlist)
    : isInWatchlist(mediaId);

  const status = isWatchlistLoading
    ? (initialWatchlistStatus || "plan_to_watch")
    : (getWatchlistStatus(mediaId) || initialWatchlistStatus || "plan_to_watch");

  const addedAt = inWatchlist
    ? (addedAtOverride || initialAddedAt || null)
    : null;

  const handleAddToWatchlist = async () => {
    if (isPending) return;
    setIsPending(true);
    setAddedAtOverride(new Date().toISOString());

    try {
      const success = await addToWatchlist(mediaId, status);
      if (!success) {
        setAddedAtOverride(null);
      } else if (onWatchlistToggle) {
        onWatchlistToggle(mediaId, true);
      }
    } finally {
      setIsPending(false);
    }
  };

  const handleStatusSelect = async (newStatus: WatchlistStatus) => {
    if (newStatus === status) return;

    try {
      const success = await updateWatchlistStatus(mediaId, newStatus);
      if (success && onStatusChange) {
        onStatusChange(mediaId, newStatus);
      }
    } catch {
      // rollback handled by WatchlistProvider
    }
  };

  const handleRemoveWatchlist = async () => {
    if (isPending) return;
    setIsPending(true);
    setAddedAtOverride(null);

    try {
      const success = await removeFromWatchlist(mediaId);
      if (!success) {
        // rolled back by provider
      } else if (onWatchlistToggle) {
        onWatchlistToggle(mediaId, false);
      }
    } finally {
      setIsPending(false);
    }
  };

  return {
    inWatchlist,
    status,
    addedAt,
    isPending,
    handleAddToWatchlist,
    handleStatusSelect,
    handleRemoveWatchlist,
  };
}
