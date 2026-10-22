import Image from "next/image";
import { Star, User, MessageCircle } from "lucide-react";
import type { ReviewWithAuthor } from "@/types/media";
import { formatDate } from "@/lib/utils";

export interface CommunityReviewListProps {
  reviews: ReviewWithAuthor[];
  currentUserId?: string | null;
}

export function CommunityReviewList({
  reviews,
  currentUserId,
}: CommunityReviewListProps) {
  // Filter out current user review if already displayed separately
  const otherReviews = currentUserId
    ? reviews.filter((r) => r.user_id !== currentUserId)
    : reviews;

  if (otherReviews.length === 0) {
    return (
      <div className="bg-[#181818]/50 border border-neutral-800/80 rounded-2xl p-8 text-center flex flex-col items-center justify-center">
        <MessageCircle className="w-8 h-8 text-neutral-600 mb-2" />
        <p className="text-sm text-neutral-400 font-medium">
          No other reviews yet.
        </p>
        <span className="text-xs text-neutral-500 mt-1">
          Be among the first to share your thoughts on this title!
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {otherReviews.map((review) => {
        const username = review.profile?.username || "Anonymous";
        const avatarUrl = review.profile?.avatar_url;
        const hasRating = review.rating !== null && review.rating !== undefined;
        const formattedDate = formatDate(review.created_at);

        return (
          <div
            key={review.id}
            className="bg-[#181818] border border-neutral-800 rounded-2xl p-5 sm:p-6 flex flex-col gap-3.5"
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="relative w-9 h-9 rounded-full overflow-hidden bg-neutral-800 border border-neutral-700 flex items-center justify-center shrink-0">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt={username}
                      fill
                      sizes="36px"
                      className="object-cover"
                    />
                  ) : (
                    <User className="w-4 h-4 text-neutral-400" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-white text-sm">
                    {username}
                  </span>
                  {formattedDate && (
                    <span className="text-[11px] text-neutral-400">
                      {formattedDate}
                    </span>
                  )}
                </div>
              </div>

              {hasRating && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800">
                  <span className="text-xs font-bold text-white">
                    {Number(review.rating).toFixed(1)}
                  </span>
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                </div>
              )}
            </div>

            {review.content && (
              <p className="text-sm text-neutral-300 leading-relaxed font-normal whitespace-pre-line">
                {review.content}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
