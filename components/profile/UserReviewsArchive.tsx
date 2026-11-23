"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Star, SlidersHorizontal } from "lucide-react";
import type { UserReviewArchiveItem } from "@/types/media";
import { useRatings } from "@/hooks/useRatings";
import { UserReviewArchiveCard } from "./UserReviewArchiveCard";

export interface UserReviewsArchiveProps {
  initialReviews: UserReviewArchiveItem[];
}

type SortOption = "date_desc" | "date_asc" | "rating_desc" | "rating_asc";

export function UserReviewsArchive({
  initialReviews,
}: UserReviewsArchiveProps) {
  const router = useRouter();
  const { deleteReview } = useRatings();
  const [prevInitialReviews, setPrevInitialReviews] =
    useState<UserReviewArchiveItem[]>(initialReviews);
  const [reviewsList, setReviewsList] =
    useState<UserReviewArchiveItem[]>(initialReviews);
  const [editingMediaId, setEditingMediaId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("date_desc");
  const [filterWithTextOnly, setFilterWithTextOnly] = useState(false);

  if (prevInitialReviews !== initialReviews) {
    setPrevInitialReviews(initialReviews);
    setReviewsList(initialReviews);
  }

  const displayedReviews = useMemo(() => {
    let list = [...reviewsList];

    if (filterWithTextOnly) {
      list = list.filter((r) =>
        Boolean(r.content && r.content.trim().length > 0),
      );
    }

    list.sort((a, b) => {
      if (sortBy === "date_desc") {
        return (
          new Date(b.updated_at || b.created_at).getTime() -
          new Date(a.updated_at || a.created_at).getTime()
        );
      }
      if (sortBy === "date_asc") {
        return (
          new Date(a.updated_at || a.created_at).getTime() -
          new Date(b.updated_at || b.created_at).getTime()
        );
      }
      if (sortBy === "rating_desc") {
        return (b.rating ?? 0) - (a.rating ?? 0);
      }
      if (sortBy === "rating_asc") {
        return (a.rating ?? 0) - (b.rating ?? 0);
      }
      return 0;
    });

    return list;
  }, [reviewsList, sortBy, filterWithTextOnly]);

  const handleDelete = async (mediaId: string, reviewId: string) => {
    setDeletingId(reviewId);
    try {
      const ok = await deleteReview(mediaId);
      if (ok) {
        setReviewsList((prev) => prev.filter((r) => r.id !== reviewId));
      }
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const handleEditSuccess = (
    mediaId: string,
    updated?: { rating: number | null; content: string | null; status: string },
  ) => {
    if (updated) {
      setReviewsList((prev) =>
        prev.map((item) =>
          item.media_id === mediaId
            ? {
                ...item,
                rating: updated.rating,
                content: updated.content,
                status: updated.status,
                updated_at: new Date().toISOString(),
              }
            : item,
        ),
      );
    }
    setEditingMediaId(null);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Controls Bar: Sort & Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-brand-surface border border-neutral-800 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Total Reviews:{" "}
            <span className="text-white font-mono">{reviewsList.length}</span>
          </span>

          <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer ml-3 select-none">
            <input
              type="checkbox"
              checked={filterWithTextOnly}
              onChange={(e) => setFilterWithTextOnly(e.target.checked)}
              className="rounded border-neutral-700 bg-neutral-900 text-brand-lime focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <span>With written review only</span>
          </label>
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-500" />
          <span className="text-xs text-neutral-400">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-lime cursor-pointer"
          >
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="rating_desc">Highest Rating</option>
            <option value="rating_asc">Lowest Rating</option>
          </select>
        </div>
      </div>

      {/* Reviews List */}
      {displayedReviews.length === 0 ? (
        <div className="bg-brand-surface border border-neutral-800/80 rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3">
          <Star className="w-10 h-10 text-neutral-600" />
          <h3 className="text-base font-bold text-white">No reviews found</h3>
          <p className="text-xs text-neutral-400 max-w-sm">
            {filterWithTextOnly
              ? "None of your evaluations include written commentary."
              : "You haven't rated or reviewed any movies yet."}
          </p>
          <Link
            href="/catalog"
            className="mt-2 px-4 py-2 rounded-xl bg-brand-lime text-black text-xs font-semibold hover:bg-brand-lime/90 transition-colors"
          >
            Browse Movies
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {displayedReviews.map((review) => (
            <UserReviewArchiveCard
              key={review.id}
              review={review}
              isEditing={editingMediaId === review.media_id}
              isConfirmingDelete={confirmDeleteId === review.id}
              isDeleting={deletingId === review.id}
              onToggleEdit={() =>
                setEditingMediaId((prev) =>
                  prev === review.media_id ? null : review.media_id,
                )
              }
              onRequestDelete={() => setConfirmDeleteId(review.id)}
              onCancelDelete={() => setConfirmDeleteId(null)}
              onConfirmDelete={() => handleDelete(review.media_id, review.id)}
              onEditSuccess={(updated) =>
                handleEditSuccess(review.media_id, updated)
              }
              onCancelEdit={() => setEditingMediaId(null)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
