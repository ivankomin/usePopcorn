"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Star,
  CheckCircle2,
  Clock,
  Flag,
  Trash2,
  ExternalLink,
  Film,
  Tv,
  Loader2,
  User,
} from "lucide-react";
import { ProfileRoleBadge } from "@/components/profile/ProfileRoleBadge";
import type { ModeratedReviewItem, ReviewModerationStatus } from "@/types/media";

export interface ReviewModerationCardProps {
  review: ModeratedReviewItem;
  onStatusChange: (reviewId: string, newStatus: ReviewModerationStatus) => Promise<void>;
  onDelete: (reviewId: string) => Promise<void>;
}

export function ReviewModerationCard({
  review,
  onStatusChange,
  onDelete,
}: ReviewModerationCardProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const author = review.profile;
  const media = review.media;

  const posterUrl = media?.poster_path
    ? media.poster_path.startsWith("http")
      ? media.poster_path
      : `https://image.tmdb.org/t/p/w200${media.poster_path}`
    : null;

  const handleUpdateStatus = async (status: ReviewModerationStatus) => {
    setIsProcessing(true);
    try {
      await onStatusChange(review.id, status);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setIsProcessing(true);
    try {
      await onDelete(review.id);
    } finally {
      setIsProcessing(false);
      setIsConfirmingDelete(false);
    }
  };

  const getStatusBadge = () => {
    switch (review.status) {
      case "approved":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold font-mono text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Approved
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold font-mono text-amber-400 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" />
            Pending Review
          </span>
        );
      case "flagged":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold font-mono text-rose-400 border ">
            <Flag className="w-3.5 h-3.5" />
            Flagged
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-brand-surface border border-neutral-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col gap-4 transition-all">
      {/* Top Header: Author Info & Status Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-neutral-800/80">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-9 h-9 rounded-full overflow-hidden bg-neutral-800 border border-neutral-700 relative shrink-0 flex items-center justify-center">
            {author?.avatar_url ? (
              <Image
                src={author.avatar_url}
                alt={author.username || "User avatar"}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <User className="w-4 h-4 text-neutral-400" />
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-white text-sm">
              {author?.username || "Anonymous"}
            </span>
            <ProfileRoleBadge role={author?.role || "user"} />
            <span className="text-xs text-neutral-500 font-mono">
              • {new Date(review.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {getStatusBadge()}
        </div>
      </div>

      {/* Main Content: Target Media details & Review text */}
      <div className="flex flex-col md:flex-row items-start gap-4">
        {/* Media Snippet */}
        {media && (
          <Link
            href={`/movie/${media.id}`}
            className="flex items-center gap-3 p-2.5 bg-neutral-900/80 hover:bg-neutral-900 border border-neutral-800 rounded-xl transition-all w-full md:w-64 shrink-0 group"
          >
            <div className="w-10 h-14 relative bg-neutral-800 rounded-md overflow-hidden shrink-0 border border-neutral-700">
              {posterUrl ? (
                <Image
                  src={posterUrl}
                  alt={media.title}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-600">
                  {media.media_type === "movie" ? (
                    <Film className="w-4 h-4" />
                  ) : (
                    <Tv className="w-4 h-4" />
                  )}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate group-hover:text-brand-lime transition-colors">
                {media.title}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-neutral-400">
                  {media.release_year}
                </span>
                <span className="text-[9px] uppercase font-mono px-1 py-0.2 rounded bg-neutral-800 text-neutral-400">
                  {media.media_type}
                </span>
                <ExternalLink className="w-3 h-3 text-neutral-500 group-hover:text-brand-lime ml-auto" />
              </div>
            </div>
          </Link>
        )}

        {/* Review Score & Text */}
        <div className="flex-1 space-y-2">
          {review.rating !== null && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg  text-amber-400 text-xs font-bold font-mono">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{review.rating} / 10</span>
            </div>
          )}

          {review.content ? (
            <p className="text-sm text-neutral-200 leading-relaxed bg-neutral-900/40 p-3 rounded-xl border border-neutral-800/60 whitespace-pre-wrap">
              {review.content}
            </p>
          ) : (
            <p className="text-xs text-neutral-500 italic">
              No written text commentary provided (Score-only evaluation).
            </p>
          )}
        </div>
      </div>

      {/* Moderation Actions Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-neutral-800/80">
        <div className="flex items-center gap-2 flex-wrap">
          {isProcessing ? (
            <div className="flex items-center gap-1.5 text-xs text-neutral-400 px-3 py-1.5 font-mono">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-lime" />
              <span>Applying moderation...</span>
            </div>
          ) : isConfirmingDelete ? (
            <div className="flex items-center gap-2 p-1.5 rounded-xl text-xs">
              <span className="text-rose-300 font-semibold px-2">Delete permanently?</span>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition-colors cursor-pointer"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              {review.status !== "approved" && (
                <button
                  type="button"
                  onClick={() => handleUpdateStatus("approved")}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Approve</span>
                </button>
              )}

              {review.status !== "pending" && (
                <button
                  type="button"
                  onClick={() => handleUpdateStatus("pending")}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Mark Pending</span>
                </button>
              )}

              {review.status !== "flagged" && (
                <button
                  type="button"
                  onClick={() => handleUpdateStatus("flagged")}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>Flag</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-rose-900/40 text-neutral-400 hover:text-rose-300 border border-neutral-700/60 hover:border-rose-500/40 text-xs font-semibold transition-colors cursor-pointer"
                title="Permanently Delete Review"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
