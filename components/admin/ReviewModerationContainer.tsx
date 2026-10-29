"use client";

import { useState, useTransition } from "react";
import {
  Search,
  CheckCircle2,
  Clock,
  Flag,
  ListFilter,
  MessageSquare,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { AdminNavTabs } from "./AdminNavTabs";
import { ReviewModerationCard } from "./ReviewModerationCard";
import {
  getModeratedReviewsAction,
  updateReviewStatusAction,
  deleteReviewAction,
} from "@/app/actions/admin";
import type {
  ModeratedReviewItem,
  ModeratedReviewsCounts,
  ReviewModerationStatus,
} from "@/types/media";

export interface ReviewModerationContainerProps {
  initialReviews: ModeratedReviewItem[];
  initialTotal: number;
  initialCounts: ModeratedReviewsCounts;
  initialPage?: number;
  initialPageSize?: number;
}

export function ReviewModerationContainer({
  initialReviews,
  initialTotal,
  initialCounts,
  initialPage = 1,
  initialPageSize = 15,
}: ReviewModerationContainerProps) {
  const [reviews, setReviews] = useState<ModeratedReviewItem[]>(initialReviews);
  const [counts, setCounts] = useState<ModeratedReviewsCounts>(initialCounts);
  const [total, setTotal] = useState<number>(initialTotal);
  const [page, setPage] = useState<number>(initialPage);
  const [pageSize] = useState<number>(initialPageSize);

  const [statusFilter, setStatusFilter] = useState<
    "all" | ReviewModerationStatus
  >("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<
    "newest" | "oldest" | "rating_desc" | "rating_asc"
  >("newest");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Reload reviews with current filters
  const fetchReviews = (
    targetPage: number,
    targetStatus = statusFilter,
    targetSearch = search,
    targetSort = sortBy,
  ) => {
    startTransition(async () => {
      const res = await getModeratedReviewsAction({
        page: targetPage,
        pageSize,
        status: targetStatus,
        search: targetSearch,
        sortBy: targetSort,
      });

      if (res.success && res.data) {
        setReviews(res.data.reviews);
        setTotal(res.data.total);
        setPage(res.data.page);
        setCounts(res.data.statusCounts);
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Failed to load reviews.",
        });
      }
    });
  };

  const handleStatusFilterChange = (
    newStatus: "all" | ReviewModerationStatus,
  ) => {
    setStatusFilter(newStatus);
    fetchReviews(1, newStatus, search, sortBy);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReviews(1, statusFilter, search, sortBy);
  };

  const handleSortChange = (
    newSort: "newest" | "oldest" | "rating_desc" | "rating_asc",
  ) => {
    setSortBy(newSort);
    fetchReviews(1, statusFilter, search, newSort);
  };

  const handleStatusChange = async (
    reviewId: string,
    newStatus: ReviewModerationStatus,
  ) => {
    setFeedback(null);
    const res = await updateReviewStatusAction(reviewId, newStatus);
    if (res.success) {
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, status: newStatus } : r)),
      );
      // Update count indicators locally
      fetchReviews(page, statusFilter, search, sortBy);
      setFeedback({
        type: "success",
        message: `Review successfully updated to "${newStatus}".`,
      });
    } else {
      setFeedback({
        type: "error",
        message: res.error || "Failed to update review status.",
      });
    }
  };

  const handleDelete = async (reviewId: string) => {
    setFeedback(null);
    const res = await deleteReviewAction(reviewId);
    if (res.success) {
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      setTotal((prev) => Math.max(0, prev - 1));
      fetchReviews(page, statusFilter, search, sortBy);
      setFeedback({
        type: "success",
        message: "Review permanently deleted.",
      });
    } else {
      setFeedback({
        type: "error",
        message: res.error || "Failed to delete review.",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation tabs */}
      <AdminNavTabs />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 ">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
            User Reviews Moderation
          </h1>
        </div>
      </div>

      <div className="bg-brand-surface border border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-neutral-800/80">
          <button
            type="button"
            onClick={() => handleStatusFilterChange("all")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === "all"
                ? " text-white"
                : "text-neutral-400 hover:text-white hover:bg-neutral-900"
            }`}
          >
            <span>All Reviews</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-neutral-900 text-neutral-300">
              {counts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleStatusFilterChange("pending")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === "pending"
                ? "text-amber-300"
                : "text-neutral-400 hover:text-amber-300 hover:bg-neutral-900"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-neutral-900 text-amber-400 font-bold">
              {counts.pending}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleStatusFilterChange("flagged")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === "flagged"
                ? " text-rose-300"
                : "text-neutral-400 hover:text-rose-300 hover:bg-neutral-900"
            }`}
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Flagged</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-neutral-900 text-rose-400 font-bold">
              {counts.flagged}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleStatusFilterChange("approved")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === "approved"
                ? "text-emerald-300"
                : "text-neutral-400 hover:text-emerald-300 hover:bg-neutral-900"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approved</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-neutral-900 text-emerald-400">
              {counts.approved}
            </span>
          </button>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Form */}
          <form
            onSubmit={handleSearchSubmit}
            className="relative w-full sm:w-80"
          >
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search in review commentary..."
              className="w-full bg-neutral-900 border border-neutral-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-brand-lime transition-colors"
            />
          </form>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <ListFilter className="w-4 h-4 text-neutral-400" />
            <span className="text-xs text-neutral-400">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) =>
                handleSortChange(
                  e.target.value as
                    | "newest"
                    | "oldest"
                    | "rating_desc"
                    | "rating_asc",
                )
              }
              className="bg-neutral-900 border border-neutral-700/80 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-lime transition-colors cursor-pointer"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="rating_desc">Highest score (10–1)</option>
              <option value="rating_asc">Lowest score (1–10)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center gap-3 ${
            feedback.type === "success" ? "text-emerald-300" : " text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-neutral-100 hover:text-white font-mono cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Reviews List */}
      {isPending ? (
        <div className="flex flex-col items-center justify-center py-16 text-neutral-400 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-brand-lime" />
          <span className="text-xs font-mono">Loading reviews...</span>
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-brand-surface border border-neutral-800 rounded-2xl p-12 text-center text-xs text-neutral-400 space-y-2">
          <MessageSquare className="w-8 h-8 text-neutral-600 mx-auto" />
          <p className="text-sm font-semibold text-white">No reviews found</p>
          <p>There are no reviews matching your active filter criteria.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <ReviewModerationCard
              key={review.id}
              review={review}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-neutral-800 text-xs text-neutral-400">
          <span>
            Showing page <strong>{page}</strong> of{" "}
            <strong>{totalPages}</strong> ({total} total reviews)
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || isPending}
              onClick={() => fetchReviews(page - 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 hover:border-neutral-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <button
              type="button"
              disabled={page >= totalPages || isPending}
              onClick={() => fetchReviews(page + 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 hover:border-neutral-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
