"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { X } from "lucide-react";
import { useRatings } from "@/hooks/useRatings";
import { cn } from "@/lib/utils";

const Rating = dynamic(() => import("@mui/material/Rating"), {
  ssr: false,
  loading: () => (
    <span className="inline-flex items-center gap-1 text-[#383838] select-none">
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className="text-xl sm:text-2xl leading-none">
          ★
        </span>
      ))}
    </span>
  ),
});

export interface ReviewFormProps {
  mediaId: string;
  initialRating?: number | null;
  onSuccess?: () => void;
}

export function ReviewForm({
  mediaId,
  initialRating = null,
  onSuccess,
}: ReviewFormProps) {
  const { submitReview } = useRatings();
  const [rating, setRating] = useState<number | null>(initialRating);
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const stars5 = rating !== null ? rating / 2 : 0;
  const canSubmit = rating !== null || content.trim().length > 0;

  const handleRatingChange = (newStars: number | null) => {
    if (newStars === null) {
      setRating(null);
    } else {
      setRating(Math.round(newStars * 2));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const success = await submitReview(mediaId, {
        rating: rating !== null ? rating : null,
        content: content.trim() ? content.trim() : null,
      });

      if (!success) {
        setErrorMessage("Failed to save your review. Please try again.");
      } else {
        setContent("");
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch {
      setErrorMessage("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[#181818]/90 border border-neutral-800 rounded-2xl p-6 sm:p-7 flex flex-col gap-5 shadow-xl"
    >
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-neutral-800/80 pb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-white tracking-tight">
            Add Your Rating & Review
          </h3>
        </div>
        <span className="text-xs text-neutral-400">
          Rating & review can be submitted together or independently
        </span>
      </div>

      {/* Star Rating Selector */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
            Your Rating
          </label>
          {rating !== null && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#e1e648]">
                {rating} / 10
              </span>
              <button
                type="button"
                onClick={() => setRating(null)}
                className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer py-0.5 px-1.5 rounded hover:bg-neutral-800"
                title="Clear rating"
              >
                <X className="w-3 h-3" />
                <span>Clear</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 py-1">
          <Rating
            value={stars5}
            precision={0.5}
            onChange={(_, val) => handleRatingChange(val)}
            size="large"
            sx={{
              color: "#e1e648",
              "& .MuiRating-iconEmpty": {
                color: "#383838",
              },
              "& .MuiRating-iconFilled": {
                color: "#e1e648",
              },
              "& .MuiRating-iconHover": {
                color: "#e1e648",
              },
              "& .MuiRating-icon": {
                fontSize: { xs: "1.75rem", sm: "2rem" },
              },
            }}
          />
          {rating === null && (
            <span className="text-xs text-neutral-500 italic">
              Tap stars to rate (optional)
            </span>
          )}
        </div>
      </div>

      {/* Review Textarea */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="review-content"
          className="text-xs font-semibold text-neutral-300 uppercase tracking-wider"
        >
          Your Review
        </label>
        <textarea
          id="review-content"
          rows={4}
          value={content}
          maxLength={1000}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share your thoughts, favorite moments, or critique with the community..."
          className="w-full bg-[#121212] border border-neutral-700/80 rounded-xl p-4 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 transition-all resize-y min-h-24 leading-relaxed"
        />
      </div>

      {errorMessage && (
        <div className="text-xs text-red-400 font-medium bg-red-950/30 border border-red-800/40 rounded-lg p-2.5">
          {errorMessage}
        </div>
      )}

      {/* Submit Button */}
      <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
        <button
          type="submit"
          disabled={!canSubmit || isSubmitting}
          className={cn(
            "h-10 px-5 rounded-xl font-semibold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer select-none",
            canSubmit && !isSubmitting
              ? "bg-[#8ce648] hover:bg-[#9ded5b] text-black shadow-md hover:scale-102 active:scale-98"
              : "bg-neutral-800 text-neutral-500 cursor-not-allowed",
          )}
        >
          {isSubmitting ? (
            <>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <span>Submit Review</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
