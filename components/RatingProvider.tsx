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
import { redirectToLogin } from "@/lib/navigation";
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
  ) => Promise<ReviewRow | null>;
  deleteReview: (mediaId: string) => Promise<boolean>;
  refreshRatings: () => Promise<void>;
}

const RatingContext = createContext<RatingContextType | undefined>(undefined);

export interface RatingProviderProps {
  children: ReactNode;
}

function buildRatingsState(rows: ReadonlyArray<ReviewRow>) {
  const ratings = new Map<string, number>();
  const reviews = new Map<string, ReviewRow>();
  for (const r of rows) {
    reviews.set(r.media_id, r);
    if (r.rating !== null && r.rating !== undefined) {
      ratings.set(r.media_id, r.rating);
    }
  }
  return { ratings, reviews };
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

  const loadUserReviewsState = useCallback(
    async (currentUserId: string) => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("user_id", currentUserId);

      if (error || !data) return null;
      return buildRatingsState(data as ReviewRow[]);
    },
    [supabase],
  );

  const refreshRatings = useCallback(async () => {
    if (userId) {
      try {
        const result = await loadUserReviewsState(userId);
        if (result) {
          setUserRatings(result.ratings);
          setUserReviews(result.reviews);
        }
      } catch (err) {
        console.error("Failed to load user ratings and reviews:", err);
      } finally {
        setIsLoading(false);
      }
    } else {
      setUserRatings(new Map());
      setUserReviews(new Map());
    }
  }, [userId, loadUserReviewsState]);

  useEffect(() => {
    if (!userId) return;

    let isMounted = true;
    loadUserReviewsState(userId)
      .then((result) => {
        if (!isMounted) return;
        if (result) {
          setUserRatings(result.ratings);
          setUserReviews(result.reviews);
        }
      })
      .catch((err) => {
        console.error("Failed to load user ratings and reviews:", err);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [loadUserReviewsState, userId]);

  const getUserRating = useCallback(
    (mediaId: string): number | null => userRatings.get(mediaId) ?? null,
    [userRatings],
  );

  const getUserReview = useCallback(
    (mediaId: string): ReviewRow | null => userReviews.get(mediaId) ?? null,
    [userReviews],
  );

  const revertEntry = useCallback(
    (
      mediaId: string,
      previousRating: number | undefined,
      existingReview: ReviewRow | undefined,
    ) => {
      setUserRatings((prev) => {
        const next = new Map(prev);
        if (previousRating !== undefined) next.set(mediaId, previousRating);
        else next.delete(mediaId);
        return next;
      });
      setUserReviews((prev) => {
        const next = new Map(prev);
        if (existingReview) next.set(mediaId, existingReview);
        else next.delete(mediaId);
        return next;
      });
    },
    [],
  );

  const rateMedia = useCallback(
    async (mediaId: string, rating: number): Promise<boolean> => {
      if (!userId) {
        redirectToLogin(router);
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
          content?: string | null;
        } = {
          user_id: userId,
          media_id: mediaId,
          rating,
        };

        if (existingReview?.content) {
          payload.content = existingReview.content;
        }

        const { data, error } = await supabase
          .from("reviews")
          .upsert(payload, { onConflict: "user_id,media_id" })
          .select()
          .single();

        if (error) throw error;

        if (data) {
          setUserReviews((prev) => new Map(prev).set(mediaId, data as ReviewRow));
        }
        return true;
      } catch (err) {
        revertEntry(mediaId, previousRating, existingReview);
        console.error("Failed to rate media:", err);
        return false;
      }
    },
    [userId, userReviews, userRatings, router, supabase, revertEntry],
  );

  const submitReview = useCallback(
    async (
      mediaId: string,
      data: { rating?: number | null; content?: string | null },
    ): Promise<ReviewRow | null> => {
      if (!userId) {
        redirectToLogin(router);
        return null;
      }

      const existingReview = userReviews.get(mediaId);
      const previousRating = userRatings.get(mediaId);

      const finalRating =
        data.rating !== undefined ? data.rating : (previousRating ?? null);
      const finalContent =
        data.content !== undefined
          ? data.content
          : (existingReview?.content ?? null);

      if (finalRating === null && (!finalContent || finalContent.trim() === "")) {
        return null;
      }

      // Optimistic update
      setUserRatings((prev) => {
        const next = new Map(prev);
        if (finalRating !== null) next.set(mediaId, finalRating);
        else next.delete(mediaId);
        return next;
      });
      const optimisticReview: ReviewRow = {
        id: existingReview?.id || `temp-${Date.now()}`,
        user_id: userId,
        media_id: mediaId,
        rating: finalRating,
        content: finalContent,
        status: existingReview?.status || "approved",
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
            },
            { onConflict: "user_id,media_id" },
          )
          .select()
          .single();

        if (error) throw error;

        const persisted = (savedReview as ReviewRow) ?? optimisticReview;
        setUserReviews((prev) => new Map(prev).set(mediaId, persisted));
        router.refresh();
        return persisted;
      } catch (err) {
        revertEntry(mediaId, previousRating, existingReview);
        console.error("Failed to submit review:", err);
        return null;
      }
    },
    [userId, userReviews, userRatings, router, supabase, revertEntry],
  );

  const deleteReview = useCallback(
    async (mediaId: string): Promise<boolean> => {
      if (!userId) return false;

      const existingReview = userReviews.get(mediaId);
      const previousRating = userRatings.get(mediaId);

      // Optimistic delete
      setUserRatings((prev) => {
        const next = new Map(prev);
        next.delete(mediaId);
        return next;
      });
      setUserReviews((prev) => {
        const next = new Map(prev);
        next.delete(mediaId);
        return next;
      });

      try {
        const { error } = await supabase
          .from("reviews")
          .delete()
          .eq("user_id", userId)
          .eq("media_id", mediaId);

        if (error) throw error;

        router.refresh();
        return true;
      } catch (err) {
        revertEntry(mediaId, previousRating, existingReview);
        console.error("Failed to delete review:", err);
        return false;
      }
    },
    [userId, userReviews, userRatings, router, supabase, revertEntry],
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
      deleteReview,
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
      deleteReview,
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
