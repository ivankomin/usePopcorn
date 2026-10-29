import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getModeratedReviewsAction } from "@/app/actions/admin";
import { ReviewModerationContainer } from "@/components/admin";
import AdminReviewsLoading from "./loading";

export const metadata = {
  title: "Review Moderation | usePopcorn Admin",
  description: "Administrative moderation and inspection for community user evaluations.",
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
  const supabase = await createServerClient();

  // 1. Authenticate user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login?next=/admin/reviews");
  }

  // 2. Authorize role: 'admin'
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    redirect("/profile");
  }

  // 3. Resolve search params & fetch reviews
  const resolvedParams = await searchParams;
  const statusParam = (resolvedParams.status as "all" | "approved" | "pending" | "flagged") || "all";
  const searchParam = resolvedParams.search || "";
  const sortParam = (resolvedParams.sortBy as "newest" | "oldest" | "rating_desc" | "rating_asc") || "newest";
  const pageParam = parseInt(resolvedParams.page || "1", 10) || 1;

  const result = await getModeratedReviewsAction({
    status: statusParam,
    search: searchParam,
    sortBy: sortParam,
    page: pageParam,
    pageSize: 15,
  });

  const reviewsData = result.success && result.data ? result.data : {
    reviews: [],
    total: 0,
    page: 1,
    pageSize: 15,
    totalPages: 1,
    statusCounts: { all: 0, approved: 0, pending: 0, flagged: 0 },
  };

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

export default async function AdminReviewsPage({ searchParams }: AdminReviewsPageProps) {
  await connection();
  return (
    <div className="min-h-screen bg-[#0f0f0f] py-8 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={<AdminReviewsLoading />}>
        <AdminReviewsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
