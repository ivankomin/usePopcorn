"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Star,
  Pencil,
  Trash2,
  Calendar,
  Clock,
  AlertCircle,
  ExternalLink,
  SlidersHorizontal,
} from "lucide-react";
import type { UserReviewArchiveItem } from "@/types/media";
import { getPosterUrl, formatRuntime, formatDate } from "@/lib/utils";
import { useRatings } from "@/hooks/useRatings";
import { ReviewForm } from "@/components/reviews/ReviewForm";

export interface UserReviewsArchiveProps {
  initialReviews: UserReviewArchiveItem[];
}

type SortOption = "date_desc" | "date_asc" | "rating_desc" | "rating_asc";

export function UserReviewsArchive({
  initialReviews,
}: UserReviewsArchiveProps) {
  const { deleteReview } = useRatings();
  const [reviewsList, setReviewsList] =
    useState<UserReviewArchiveItem[]>(initialReviews);
  const [editingMediaId, setEditingMediaId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("date_desc");
  const [filterWithTextOnly, setFilterWithTextOnly] = useState(false);

  // Sorting and Filtering
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

  const handleEditSuccess = () => {
    setEditingMediaId(null);
    // Reload or refresh can happen via router, but local UI updates smoothly
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

        {/* Sort selector */}
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
          {displayedReviews.map((review) => {
            const media = review.media;
            const isEditing = editingMediaId === review.media_id;
            const isConfirming = confirmDeleteId === review.id;
            const isDeletingThis = deletingId === review.id;
            const reviewDate = formatDate(
              review.updated_at || review.created_at,
            );

            return (
              <div
                key={review.id}
                className="bg-brand-surface border border-neutral-800 rounded-2xl p-5 sm:p-6 flex flex-col gap-5 shadow-lg transition-all duration-200"
              >
                {/* Movie Header Row */}
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                  {/* Left: Poster + Movie Details */}
                  <div className="flex items-start gap-4">
                    {/* Poster */}
                    <div className="relative w-16 h-24 sm:w-20 sm:h-28 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 shrink-0 shadow-md">
                      <Image
                        src={getPosterUrl(media?.poster_path, "w342")}
                        alt={media?.title || "Poster"}
                        fill
                        sizes="(max-width: 640px) 64px, 80px"
                        className="object-cover"
                      />
                    </div>

                    {/* Titles, release year, runtime, and genres */}
                    <div className="flex flex-col gap-1.5">
                      <Link
                        href={media ? `/movie/${media.id}` : "#"}
                        className="font-bold text-white text-base sm:text-lg hover:text-brand-lime transition-colors flex items-center gap-1.5 group"
                      >
                        <span className="line-clamp-1">
                          {media?.title || "Unknown Title"}
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </Link>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-400">
                        {media?.release_year && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                            {media.release_year}
                          </span>
                        )}
                        {media?.runtime ? (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-neutral-500" />
                            {formatRuntime(media.runtime)}
                          </span>
                        ) : null}
                        <span className="text-neutral-500">•</span>
                        <span className="uppercase text-[11px] font-mono tracking-wider text-neutral-400">
                          {media?.media_type === "tv" ? "TV Series" : "Movie"}
                        </span>
                      </div>

                      {/* Genre Chips - Strictly preserving bg-[#85c355] */}
                      {media?.genres && media.genres.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {media.genres.slice(0, 3).map((g) => (
                            <span
                              key={g.id}
                              className="bg-[#85c355] text-black font-semibold text-[10px] sm:text-xs rounded-full px-2 py-0.5 shadow-xs"
                            >
                              {g.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: User's 1-10 Rating Badge & Action Buttons */}
                  <div className="flex items-center gap-3 self-end sm:self-start">
                    {review.rating !== null && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-x text-brand-lime">
                        <Star className="w-4 h-4 fill-brand-lime text-brand-lime" />
                        <span className="text-sm font-bold font-mono">
                          {review.rating}/10
                        </span>
                      </div>
                    )}

                    {/* Edit button */}
                    <button
                      type="button"
                      onClick={() =>
                        setEditingMediaId((prev) =>
                          prev === review.media_id ? null : review.media_id,
                        )
                      }
                      title="Edit Rating & Review"
                      aria-label="Edit Rating & Review"
                      className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(review.id)}
                      title="Delete Review"
                      aria-label="Delete Review"
                      disabled={isDeletingThis}
                      className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-red-500/40 text-neutral-400 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Review Body or Edit Form */}
                {isEditing ? (
                  <div className="border-t border-neutral-800/80 pt-4">
                    <ReviewForm
                      mediaId={review.media_id}
                      initialRating={review.rating}
                      initialContent={review.content}
                      isEditing={true}
                      onSuccess={handleEditSuccess}
                      onCancel={() => setEditingMediaId(null)}
                    />
                  </div>
                ) : (
                  <div className="border-t border-neutral-800/80 pt-4 flex flex-col gap-2">
                    {review.content ? (
                      <p className="text-sm text-neutral-200 leading-relaxed whitespace-pre-line">
                        {review.content}
                      </p>
                    ) : (
                      <p className="text-xs text-neutral-500 italic">
                        No written review commentary provided for this title.
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs text-neutral-500 mt-2">
                      <span>Evaluated on {reviewDate}</span>
                      {review.status !== "approved" && (
                        <span className="text-[10px] font-mono uppercase bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded">
                          {review.status}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Delete Confirmation Alert Banner */}
                {isConfirming && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2 text-xs text-red-300">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>
                        Are you sure you want to delete this rating and review?
                      </span>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-3 py-1 rounded-lg text-xs font-medium text-neutral-300 hover:text-white bg-neutral-900 border border-neutral-700 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(review.media_id, review.id)}
                        disabled={isDeletingThis}
                        className="px-3 py-1 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-500 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isDeletingThis ? "Deleting..." : "Confirm Delete"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
