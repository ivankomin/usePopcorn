import { createAdminClient } from "@/lib/supabase/admin";
import type {
  LogCategory,
  LogLevel,
  ManagedUserItem,
  ManagedUserSortOption,
  ManagedUsersResult,
  ManagedUserStatusFilter,
  ModeratedReviewItem,
  ModeratedReviewsResult,
  ReviewModerationStatus,
  SystemLogItem,
  SystemLogsResult,
} from "@/types/media";

export interface GetModeratedReviewsParams {
  status?: "all" | ReviewModerationStatus;
  search?: string;
  sortBy?: "newest" | "oldest" | "rating_desc" | "rating_asc";
  page?: number;
  pageSize?: number;
}

export interface GetManagedUsersParams {
  status?: ManagedUserStatusFilter;
  search?: string;
  sortBy?: ManagedUserSortOption;
  page?: number;
  pageSize?: number;
}

export interface GetSystemLogsParams {
  level?: "all" | LogLevel;
  category?: "all" | LogCategory;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface SystemLogsFilterOptions {
  level?: "all" | LogLevel;
  category?: "all" | LogCategory;
  search?: string;
}

const VALID_LOG_LEVELS = new Set<LogLevel>(["info", "warn", "error", "critical"]);
const VALID_LOG_CATEGORIES = new Set<LogCategory>([
  "system",
  "auth",
  "admin",
  "db",
  "sync",
]);

/**
 * Clamps pagination inputs to safe positive bounds and computes PostgREST `.range()` indices.
 */
export function normalizePagination(
  page = 1,
  pageSize = 15,
  maxPageSize = 100
): { page: number; pageSize: number; from: number; to: number } {
  const safePageSize = Math.min(
    maxPageSize,
    Math.max(1, Number.isFinite(pageSize) ? Math.trunc(pageSize) : 15)
  );
  const safePage = Math.max(1, Number.isFinite(page) ? Math.trunc(page) : 1);
  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;
  return { page: safePage, pageSize: safePageSize, from, to };
}

/**
 * Shared system_logs query builder used by both the Admin Logs dashboard
 * and the `/api/admin/logs/export` endpoint.
 */
export function buildSystemLogsQuery(
  adminClient: ReturnType<typeof createAdminClient>,
  filters: SystemLogsFilterOptions,
  options?: { withCount?: boolean }
) {
  let query = adminClient
    .from("system_logs")
    .select(
      `
      id,
      created_at,
      level,
      category,
      action,
      message,
      actor_id,
      metadata,
      actor:profiles!system_logs_actor_id_fkey(
        id,
        username,
        role
      )
    `,
      options?.withCount ? { count: "exact" } : undefined
    )
    .order("created_at", { ascending: false });

  if (filters.level && filters.level !== "all" && VALID_LOG_LEVELS.has(filters.level)) {
    query = query.eq("level", filters.level);
  }

  if (
    filters.category &&
    filters.category !== "all" &&
    VALID_LOG_CATEGORIES.has(filters.category)
  ) {
    query = query.eq("category", filters.category);
  }

  const trimmedSearch = (filters.search || "")
    .trim()
    .replace(/[%_,()."\\]/g, "");
  if (trimmedSearch) {
    query = query.or(
      `message.ilike.%${trimmedSearch}%,action.ilike.%${trimmedSearch}%`
    );
  }

  return query;
}

/**
 * Internal query for paginated moderated reviews + status counts.
 * Callers must authorize admin access beforehand via `requireAdmin()` or `verifyAdminSession()`.
 */
export async function fetchModeratedReviews(
  params: GetModeratedReviewsParams = {}
): Promise<ModeratedReviewsResult> {
  const {
    status = "all",
    search = "",
    sortBy = "newest",
  } = params;
  const { page, pageSize, from, to } = normalizePagination(
    params.page ?? 1,
    params.pageSize ?? 15
  );

  const adminClient = createAdminClient();

  const [allCountRes, approvedCountRes, pendingCountRes, flaggedCountRes] =
    await Promise.all([
      adminClient.from("reviews").select("*", { count: "exact", head: true }),
      adminClient
        .from("reviews")
        .select("*", { count: "exact", head: true })
        .eq("status", "approved"),
      adminClient
        .from("reviews")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
      adminClient
        .from("reviews")
        .select("*", { count: "exact", head: true })
        .eq("status", "flagged"),
    ]);

  const statusCounts = {
    all: allCountRes.count ?? 0,
    approved: approvedCountRes.count ?? 0,
    pending: pendingCountRes.count ?? 0,
    flagged: flaggedCountRes.count ?? 0,
  };

  let query = adminClient
    .from("reviews")
    .select(
      `
      id,
      user_id,
      media_id,
      rating,
      content,
      status,
      created_at,
      updated_at,
      profile:profiles!reviews_user_id_fkey(
        id,
        username,
        avatar_url,
        role
      ),
      media:media_items!reviews_media_id_fkey(
        id,
        title,
        release_year,
        poster_path,
        media_type
      )
    `,
      { count: "exact" }
    );

  if (status !== "all") {
    query = query.eq("status", status);
  }

  if (search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.ilike("content", term);
  }

  switch (sortBy) {
    case "oldest":
      query = query.order("created_at", { ascending: true });
      break;
    case "rating_desc":
      query = query.order("rating", { ascending: false, nullsFirst: false });
      break;
    case "rating_asc":
      query = query.order("rating", { ascending: true, nullsFirst: false });
      break;
    case "newest":
    default:
      query = query.order("created_at", { ascending: false });
      break;
  }

  const { data, count, error } = await query.range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    reviews: (data as unknown as ModeratedReviewItem[]) || [],
    total,
    page,
    pageSize,
    totalPages,
    statusCounts,
  };
}

/**
 * Internal query for registered users with auth metadata and activity counts.
 * Callers must authorize admin access beforehand.
 */
export async function fetchManagedUsers(
  params: GetManagedUsersParams = {}
): Promise<ManagedUsersResult> {
  const {
    status = "all",
    search = "",
    sortBy = "newest",
  } = params;
  const { page, pageSize } = normalizePagination(
    params.page ?? 1,
    params.pageSize ?? 15
  );

  const adminClient = createAdminClient();

  const [profilesRes, reviewsRes, watchlistsRes, authUsersMap] =
    await Promise.all([
      adminClient
        .from("profiles")
        .select(
          "id, username, avatar_url, role, is_blocked, blocked_reason, blocked_at, created_at"
        ),
      adminClient.from("reviews").select("user_id"),
      adminClient.from("watchlists").select("user_id"),
      (async () => {
        const map = new Map<
          string,
          {
            email: string | null;
            last_sign_in_at: string | null;
            banned_until: string | null;
          }
        >();
        const perPage = 1000;
        for (let authPage = 1; ; authPage++) {
          const { data, error } = await adminClient.auth.admin.listUsers({
            page: authPage,
            perPage,
          });
          if (error) {
            throw new Error(error.message);
          }
          const batch = data?.users || [];
          for (const u of batch) {
            map.set(u.id, {
              email: u.email ?? null,
              last_sign_in_at: u.last_sign_in_at ?? null,
              banned_until:
                (u as { banned_until?: string | null }).banned_until ?? null,
            });
          }
          if (batch.length < perPage) break;
        }
        return map;
      })(),
    ]);

  if (profilesRes.error) {
    throw new Error(profilesRes.error.message);
  }

  const reviewCounts = new Map<string, number>();
  for (const r of reviewsRes.data || []) {
    if (!r.user_id) continue;
    reviewCounts.set(r.user_id, (reviewCounts.get(r.user_id) || 0) + 1);
  }

  const watchlistCounts = new Map<string, number>();
  for (const w of watchlistsRes.data || []) {
    watchlistCounts.set(w.user_id, (watchlistCounts.get(w.user_id) || 0) + 1);
  }

  const nowMs = Date.now();
  const allUsers: ManagedUserItem[] = (profilesRes.data || []).map((p) => {
    const authInfo = authUsersMap.get(p.id);
    const isAuthBanned = Boolean(
      authInfo?.banned_until &&
        new Date(authInfo.banned_until).getTime() > nowMs
    );
    return {
      id: p.id,
      username: p.username,
      email: authInfo?.email ?? null,
      avatar_url: p.avatar_url,
      role: p.role === "admin" ? "admin" : "user",
      is_blocked: Boolean(p.is_blocked || isAuthBanned),
      blocked_reason: p.blocked_reason,
      blocked_at: p.blocked_at,
      created_at: p.created_at,
      last_sign_in_at: authInfo?.last_sign_in_at ?? null,
      reviews_count: reviewCounts.get(p.id) || 0,
      watchlist_count: watchlistCounts.get(p.id) || 0,
    };
  });

  const counts = {
    all: allUsers.length,
    active: allUsers.filter((u) => !u.is_blocked).length,
    blocked: allUsers.filter((u) => u.is_blocked).length,
    admin: allUsers.filter((u) => u.role === "admin").length,
  };

  let filtered = allUsers;
  if (status === "active") {
    filtered = filtered.filter((u) => !u.is_blocked);
  } else if (status === "blocked") {
    filtered = filtered.filter((u) => u.is_blocked);
  } else if (status === "admin") {
    filtered = filtered.filter((u) => u.role === "admin");
  }

  const term = search.trim().toLowerCase();
  if (term) {
    filtered = filtered.filter(
      (u) =>
        u.username.toLowerCase().includes(term) ||
        (u.email && u.email.toLowerCase().includes(term))
    );
  }

  filtered = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "oldest":
        return (
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      case "username_asc":
        return a.username.localeCompare(b.username);
      case "reviews_desc":
        return (
          b.reviews_count - a.reviews_count ||
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      case "newest":
      default:
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const paginatedUsers = filtered.slice(start, start + pageSize);

  return {
    users: paginatedUsers,
    total,
    page: safePage,
    pageSize,
    totalPages,
    counts,
  };
}

/**
 * Internal query for paginated structured system logs + level counts.
 * Callers must authorize admin access beforehand.
 */
export async function fetchSystemLogs(
  params: GetSystemLogsParams = {}
): Promise<SystemLogsResult> {
  const { level = "all", category = "all", search = "" } = params;
  const { page, pageSize, from, to } = normalizePagination(
    params.page ?? 1,
    params.pageSize ?? 20
  );

  const adminClient = createAdminClient();

  const [allRes, infoRes, warnRes, errorRes, criticalRes] = await Promise.all([
    adminClient.from("system_logs").select("*", { count: "exact", head: true }),
    adminClient
      .from("system_logs")
      .select("*", { count: "exact", head: true })
      .eq("level", "info"),
    adminClient
      .from("system_logs")
      .select("*", { count: "exact", head: true })
      .eq("level", "warn"),
    adminClient
      .from("system_logs")
      .select("*", { count: "exact", head: true })
      .eq("level", "error"),
    adminClient
      .from("system_logs")
      .select("*", { count: "exact", head: true })
      .eq("level", "critical"),
  ]);

  const levelCounts = {
    all: allRes.count ?? 0,
    info: infoRes.count ?? 0,
    warn: warnRes.count ?? 0,
    error: errorRes.count ?? 0,
    critical: criticalRes.count ?? 0,
  };

  const query = buildSystemLogsQuery(
    adminClient,
    { level, category, search },
    { withCount: true }
  );

  const { data, count, error } = await query.range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    logs: (data as unknown as SystemLogItem[]) || [],
    total,
    page,
    pageSize,
    totalPages,
    levelCounts,
  };
}
