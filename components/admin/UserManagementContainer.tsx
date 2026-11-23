"use client";

import { useState, useTransition } from "react";
import {
  Users,
  CheckCircle2,
  Ban,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { AdminNavTabs } from "./AdminNavTabs";
import { UserManagementCard } from "./UserManagementCard";
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
  getManagedUsersAction,
  toggleUserBlockAction,
} from "@/app/actions/admin";
import type {
  ManagedUserItem,
  ManagedUsersCounts,
  ManagedUserStatusFilter,
  ManagedUserSortOption,
} from "@/types/media";

export interface UserManagementContainerProps {
  initialUsers: ManagedUserItem[];
  initialTotal: number;
  initialCounts: ManagedUsersCounts;
  currentAdminId: string;
  initialPage?: number;
  initialPageSize?: number;
}

const USER_SORT_OPTIONS: AdminSelectOption<ManagedUserSortOption>[] = [
  { value: "newest", label: "Newest registered" },
  { value: "oldest", label: "Oldest registered" },
  { value: "username_asc", label: "Username (A–Z)" },
  { value: "reviews_desc", label: "Most reviews" },
];

export function UserManagementContainer({
  initialUsers,
  initialTotal,
  initialCounts,
  currentAdminId,
  initialPage = 1,
  initialPageSize = 15,
}: UserManagementContainerProps) {
  const pageSize = initialPageSize;
  const [users, setUsers] = useState<ManagedUserItem[]>(initialUsers);
  const [counts, setCounts] = useState<ManagedUsersCounts>(initialCounts);
  const [total, setTotal] = useState<number>(initialTotal);
  const [page, setPage] = useState<number>(initialPage);

  const [statusFilter, setStatusFilter] =
    useState<ManagedUserStatusFilter>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<ManagedUserSortOption>("newest");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<AdminFeedbackData | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const fetchUsers = (
    targetPage: number,
    targetStatus = statusFilter,
    targetSearch = search,
    targetSort = sortBy,
  ) => {
    startTransition(async () => {
      const res = await getManagedUsersAction({
        page: targetPage,
        pageSize,
        status: targetStatus,
        search: targetSearch,
        sortBy: targetSort,
      });

      if (res.success && res.data) {
        setUsers(res.data.users);
        setTotal(res.data.total);
        setPage(res.data.page);
        setCounts(res.data.counts);
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Failed to load registered users.",
        });
      }
    });
  };

  const handleStatusFilterChange = (newStatus: ManagedUserStatusFilter) => {
    setStatusFilter(newStatus);
    fetchUsers(1, newStatus, search, sortBy);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(1, statusFilter, search, sortBy);
  };

  const handleSortChange = (newSort: ManagedUserSortOption) => {
    setSortBy(newSort);
    fetchUsers(1, statusFilter, search, newSort);
  };

  const handleToggleBlock = async (
    userId: string,
    shouldBlock: boolean,
    reason?: string,
  ) => {
    setFeedback(null);
    const target = users.find((u) => u.id === userId);
    const res = await toggleUserBlockAction(userId, shouldBlock, reason);

    if (res.success && res.data) {
      const updated = res.data;
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                is_blocked: updated.is_blocked,
                blocked_reason: updated.blocked_reason,
                blocked_at: updated.blocked_at,
              }
            : u,
        ),
      );
      fetchUsers(page, statusFilter, search, sortBy);
      setFeedback({
        type: "success",
        message: shouldBlock
          ? `User "${target?.username || userId}" has been blocked.`
          : `User "${target?.username || userId}" has been unblocked.`,
      });
    } else {
      setFeedback({
        type: "error",
        message: res.error || "Failed to update user block status.",
      });
    }
  };

  const statusTabs: AdminFilterTab<ManagedUserStatusFilter>[] = [
    {
      value: "all",
      label: "All Users",
      count: counts.all,
      activeClassName: "text-white bg-neutral-800/70",
      inactiveClassName: "text-neutral-400 hover:text-white hover:bg-neutral-900",
      badgeClassName: "text-neutral-300",
    },
    {
      value: "active",
      label: "Active",
      count: counts.active,
      icon: CheckCircle2,
      activeClassName: "text-emerald-300 bg-neutral-800/70",
      inactiveClassName:
        "text-neutral-400 hover:text-emerald-300 hover:bg-neutral-900",
      badgeClassName: "text-emerald-400",
    },
    {
      value: "blocked",
      label: "Blocked",
      count: counts.blocked,
      icon: Ban,
      activeClassName: "text-rose-300 bg-neutral-800/70",
      inactiveClassName:
        "text-neutral-400 hover:text-rose-300 hover:bg-neutral-900",
      badgeClassName: "text-rose-400 font-bold",
    },
    {
      value: "admin",
      label: "Admins",
      count: counts.admin,
      icon: ShieldCheck,
      activeClassName: "text-brand-lime bg-neutral-800/70",
      inactiveClassName:
        "text-neutral-400 hover:text-brand-lime hover:bg-neutral-900",
      badgeClassName: "text-brand-lime",
    },
  ];

  return (
    <div className="space-y-6">
      <AdminNavTabs />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Registered Users Management
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Inspect registered accounts and block or restore access for rule
            violations.
          </p>
        </div>
      </div>

      <AdminFilterBar
        tabs={statusTabs}
        activeTab={statusFilter}
        onTabChange={handleStatusFilterChange}
        search={search}
        onSearchChange={setSearch}
        onSearchSubmit={handleSearchSubmit}
        searchPlaceholder="Search by username or email..."
        selectLabel="Sort by:"
        selectValue={sortBy}
        selectOptions={USER_SORT_OPTIONS}
        onSelectChange={handleSortChange}
      />

      <AdminFeedbackBanner
        feedback={feedback}
        onDismiss={() => setFeedback(null)}
        variant="bordered"
      />

      {isPending ? (
        <div className="flex flex-col items-center justify-center py-16 text-neutral-400 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-brand-lime" />
          <span className="text-xs font-mono">Loading users...</span>
        </div>
      ) : users.length === 0 ? (
        <div className="bg-brand-surface border border-neutral-800 rounded-2xl p-12 text-center text-xs text-neutral-400 space-y-2">
          <Users className="w-8 h-8 text-neutral-600 mx-auto" />
          <p className="text-sm font-semibold text-white">No users found</p>
          <p>There are no registered users matching your active filter.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {users.map((managedUser) => (
            <UserManagementCard
              key={managedUser.id}
              user={managedUser}
              currentAdminId={currentAdminId}
              onToggleBlock={handleToggleBlock}
            />
          ))}
        </div>
      )}

      <AdminPagination
        page={page}
        totalPages={totalPages}
        total={total}
        itemLabel="total users"
        isPending={isPending}
        onPageChange={(nextPage) => fetchUsers(nextPage)}
      />
    </div>
  );
}
