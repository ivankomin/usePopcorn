"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageSquare, LogIn } from "lucide-react";
import type { ReviewRow, ReviewWithAuthor } from "@/types/media";
import { useAuth } from "@/hooks/useAuth";
import { useRatings } from "@/hooks/useRatings";
import { ReviewForm } from "./ReviewForm";
import { UserReviewCard } from "./UserReviewCard";
import { CommunityReviewList } from "./CommunityReviewList";

export interface MovieReviewsSectionProps {
  mediaId: string;
  initialUserReview?: ReviewRow | null;
  initialReviews?: ReviewWithAuthor[];
}

export function MovieReviewsSection({
  mediaId,
  initialUserReview = null,
  initialReviews = [],
}: MovieReviewsSectionProps) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const {
    getUserReview,
    getUserRating,
    deleteReview,
    isLoading: isRatingsLoading,
  } = useRatings();

  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const liveUserReview = getUserReview(mediaId);
  const liveUserRating = getUserRating(mediaId);

  // Active user review: Trust SSR initial on initial mount, but switch to live context once loaded
  const userReview = isRatingsLoading
    ? (initialUserReview ?? liveUserReview)
    : liveUserReview;
  const userRating = isRatingsLoading
    ? (initialUserReview?.rating ?? liveUserRating)
    : liveUserRating;

  // Does the user have a written text review?
  const hasWrittenReview = Boolean(
    userReview?.content && userReview.content.trim().length > 0,
  );

  const handleDeleteReview = async () => {
    setIsDeleting(true);
    try {
      const success = await deleteReview(mediaId);
      if (success) {
        setIsEditing(false);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const totalReviewsCount =
    initialReviews.length +
    (userReview && !initialReviews.some((r) => r.id === userReview.id) ? 1 : 0);

  return (
    <section
      id="review-section"
      className="w-full max-w-5xl lg:max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6"
    >
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-neutral-800 pb-4">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-6 h-6 text-[#8ce648]" />
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Ratings & Reviews
          </h2>
          {totalReviewsCount > 0 && (
            <span className="px-2.5 py-0.5 rounded-full bg-neutral-800 border border-neutral-700 text-xs font-semibold text-neutral-300">
              {totalReviewsCount}
            </span>
          )}
        </div>
      </div>

      {/* User Review or Action Section */}
      {!isAuthLoading && user ? (
        userReview && !isEditing ? (
          <UserReviewCard
            review={userReview}
            onEdit={() => setIsEditing(true)}
            onDelete={handleDeleteReview}
            isDeleting={isDeleting}
            onAddTextReview={!hasWrittenReview ? () => setIsEditing(true) : undefined}
          />
        ) : (
          <div className="flex flex-col gap-3">
            <ReviewForm
              mediaId={mediaId}
              initialRating={userRating}
              initialContent={userReview?.content}
              isEditing={Boolean(userReview)}
              onSuccess={() => setIsEditing(false)}
              onCancel={userReview ? () => setIsEditing(false) : undefined}
            />
          </div>
        )
      ) : !isAuthLoading && !user ? (
        <div className="bg-[#181818] border border-neutral-800 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex flex-col gap-1">
            <h3 className="text-base sm:text-lg font-bold text-white">
              Want to share your rating or review?
            </h3>
            <p className="text-xs sm:text-sm text-neutral-400">
              Sign in to rate titles, write reviews, and keep track of your favorites.
            </p>
          </div>
          <Link
            href={`/login?next=/movie/${mediaId}`}
            className="h-10 px-5 rounded-xl bg-[#8ce648] hover:bg-[#9ded5b] text-black font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all hover:scale-102 cursor-pointer shrink-0"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In to Review</span>
          </Link>
        </div>
      ) : null}

      {/* Community Reviews List */}
      <div className="flex flex-col gap-4 mt-2">
        <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">
          Community Reviews
        </h3>
        <CommunityReviewList
          reviews={initialReviews}
          currentUserId={user?.id}
        />
      </div>
    </section>
  );
}
