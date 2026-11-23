import { Suspense } from "react";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { fetchManagedUsers } from "@/lib/admin-queries";
import { UserManagementContainer } from "@/components/admin";
import type {
  ManagedUserStatusFilter,
  ManagedUserSortOption,
} from "@/types/media";
import AdminUsersLoading from "./loading";

export const metadata = {
  title: "User Management | usePopcorn Admin",
  description:
    "View registered accounts and manage user access on usePopcorn.",
};

export const instant = false;

interface AdminUsersPageProps {
  searchParams: Promise<{
    status?: string;
    search?: string;
    sortBy?: string;
    page?: string;
  }>;
}

async function AdminUsersContent({ searchParams }: AdminUsersPageProps) {
  await connection();
  const { user } = await requireAdmin("/admin/users");

  const resolvedParams = await searchParams;
  const statusParam =
    (resolvedParams.status as ManagedUserStatusFilter) || "all";
  const searchParam = resolvedParams.search || "";
  const sortParam =
    (resolvedParams.sortBy as ManagedUserSortOption) || "newest";
  const pageParam = parseInt(resolvedParams.page || "1", 10) || 1;

  let usersData = {
    users: [] as Awaited<ReturnType<typeof fetchManagedUsers>>["users"],
    total: 0,
    page: 1,
    pageSize: 15,
    totalPages: 1,
    counts: { all: 0, active: 0, blocked: 0, admin: 0 },
  };

  try {
    usersData = await fetchManagedUsers({
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
      <UserManagementContainer
        initialUsers={usersData.users}
        initialTotal={usersData.total}
        initialCounts={usersData.counts}
        currentAdminId={user.id}
        initialPage={usersData.page}
        initialPageSize={usersData.pageSize}
      />
    </div>
  );
}

export default async function AdminUsersPage({
  searchParams,
}: AdminUsersPageProps) {
  await connection();
  return (
    <div className="min-h-screen bg-[#0f0f0f] py-8 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={<AdminUsersLoading />}>
        <AdminUsersContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
