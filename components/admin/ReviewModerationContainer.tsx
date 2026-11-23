"use client";

import { useState, useTransition } from "react";
import {
  CheckCircle2,
  Clock,
  Flag,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { AdminNavTabs } from "./AdminNavTabs";
import { ReviewModerationCard } from "./ReviewModerationCard";
import { AdminPagination } from "./AdminPagination";
import {
  AdminFilterBar,
  type AdminFilterTab,
  type AdminSelectOption,
} from "./AdminFilterBar";
import {
  AdminFeedbackBanner,
  type AdminFeedbackData,
} from "./AdminFeedbackBanner";
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

type ReviewSortOption = "newest" | "oldest" | "rating_desc" | "rating_asc";

const REVIEW_SORT_OPTIONS: AdminSelectOption<ReviewSortOption>[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "rating_desc", label: "Highest score (10–1)" },
  { value: "rating_asc", label: "Lowest score (1–10)" },
];

export function ReviewModerationContainer({
  initialReviews,
  initialTotal,
  initialCounts,
  initialPage = 1,
  initialPageSize = 15,
}: ReviewModerationContainerProps) {
  const pageSize = initialPageSize;
  const [reviews, setReviews] = useState<ModeratedReviewItem[]>(initialReviews);
  const [counts, setCounts] = useState<ModeratedReviewsCounts>(initialCounts);
  const [total, setTotal] = useState<number>(initialTotal);
  const [page, setPage] = useState<number>(initialPage);

  const [statusFilter, setStatusFilter] = useState<
    "all" | ReviewModerationStatus
  >("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<ReviewSortOption>("newest");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<AdminFeedbackData | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

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

  const handleSortChange = (newSort: ReviewSortOption) => {
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

  const statusTabs: AdminFilterTab<"all" | ReviewModerationStatus>[] = [
    {
      value: "all",
      label: "All Reviews",
      count: counts.all,
      activeClassName: " text-white",
      inactiveClassName: "text-neutral-400 hover:text-white hover:bg-neutral-900",
      badgeClassName: "text-neutral-300",
    },
    {
      value: "pending",
      label: "Pending",
      count: counts.pending,
      icon: Clock,
      activeClassName: "text-amber-300",
      inactiveClassName:
        "text-neutral-400 hover:text-amber-300 hover:bg-neutral-900",
      badgeClassName: "text-amber-400 font-bold",
    },
    {
      value: "flagged",
      label: "Flagged",
      count: counts.flagged,
      icon: Flag,
      activeClassName: " text-rose-300",
      inactiveClassName:
        "text-neutral-400 hover:text-rose-300 hover:bg-neutral-900",
      badgeClassName: "text-rose-400 font-bold",
    },
    {
      value: "approved",
      label: "Approved",
      count: counts.approved,
      icon: CheckCircle2,
      activeClassName: "text-emerald-300",
      inactiveClassName:
        "text-neutral-400 hover:text-emerald-300 hover:bg-neutral-900",
      badgeClassName: "text-emerald-400",
    },
  ];

  return (
    <div className="space-y-6">
      <AdminNavTabs />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 ">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
            User Reviews Moderation
          </h1>
        </div>
      </div>

      <AdminFilterBar
        tabs={statusTabs}
        activeTab={statusFilter}
        onTabChange={handleStatusFilterChange}
        search={search}
        onSearchChange={setSearch}
        onSearchSubmit={handleSearchSubmit}
        searchPlaceholder="Search in review commentary..."
        selectLabel="Sort by:"
        selectValue={sortBy}
        selectOptions={REVIEW_SORT_OPTIONS}
        onSelectChange={handleSortChange}
      />

      <AdminFeedbackBanner
        feedback={feedback}
        onDismiss={() => setFeedback(null)}
        variant="minimal"
      />

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

      <AdminPagination
        page={page}
        totalPages={totalPages}
        total={total}
        itemLabel="total reviews"
        isPending={isPending}
        onPageChange={(nextPage) => fetchReviews(nextPage)}
      />
    </div>
  );
}
