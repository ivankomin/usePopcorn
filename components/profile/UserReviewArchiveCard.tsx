"use client";

import Image from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  Calendar,
  Clock,
  ExternalLink,
  Pencil,
  Star,
  Trash2,
} from "lucide-react";
import type { UserReviewArchiveItem } from "@/types/media";
import { formatDate, formatRuntime, getPosterUrl } from "@/lib/utils";
import { ReviewForm } from "@/components/reviews/ReviewForm";

export interface UserReviewArchiveCardProps {
  review: UserReviewArchiveItem;
  isEditing: boolean;
  isConfirmingDelete: boolean;
  isDeleting: boolean;
  onToggleEdit: () => void;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  onEditSuccess: (updated?: {
    rating: number | null;
    content: string | null;
    status: string;
  }) => void;
  onCancelEdit: () => void;
}

export function UserReviewArchiveCard({
  review,
  isEditing,
  isConfirmingDelete,
  isDeleting,
  onToggleEdit,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
  onEditSuccess,
  onCancelEdit,
}: UserReviewArchiveCardProps) {
  const media = review.media;
  const reviewDate = formatDate(review.updated_at || review.created_at);

  return (
    <div className="bg-brand-surface border border-neutral-800 rounded-2xl p-5 sm:p-6 flex flex-col gap-5 shadow-lg transition-all duration-200">
      {/* Movie Header Row */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="relative w-16 h-24 sm:w-20 sm:h-28 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 shrink-0 shadow-md">
            <Image
              src={getPosterUrl(media?.poster_path, "w342")}
              alt={media?.title || "Poster"}
              fill
              sizes="(max-width: 640px) 64px, 80px"
              className="object-cover"
            />
          </div>

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

          <button
            type="button"
            onClick={onToggleEdit}
            title="Edit Rating & Review"
            aria-label="Edit Rating & Review"
            className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <Pencil className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onRequestDelete}
            title="Delete Review"
            aria-label="Delete Review"
            disabled={isDeleting}
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
            onSuccess={onEditSuccess}
            onCancel={onCancelEdit}
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
              <span className="text-[11px] font-mono uppercase bg-yellow-500 text-black px-2 py-0.5 rounded">
                {review.status}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Alert Banner */}
      {isConfirmingDelete && (
        <div className=" rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>
              Are you sure you want to delete this rating and review?
            </span>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={onCancelDelete}
              className="px-3 py-1 rounded-lg text-xs font-medium text-neutral-300 hover:text-white bg-neutral-900 border border-neutral-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirmDelete}
              disabled={isDeleting}
              className="px-3 py-1 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-500 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isDeleting ? "Deleting..." : "Confirm Delete"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
