"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { WatchlistStatus } from "@/types/media";

export interface WatchlistContextType {
  watchlistIds: Set<string>;
  watchlistStatuses: Map<string, WatchlistStatus>;
  isLoading: boolean;
  isInWatchlist: (mediaId: string) => boolean;
  getWatchlistStatus: (mediaId: string) => WatchlistStatus | undefined;
  updateWatchlistStatus: (
    mediaId: string,
    status: WatchlistStatus,
  ) => Promise<boolean>;
  toggleWatchlist: (
    mediaId: string,
    status?: WatchlistStatus,
  ) => Promise<boolean>;
  addToWatchlist: (
    mediaId: string,
    status?: WatchlistStatus,
  ) => Promise<boolean>;
  removeFromWatchlist: (mediaId: string) => Promise<boolean>;
  refreshWatchlist: () => Promise<void>;
}

const WatchlistContext = createContext<WatchlistContextType | undefined>(
  undefined,
);

export interface WatchlistProviderProps {
  children: ReactNode;
}

export function WatchlistProvider({ children }: WatchlistProviderProps) {
  const { user } = useAuth();
  const userId = user?.id;
  const router = useRouter();

  const [prevUserId, setPrevUserId] = useState(userId);
  const [watchlistIds, setWatchlistIds] = useState<Set<string>>(new Set());
  const [watchlistStatuses, setWatchlistStatuses] = useState<
    Map<string, WatchlistStatus>
  >(new Map());
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(userId));

  if (prevUserId !== userId) {
    setPrevUserId(userId);
    if (!userId) {
      setWatchlistIds(new Set());
      setWatchlistStatuses(new Map());
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }
  }

  const supabase = useMemo(() => createClient(), []);

  const fetchWatchlistIds = useCallback(
    async (currentUserId: string) => {
      try {
        const { data, error } = await supabase
          .from("watchlists")
          .select("media_id, status")
          .eq("user_id", currentUserId);

        if (!error && data) {
          const ids = new Set<string>();
          const statuses = new Map<string, WatchlistStatus>();
          for (const r of data) {
            ids.add(r.media_id);
            if (r.status) {
              statuses.set(r.media_id, r.status as WatchlistStatus);
            }
          }
          setWatchlistIds(ids);
          setWatchlistStatuses(statuses);
        }
      } catch (err) {
        console.error("Failed to load user watchlist IDs:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [supabase],
  );

  const refreshWatchlist = useCallback(async () => {
    if (userId) {
      await fetchWatchlistIds(userId);
    } else {
      setWatchlistIds(new Set());
      setWatchlistStatuses(new Map());
    }
  }, [userId, fetchWatchlistIds]);

  useEffect(() => {
    if (!userId) return;

    let isMounted = true;
    supabase
      .from("watchlists")
      .select("media_id, status")
      .eq("user_id", userId)
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (!error && data) {
          const ids = new Set<string>();
          const statuses = new Map<string, WatchlistStatus>();
          for (const r of data) {
            ids.add(r.media_id);
            if (r.status) {
              statuses.set(r.media_id, r.status as WatchlistStatus);
            }
          }
          setWatchlistIds(ids);
          setWatchlistStatuses(statuses);
        }
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [supabase, userId]);

  const isInWatchlist = useCallback(
    (mediaId: string): boolean => {
      return watchlistIds.has(mediaId);
    },
    [watchlistIds],
  );

  const getWatchlistStatus = useCallback(
    (mediaId: string): WatchlistStatus | undefined => {
      return watchlistStatuses.get(mediaId);
    },
    [watchlistStatuses],
  );

  const addToWatchlist = useCallback(
    async (
      mediaId: string,
      status: WatchlistStatus = "plan_to_watch",
    ): Promise<boolean> => {
      if (!userId) {
        const currentPath =
          typeof window !== "undefined"
            ? window.location.pathname + window.location.search
            : "/";
        const next = currentPath ? `?next=${encodeURIComponent(currentPath)}` : "";
        router.push(`/login${next}`);
        return false;
      }

      // Optimistic update
      setWatchlistIds((prev) => new Set(prev).add(mediaId));
      setWatchlistStatuses((prev) => new Map(prev).set(mediaId, status));

      try {
        const { error } = await supabase.from("watchlists").upsert(
          {
            user_id: userId,
            media_id: mediaId,
            status,
          },
          { onConflict: "user_id,media_id" },
        );

        if (error) {
          // Revert optimistic update
          setWatchlistIds((prev) => {
            const next = new Set(prev);
            next.delete(mediaId);
            return next;
          });
          setWatchlistStatuses((prev) => {
            const next = new Map(prev);
            next.delete(mediaId);
            return next;
          });
          console.error("Error adding to watchlist:", error);
          return false;
        }

        return true;
      } catch (err) {
        setWatchlistIds((prev) => {
          const next = new Set(prev);
          next.delete(mediaId);
          return next;
        });
        setWatchlistStatuses((prev) => {
          const next = new Map(prev);
          next.delete(mediaId);
          return next;
        });
        console.error("Failed to add to watchlist:", err);
        return false;
      }
    },
    [userId, router, supabase],
  );

  const updateWatchlistStatus = useCallback(
    async (
      mediaId: string,
      status: WatchlistStatus,
    ): Promise<boolean> => {
      if (!userId) return false;

      const previousStatus = watchlistStatuses.get(mediaId);

      // Optimistic update
      setWatchlistStatuses((prev) => new Map(prev).set(mediaId, status));
      setWatchlistIds((prev) => new Set(prev).add(mediaId));

      try {
        const { error } = await supabase
          .from("watchlists")
          .update({ status })
          .eq("user_id", userId)
          .eq("media_id", mediaId);

        if (error) {
          setWatchlistStatuses((prev) => {
            const next = new Map(prev);
            if (previousStatus) {
              next.set(mediaId, previousStatus);
            } else {
              next.delete(mediaId);
            }
            return next;
          });
          console.error("Error updating watchlist status:", error);
          return false;
        }

        return true;
      } catch (err) {
        setWatchlistStatuses((prev) => {
          const next = new Map(prev);
          if (previousStatus) {
            next.set(mediaId, previousStatus);
          } else {
            next.delete(mediaId);
          }
          return next;
        });
        console.error("Failed to update watchlist status:", err);
        return false;
      }
    },
    [userId, supabase, watchlistStatuses],
  );

  const removeFromWatchlist = useCallback(
    async (mediaId: string): Promise<boolean> => {
      if (!userId) return false;

      const previousStatus = watchlistStatuses.get(mediaId);

      // Optimistic update
      setWatchlistIds((prev) => {
        const next = new Set(prev);
        next.delete(mediaId);
        return next;
      });
      setWatchlistStatuses((prev) => {
        const next = new Map(prev);
        next.delete(mediaId);
        return next;
      });

      try {
        const { error } = await supabase
          .from("watchlists")
          .delete()
          .eq("user_id", userId)
          .eq("media_id", mediaId);

        if (error) {
          // Revert optimistic update
          setWatchlistIds((prev) => new Set(prev).add(mediaId));
          setWatchlistStatuses((prev) => {
            const next = new Map(prev);
            if (previousStatus) {
              next.set(mediaId, previousStatus);
            }
            return next;
          });
          console.error("Error removing from watchlist:", error);
          return false;
        }

        return true;
      } catch (err) {
        setWatchlistIds((prev) => new Set(prev).add(mediaId));
        setWatchlistStatuses((prev) => {
          const next = new Map(prev);
          if (previousStatus) {
            next.set(mediaId, previousStatus);
          }
          return next;
        });
        console.error("Failed to remove from watchlist:", err);
        return false;
      }
    },
    [userId, supabase, watchlistStatuses],
  );

  const toggleWatchlist = useCallback(
    async (
      mediaId: string,
      status: WatchlistStatus = "plan_to_watch",
    ): Promise<boolean> => {
      if (!userId) {
        const currentPath =
          typeof window !== "undefined"
            ? window.location.pathname + window.location.search
            : "/";
        const next = currentPath ? `?next=${encodeURIComponent(currentPath)}` : "";
        router.push(`/login${next}`);
        return false;
      }

      const currentlyIn = watchlistIds.has(mediaId);
      if (currentlyIn) {
        return await removeFromWatchlist(mediaId);
      } else {
        return await addToWatchlist(mediaId, status);
      }
    },
    [userId, router, watchlistIds, removeFromWatchlist, addToWatchlist],
  );

  return (
    <WatchlistContext.Provider
      value={{
        watchlistIds,
        watchlistStatuses,
        isLoading,
        isInWatchlist,
        getWatchlistStatus,
        updateWatchlistStatus,
        toggleWatchlist,
        addToWatchlist,
        removeFromWatchlist,
        refreshWatchlist,
      }}
    >
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist(): WatchlistContextType {
  const context = useContext(WatchlistContext);
  if (!context) {
    throw new Error("useWatchlist must be used within a WatchlistProvider");
  }
  return context;
}
