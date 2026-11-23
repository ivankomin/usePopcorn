import { Suspense } from "react";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { fetchModeratedReviews } from "@/lib/admin-queries";
import { ReviewModerationContainer } from "@/components/admin";
import AdminReviewsLoading from "./loading";

export const metadata = {
  title: "Review Moderation | usePopcorn Admin",
  description:
    "Administrative moderation and inspection for community user evaluations.",
};

export const instant = false;

interface AdminReviewsPageProps {
  searchParams: Promise<{
    status?: string;
    search?: string;
    sortBy?: string;
    page?: string;
  }>;
}

async function AdminReviewsContent({ searchParams }: AdminReviewsPageProps) {
  await connection();
  await requireAdmin("/admin/reviews");

  const resolvedParams = await searchParams;
  const statusParam =
    (resolvedParams.status as "all" | "approved" | "pending" | "flagged") ||
    "all";
  const searchParam = resolvedParams.search || "";
  const sortParam =
    (resolvedParams.sortBy as
      | "newest"
      | "oldest"
      | "rating_desc"
      | "rating_asc") || "newest";
  const pageParam = parseInt(resolvedParams.page || "1", 10) || 1;

  let reviewsData = {
    reviews: [] as Awaited<ReturnType<typeof fetchModeratedReviews>>["reviews"],
    total: 0,
    page: 1,
    pageSize: 15,
    totalPages: 1,
    statusCounts: { all: 0, approved: 0, pending: 0, flagged: 0 },
  };

  try {
    reviewsData = await fetchModeratedReviews({
      status: statusParam,
      search: searchParam,
      sortBy: sortParam,
      page: pageParam,
      pageSize: 15,
    });
  } catch {
    // Render empty state gracefully if query fails
  }

  return (
    <div className="max-w-5xl mx-auto">
      <ReviewModerationContainer
        initialReviews={reviewsData.reviews}
        initialTotal={reviewsData.total}
        initialCounts={reviewsData.statusCounts}
        initialPage={reviewsData.page}
        initialPageSize={reviewsData.pageSize}
      />
    </div>
  );
}

export default async function AdminReviewsPage({
  searchParams,
}: AdminReviewsPageProps) {
  await connection();
  return (
    <div className="min-h-screen bg-[#0f0f0f] py-8 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={<AdminReviewsLoading />}>
        <AdminReviewsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
