"use client";

import Image from "next/image";
import { Star, User, MessageSquare } from "lucide-react";
import type { ReviewRow } from "@/types/media";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

export interface UserReviewCardProps {
  review: ReviewRow;
  onAddTextReview?: () => void;
}

export function UserReviewCard({ review, onAddTextReview }: UserReviewCardProps) {
  const { user } = useAuth();
  const username =
    user?.user_metadata?.username ||
    user?.email?.split("@")[0] ||
    "You";
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;

  const hasRating = review.rating !== null && review.rating !== undefined;
  const hasContent = Boolean(review.content && review.content.trim().length > 0);
  const formattedDate = formatDate(review.created_at);

  return (
    <div className="bg-[#1c1c1c] border border-neutral-800 rounded-2xl p-6 sm:p-7 flex flex-col gap-4 shadow-xl">
      {/* Header: User Info + "Your Review" Tag + Star Rating */}
      <div className="flex items-start justify-between gap-4 flex-wrap border-b border-neutral-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-full overflow-hidden bg-neutral-800 border border-neutral-700 flex items-center justify-center shrink-0">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={username}
                fill
                sizes="40px"
                className="object-cover"
              />
            ) : (
              <User className="w-5 h-5 text-neutral-400" />
            )}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-white text-sm sm:text-base">
                {username}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#8ce648]/15 border border-[#8ce648]/30 text-[#8ce648] text-[10px] font-semibold uppercase tracking-wider">
                Your Review
              </span>
            </div>
            {formattedDate && (
              <span className="text-xs text-neutral-400 font-normal">
                {formattedDate}
              </span>
            )}
          </div>
        </div>

        {hasRating && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800">
            <span className="text-xs text-neutral-400">Rating:</span>
            <span className="text-sm sm:text-base font-extrabold text-white">
              {Number(review.rating).toFixed(1)}
            </span>
            <Star className="w-4 h-4 fill-[#8ce648] text-[#8ce648]" />
          </div>
        )}
      </div>

      {/* Content */}
      {hasContent ? (
        <p className="text-sm sm:text-base text-neutral-200 leading-relaxed font-normal whitespace-pre-line">
          {review.content}
        </p>
      ) : (
        <div className="flex items-center justify-between flex-wrap gap-2 py-2">
          <p className="text-xs sm:text-sm text-neutral-400 italic">
            You rated this title without a written review.
          </p>
          {onAddTextReview && (
            <button
              type="button"
              onClick={onAddTextReview}
              className="text-xs text-[#8ce648] hover:text-[#9ded5b] flex items-center gap-1 font-medium transition-colors cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Add a written review</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
