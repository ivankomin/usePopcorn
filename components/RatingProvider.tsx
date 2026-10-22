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
import type { ReviewRow } from "@/types/media";

export interface RatingContextType {
  userRatings: Map<string, number>;
  userReviews: Map<string, ReviewRow>;
  isLoading: boolean;
  getUserRating: (mediaId: string) => number | null;
  getUserReview: (mediaId: string) => ReviewRow | null;
  rateMedia: (mediaId: string, rating: number) => Promise<boolean>;
  submitReview: (
    mediaId: string,
    data: { rating?: number | null; content?: string | null },
  ) => Promise<boolean>;
  refreshRatings: () => Promise<void>;
}

const RatingContext = createContext<RatingContextType | undefined>(undefined);

export interface RatingProviderProps {
  children: ReactNode;
}

export function RatingProvider({ children }: RatingProviderProps) {
  const { user } = useAuth();
  const userId = user?.id;
  const router = useRouter();

  const [prevUserId, setPrevUserId] = useState(userId);
  const [userRatings, setUserRatings] = useState<Map<string, number>>(new Map());
  const [userReviews, setUserReviews] = useState<Map<string, ReviewRow>>(new Map());
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(userId));

  if (prevUserId !== userId) {
    setPrevUserId(userId);
    if (!userId) {
      setUserRatings(new Map());
      setUserReviews(new Map());
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }
  }

  const supabase = useMemo(() => createClient(), []);

  const fetchUserReviews = useCallback(
    async (currentUserId: string) => {
      try {
        const { data, error } = await supabase
          .from("reviews")
          .select("*")
          .eq("user_id", currentUserId);

        if (!error && data) {
          const ratings = new Map<string, number>();
          const reviews = new Map<string, ReviewRow>();
          for (const r of data) {
            reviews.set(r.media_id, r as ReviewRow);
            if (r.rating !== null && r.rating !== undefined) {
              ratings.set(r.media_id, r.rating);
            }
          }
          setUserRatings(ratings);
          setUserReviews(reviews);
        }
      } catch (err) {
        console.error("Failed to load user ratings and reviews:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [supabase],
  );

  const refreshRatings = useCallback(async () => {
    if (userId) {
      await fetchUserReviews(userId);
    } else {
      setUserRatings(new Map());
      setUserReviews(new Map());
    }
  }, [userId, fetchUserReviews]);

  useEffect(() => {
    if (!userId) return;

    let isMounted = true;
    supabase
      .from("reviews")
      .select("*")
      .eq("user_id", userId)
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (!error && data) {
          const ratings = new Map<string, number>();
          const reviews = new Map<string, ReviewRow>();
          for (const r of data) {
            reviews.set(r.media_id, r as ReviewRow);
            if (r.rating !== null && r.rating !== undefined) {
              ratings.set(r.media_id, r.rating);
            }
          }
          setUserRatings(ratings);
          setUserReviews(reviews);
        }
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [supabase, userId]);

  const getUserRating = useCallback(
    (mediaId: string): number | null => {
      return userRatings.get(mediaId) ?? null;
    },
    [userRatings],
  );

  const getUserReview = useCallback(
    (mediaId: string): ReviewRow | null => {
      return userReviews.get(mediaId) ?? null;
    },
    [userReviews],
  );

  const rateMedia = useCallback(
    async (mediaId: string, rating: number): Promise<boolean> => {
      if (!userId) {
        const currentPath =
          typeof window !== "undefined"
            ? window.location.pathname + window.location.search
            : "/";
        const next = currentPath ? `?next=${encodeURIComponent(currentPath)}` : "";
        router.push(`/login${next}`);
        return false;
      }

      const existingReview = userReviews.get(mediaId);
      const previousRating = userRatings.get(mediaId);

      // Optimistic update
      setUserRatings((prev) => new Map(prev).set(mediaId, rating));
      if (existingReview) {
        setUserReviews((prev) =>
          new Map(prev).set(mediaId, {
            ...existingReview,
            rating,
            updated_at: new Date().toISOString(),
          }),
        );
      }

      try {
        const payload: {
          user_id: string;
          media_id: string;
          rating: number;
          status: string;
          content?: string | null;
        } = {
          user_id: userId,
          media_id: mediaId,
          rating,
          status: "approved",
        };

        if (existingReview?.content) {
          payload.content = existingReview.content;
        }

        const { data, error } = await supabase
          .from("reviews")
          .upsert(payload, { onConflict: "user_id,media_id" })
          .select()
          .single();

        if (error) {
          // Revert optimistic update
          setUserRatings((prev) => {
            const next = new Map(prev);
            if (previousRating !== undefined) {
              next.set(mediaId, previousRating);
            } else {
              next.delete(mediaId);
            }
            return next;
          });
          if (existingReview) {
            setUserReviews((prev) => new Map(prev).set(mediaId, existingReview));
          }
          console.error("Failed to rate media:", error);
          return false;
        }

        if (data) {
          setUserReviews((prev) => new Map(prev).set(mediaId, data as ReviewRow));
        }
        return true;
      } catch (err) {
        setUserRatings((prev) => {
          const next = new Map(prev);
          if (previousRating !== undefined) {
            next.set(mediaId, previousRating);
          } else {
            next.delete(mediaId);
          }
          return next;
        });
        if (existingReview) {
          setUserReviews((prev) => new Map(prev).set(mediaId, existingReview));
        }
        console.error("Failed to rate media:", err);
        return false;
      }
    },
    [userId, userReviews, userRatings, router, supabase],
  );

  const submitReview = useCallback(
    async (
      mediaId: string,
      data: { rating?: number | null; content?: string | null },
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

      const existingReview = userReviews.get(mediaId);
      const previousRating = userRatings.get(mediaId);

      // Determine final rating and content to persist
      const finalRating =
        data.rating !== undefined ? data.rating : (previousRating ?? null);
      const finalContent =
        data.content !== undefined ? data.content : (existingReview?.content ?? null);

      if (finalRating === null && (!finalContent || finalContent.trim() === "")) {
        return false;
      }

      // Optimistic update
      if (finalRating !== null) {
        setUserRatings((prev) => new Map(prev).set(mediaId, finalRating));
      }
      const optimisticReview: ReviewRow = {
        id: existingReview?.id || `temp-${Date.now()}`,
        user_id: userId,
        media_id: mediaId,
        rating: finalRating,
        content: finalContent,
        status: "approved",
        created_at: existingReview?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setUserReviews((prev) => new Map(prev).set(mediaId, optimisticReview));

      try {
        const { data: savedReview, error } = await supabase
          .from("reviews")
          .upsert(
            {
              user_id: userId,
              media_id: mediaId,
              rating: finalRating,
              content: finalContent,
              status: "approved",
            },
            { onConflict: "user_id,media_id" },
          )
          .select()
          .single();

        if (error) {
          // Revert optimistic updates
          setUserRatings((prev) => {
            const next = new Map(prev);
            if (previousRating !== undefined) {
              next.set(mediaId, previousRating);
            } else {
              next.delete(mediaId);
            }
            return next;
          });
          if (existingReview) {
            setUserReviews((prev) => new Map(prev).set(mediaId, existingReview));
          } else {
            setUserReviews((prev) => {
              const next = new Map(prev);
              next.delete(mediaId);
              return next;
            });
          }
          console.error("Failed to submit review:", error);
          return false;
        }

        if (savedReview) {
          setUserReviews((prev) =>
            new Map(prev).set(mediaId, savedReview as ReviewRow),
          );
        }
        return true;
      } catch (err) {
        setUserRatings((prev) => {
          const next = new Map(prev);
          if (previousRating !== undefined) {
            next.set(mediaId, previousRating);
          } else {
            next.delete(mediaId);
          }
          return next;
        });
        if (existingReview) {
          setUserReviews((prev) => new Map(prev).set(mediaId, existingReview));
        } else {
          setUserReviews((prev) => {
            const next = new Map(prev);
            next.delete(mediaId);
            return next;
          });
        }
        console.error("Failed to submit review:", err);
        return false;
      }
    },
    [userId, userReviews, userRatings, router, supabase],
  );

  const value = useMemo(
    () => ({
      userRatings,
      userReviews,
      isLoading,
      getUserRating,
      getUserReview,
      rateMedia,
      submitReview,
      refreshRatings,
    }),
    [
      userRatings,
      userReviews,
      isLoading,
      getUserRating,
      getUserReview,
      rateMedia,
      submitReview,
      refreshRatings,
    ],
  );

  return (
    <RatingContext.Provider value={value}>{children}</RatingContext.Provider>
  );
}

export function useRatings(): RatingContextType {
  const context = useContext(RatingContext);
  if (!context) {
    throw new Error("useRatings must be used within a RatingProvider");
  }
  return context;
}
