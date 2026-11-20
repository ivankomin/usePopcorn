"use client";

import { useState, useTransition } from "react";
import {
  Search,
  Users,
  CheckCircle2,
  Ban,
  ShieldCheck,
  ListFilter,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { AdminNavTabs } from "./AdminNavTabs";
import { UserManagementCard } from "./UserManagementCard";
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

export function UserManagementContainer({
  initialUsers,
  initialTotal,
  initialCounts,
  currentAdminId,
  initialPage = 1,
  initialPageSize = 15,
}: UserManagementContainerProps) {
  const [users, setUsers] = useState<ManagedUserItem[]>(initialUsers);
  const [counts, setCounts] = useState<ManagedUsersCounts>(initialCounts);
  const [total, setTotal] = useState<number>(initialTotal);
  const [page, setPage] = useState<number>(initialPage);
  const [pageSize] = useState<number>(initialPageSize);

  const [statusFilter, setStatusFilter] =
    useState<ManagedUserStatusFilter>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<ManagedUserSortOption>("newest");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

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
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                is_blocked: res.data!.is_blocked,
                blocked_reason: res.data!.blocked_reason,
                blocked_at: res.data!.blocked_at,
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

  return (
    <div className="space-y-6">
      {/* Admin Navigation Tabs */}
      <AdminNavTabs />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Registered Users Management
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Inspect registered accounts and block or restore access for rule violations.
          </p>
        </div>
      </div>

      {/* Filters & Controls Card */}
      <div className="bg-brand-surface border border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-neutral-800/80">
          <button
            type="button"
            onClick={() => handleStatusFilterChange("all")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === "all"
                ? "text-white bg-neutral-800/70"
                : "text-neutral-400 hover:text-white hover:bg-neutral-900"
            }`}
          >
            <span>All Users</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-neutral-900 text-neutral-300">
              {counts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleStatusFilterChange("active")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === "active"
                ? "text-emerald-300 bg-neutral-800/70"
                : "text-neutral-400 hover:text-emerald-300 hover:bg-neutral-900"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Active</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-neutral-900 text-emerald-400">
              {counts.active}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleStatusFilterChange("blocked")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === "blocked"
                ? "text-rose-300 bg-neutral-800/70"
                : "text-neutral-400 hover:text-rose-300 hover:bg-neutral-900"
            }`}
          >
            <Ban className="w-3.5 h-3.5" />
            <span>Blocked</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-neutral-900 text-rose-400 font-bold">
              {counts.blocked}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleStatusFilterChange("admin")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === "admin"
                ? "text-brand-lime bg-neutral-800/70"
                : "text-neutral-400 hover:text-brand-lime hover:bg-neutral-900"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admins</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-neutral-900 text-brand-lime">
              {counts.admin}
            </span>
          </button>
        </div>

        {/* Search & Sort Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <form
            onSubmit={handleSearchSubmit}
            className="relative w-full sm:w-80"
          >
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by username or email..."
              className="w-full bg-neutral-900 border border-neutral-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-brand-lime transition-colors"
            />
          </form>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <ListFilter className="w-4 h-4 text-neutral-400" />
            <span className="text-xs text-neutral-400">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) =>
                handleSortChange(e.target.value as ManagedUserSortOption)
              }
              className="bg-neutral-900 border border-neutral-700/80 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-lime transition-colors cursor-pointer"
            >
              <option value="newest">Newest registered</option>
              <option value="oldest">Oldest registered</option>
              <option value="username_asc">Username (A–Z)</option>
              <option value="reviews_desc">Most reviews</option>
            </select>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-3 border ${
            feedback.type === "success"
              ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
              : "bg-rose-950/20 border-rose-500/30 text-rose-300"
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
            className="text-neutral-300 hover:text-white font-mono cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Users List */}
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-neutral-800 text-xs text-neutral-400">
          <span>
            Showing page <strong>{page}</strong> of{" "}
            <strong>{totalPages}</strong> ({total} total users)
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || isPending}
              onClick={() => fetchUsers(page - 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 hover:border-neutral-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <button
              type="button"
              disabled={page >= totalPages || isPending}
              onClick={() => fetchUsers(page + 1)}
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
