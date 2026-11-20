"use server";

import { revalidatePath } from "next/cache";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  MediaMetadata,
  ModeratedReviewItem,
  ModeratedReviewsResult,
  ReviewModerationStatus,
  ManagedUserItem,
  ManagedUsersResult,
  ManagedUserStatusFilter,
  ManagedUserSortOption,
} from "@/types/media";
import type { Json } from "@/types/database.types";

export interface SystemStateData {
  status: "Free" | "Updating";
  message: string | null;
  updated_at: string | null;
}

export interface IngestMediaInput {
  title: string;
  original_title?: string | null;
  media_type: "movie" | "tv";
  release_year: number;
  release_date?: string | null;
  runtime?: number | null;
  seasons_count?: number | null;
  episodes_count?: number | null;
  overview?: string | null;
  status?: string | null;
  poster_path?: string | null;
  budget?: number | null;
  revenue?: number | null;
  age_rating?: string | null;
  country?: string | null;
  countries?: string[];
  genre_ids: number[];
  directors?: string[];
  cast?: string[];
  tagline?: string | null;
}

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

function calculateBudgetCategory(budget?: number | null): string | null {
  if (!budget || budget <= 0) return null;
  if (budget < 15_000_000) return "Low (< $15M)";
  if (budget <= 60_000_000) return "Medium ($15M–$60M)";
  if (budget <= 120_000_000) return "High ($60M–$120M)";
  return "Blockbuster (> $120M)";
}

/**
 * Validates that the active session belongs to a user with the 'admin' role.
 */
export async function verifyAdminSession() {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { isAdmin: false, user: null, error: "Authentication required" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return { isAdmin: false, user, error: "Administrator privileges required" };
  }

  return { isAdmin: true, user, error: null };
}

/**
 * Retrieves the current operational state of the system ("Free" vs. "Updating").
 */
export async function getSystemStateAction(): Promise<SystemStateData> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("system_state")
    .select("status, message, updated_at")
    .eq("id", "sync_status")
    .maybeSingle();

  if (error || !data) {
    return {
      status: "Free",
      message: null,
      updated_at: null,
    };
  }

  return {
    status: (data.status as "Free" | "Updating") || "Free",
    message: data.message,
    updated_at: data.updated_at,
  };
}

/**
 * Toggles the system operational lock ("Free" vs. "Updating") (FR-19).
 */
export async function setSystemStateAction(
  status: "Free" | "Updating",
  message?: string
): Promise<ActionResult> {
  const auth = await verifyAdminSession();
  if (!auth.isAdmin) {
    return { success: false, error: auth.error || "Unauthorized" };
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("system_state")
    .upsert({
      id: "sync_status",
      status,
      message: message ?? (status === "Updating" ? "Background synchronization active" : "System operational"),
      updated_at: new Date().toISOString(),
    });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin");
  return { success: true };
}

/**
 * Checks for existing catalog items matching title and release year (FR-17).
 */
export async function checkDuplicateMediaAction(
  title: string,
  releaseYear: number
): Promise<{ exists: boolean; existingItem?: { id: string; title: string; release_year: number } }> {
  const cleanTitle = title.trim();
  if (!cleanTitle || !releaseYear) {
    return { exists: false };
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("media_items")
    .select("id, title, release_year")
    .ilike("title", cleanTitle)
    .eq("release_year", releaseYear)
    .maybeSingle();

  if (error || !data) {
    return { exists: false };
  }

  return {
    exists: true,
    existingItem: {
      id: data.id,
      title: data.title,
      release_year: data.release_year,
    },
  };
}

/**
 * Uploads a poster image to the 'posters' Supabase Storage bucket (FR-20).
 */
export async function uploadMediaPosterAction(formData: FormData): Promise<ActionResult<{ url: string }>> {
  const auth = await verifyAdminSession();
  if (!auth.isAdmin) {
    return { success: false, error: auth.error || "Unauthorized" };
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return { success: false, error: "No image file provided" };
  }

  // Validate format and size (max 8MB)
  const allowedMime = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedMime.includes(file.type)) {
    return { success: false, error: "Invalid image format. Allowed formats: JPG, PNG, WEBP." };
  }

  if (file.size > 8 * 1024 * 1024) {
    return { success: false, error: "Poster file size exceeds the 8MB limit." };
  }

  try {
    const adminClient = createAdminClient();
    const fileExt = file.name.split(".").pop() || "jpg";
    const fileName = `manual/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data: uploadData, error: uploadError } = await adminClient.storage
      .from("posters")
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return { success: false, error: uploadError.message };
    }

    const { data: urlData } = adminClient.storage
      .from("posters")
      .getPublicUrl(uploadData.path);

    return { success: true, data: { url: urlData.publicUrl } };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to upload poster";
    return { success: false, error: msg };
  }
}

/**
 * Ingests a new film or series record into media_items and media_genres (FR-16, UC-03).
 */
export async function createMediaItemAction(
  input: IngestMediaInput
): Promise<ActionResult<{ mediaId: string }>> {
  // 1. Session verification
  const auth = await verifyAdminSession();
  if (!auth.isAdmin) {
    return { success: false, error: auth.error || "Unauthorized" };
  }

  // 2. Check System Operational State (FR-19)
  const systemState = await getSystemStateAction();
  if (systemState.status === "Updating") {
    return {
      success: false,
      code: "SYSTEM_LOCKED",
      error: "System synchronization is active (Updating). Manual editing is temporarily locked. Try again later.",
    };
  }

  // 3. Pre-flight Duplicate Check (FR-17)
  const dupCheck = await checkDuplicateMediaAction(input.title, input.release_year);
  if (dupCheck.exists && dupCheck.existingItem) {
    return {
      success: false,
      code: "DUPLICATE_ENTRY",
      error: `Duplicate Entry Detected: "${dupCheck.existingItem.title}" (${dupCheck.existingItem.release_year}) already exists in the catalog.`,
    };
  }

  // 4. Metadata Structure
  const metadata: MediaMetadata = {
    tagline: input.tagline?.trim() || null,
    directors: input.directors && input.directors.length > 0 ? input.directors : undefined,
    cast: input.cast && input.cast.length > 0 ? input.cast : undefined,
  };

  const budgetCategory = calculateBudgetCategory(input.budget);

  try {
    const adminClient = createAdminClient();

    // 5. Insert into media_items
    const { data: newMedia, error: insertError } = await adminClient
      .from("media_items")
      .insert({
        title: input.title.trim(),
        original_title: input.original_title?.trim() || null,
        media_type: input.media_type,
        release_year: input.release_year,
        release_date: input.release_date || null,
        runtime: input.runtime || null,
        seasons_count: input.media_type === "tv" ? (input.seasons_count || 1) : null,
        episodes_count: input.media_type === "tv" ? (input.episodes_count || null) : null,
        overview: input.overview?.trim() || null,
        status: input.status || "Released",
        poster_path: input.poster_path || null,
        budget: input.budget || null,
        budget_category: budgetCategory,
        revenue: input.revenue || null,
        age_rating: input.age_rating || null,
        country: input.country?.trim() || null,
        countries: input.countries && input.countries.length > 0 ? input.countries : [],
        vote_average: 0.0,
        vote_count: 0,
        metadata: metadata as unknown as Json,
      })
      .select("id")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return {
          success: false,
          code: "DUPLICATE_ENTRY",
          error: `Duplicate Entry: A title with this name and release year already exists in the database.`,
        };
      }
      return { success: false, error: insertError.message };
    }

    const newMediaId = newMedia.id;

    // 6. Associate Genres in media_genres
    if (input.genre_ids && input.genre_ids.length > 0) {
      const genreInserts = input.genre_ids.map((genreId) => ({
        media_id: newMediaId,
        genre_id: genreId,
      }));

      const { error: genreError } = await adminClient
        .from("media_genres")
        .insert(genreInserts);

      if (genreError) {
        console.error("Failed to associate genres:", genreError.message);
      }
    }

    revalidatePath("/catalog");
    revalidatePath("/admin");
    revalidatePath("/");

    return {
      success: true,
      data: { mediaId: newMediaId },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create media item.";
    return { success: false, error: message };
  }
}

export interface GetModeratedReviewsParams {
  status?: "all" | ReviewModerationStatus;
  search?: string;
  sortBy?: "newest" | "oldest" | "rating_desc" | "rating_asc";
  page?: number;
  pageSize?: number;
}

/**
 * Fetches all user reviews with associated user profile and target media item details,
 * supporting filtering by status, search, and sorting.
 */
export async function getModeratedReviewsAction(
  params: GetModeratedReviewsParams = {}
): Promise<ActionResult<ModeratedReviewsResult>> {
  const auth = await verifyAdminSession();
  if (!auth.isAdmin) {
    return { success: false, error: auth.error || "Unauthorized" };
  }

  const {
    status = "all",
    search = "",
    sortBy = "newest",
    page = 1,
    pageSize = 15,
  } = params;

  try {
    const adminClient = createAdminClient();

    // 1. Fetch Status Counts in parallel
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

    // 2. Build filtered review query
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

    // 3. Sorting
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

    // 4. Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    const total = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return {
      success: true,
      data: {
        reviews: (data as unknown as ModeratedReviewItem[]) || [],
        total,
        page,
        pageSize,
        totalPages,
        statusCounts,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load reviews.";
    return { success: false, error: msg };
  }
}

/**
 * Updates the moderation status of a review (approved, pending, or flagged).
 * The PostgreSQL database trigger automatically recalculates average rating and vote count.
 */
export async function updateReviewStatusAction(
  reviewId: string,
  newStatus: ReviewModerationStatus
): Promise<ActionResult> {
  const auth = await verifyAdminSession();
  if (!auth.isAdmin) {
    return { success: false, error: auth.error || "Unauthorized" };
  }

  const validStatuses: ReviewModerationStatus[] = ["approved", "pending", "flagged"];
  if (!validStatuses.includes(newStatus)) {
    return { success: false, error: "Invalid status value" };
  }

  try {
    const adminClient = createAdminClient();
    const { data: updatedReview, error } = await adminClient
      .from("reviews")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reviewId)
      .select("media_id")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/reviews");
    if (updatedReview?.media_id) {
      revalidatePath(`/movie/${updatedReview.media_id}`);
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update review status.";
    return { success: false, error: msg };
  }
}

/**
 * Permanently deletes an inappropriate or spam review.
 * The PostgreSQL database trigger automatically recalculates average rating and vote count.
 */
export async function deleteReviewAction(reviewId: string): Promise<ActionResult> {
  const auth = await verifyAdminSession();
  if (!auth.isAdmin) {
    return { success: false, error: auth.error || "Unauthorized" };
  }

  try {
    const adminClient = createAdminClient();
    const { data: deletedReview, error } = await adminClient
      .from("reviews")
      .delete()
      .eq("id", reviewId)
      .select("media_id")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/reviews");
    if (deletedReview?.media_id) {
      revalidatePath(`/movie/${deletedReview.media_id}`);
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete review.";
    return { success: false, error: msg };
  }
}

export interface GetManagedUsersParams {
  status?: ManagedUserStatusFilter;
  search?: string;
  sortBy?: ManagedUserSortOption;
  page?: number;
  pageSize?: number;
}

/**
 * Fetches registered user accounts (profiles enriched with auth emails,
 * last sign-in timestamps, and review/watchlist counts) for admin user management.
 */
export async function getManagedUsersAction(
  params: GetManagedUsersParams = {}
): Promise<ActionResult<ManagedUsersResult>> {
  const auth = await verifyAdminSession();
  if (!auth.isAdmin) {
    return { success: false, error: auth.error || "Unauthorized" };
  }

  const {
    status = "all",
    search = "",
    sortBy = "newest",
    page = 1,
    pageSize = 15,
  } = params;

  try {
    const adminClient = createAdminClient();

    // 1. Fetch profiles, review user_ids, watchlist user_ids, and auth users in parallel
    const [profilesRes, reviewsRes, watchlistsRes, authUsersMap] = await Promise.all([
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
          { email: string | null; last_sign_in_at: string | null; banned_until: string | null }
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
      return { success: false, error: profilesRes.error.message };
    }

    const reviewCounts = new Map<string, number>();
    for (const r of reviewsRes.data || []) {
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
        role: p.role,
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

    // 2. Filter by status & search term
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

    // 3. Sort
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

    // 4. Paginate
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * pageSize;
    const paginatedUsers = filtered.slice(start, start + pageSize);

    return {
      success: true,
      data: {
        users: paginatedUsers,
        total,
        page: safePage,
        pageSize,
        totalPages,
        counts,
      },
    };
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to load registered users.";
    return { success: false, error: msg };
  }
}

/**
 * Blocks or unblocks a registered user account in both Supabase Auth (ban_duration)
 * and public.profiles (is_blocked / blocked_reason / blocked_at).
 */
export async function toggleUserBlockAction(
  targetUserId: string,
  shouldBlock: boolean,
  reason?: string
): Promise<
  ActionResult<{
    is_blocked: boolean;
    blocked_reason: string | null;
    blocked_at: string | null;
  }>
> {
  const auth = await verifyAdminSession();
  if (!auth.isAdmin || !auth.user) {
    return { success: false, error: auth.error || "Unauthorized" };
  }

  if (targetUserId === auth.user.id) {
    return {
      success: false,
      error: "You cannot block your own administrator account.",
    };
  }

  try {
    const adminClient = createAdminClient();

    const { data: targetProfile, error: fetchError } = await adminClient
      .from("profiles")
      .select("id, username, role")
      .eq("id", targetUserId)
      .maybeSingle();

    if (fetchError || !targetProfile) {
      return { success: false, error: "User account not found." };
    }

    if (targetProfile.role === "admin") {
      return {
        success: false,
        error: "Administrator accounts cannot be blocked.",
      };
    }

    // 1. Update Supabase Auth ban status (prevents future sign-ins & token refresh)
    const { error: authBanError } = await adminClient.auth.admin.updateUserById(
      targetUserId,
      {
        ban_duration: shouldBlock ? "876000h" : "none",
      }
    );

    if (authBanError) {
      return { success: false, error: authBanError.message };
    }

    // 2. Sync block status and metadata on public.profiles (enforced immediately in middleware)
    const nowIso = new Date().toISOString();
    const cleanReason = shouldBlock
      ? reason?.trim() || "Violation of platform rules"
      : null;
    const blockedAt = shouldBlock ? nowIso : null;

    const { error: profileUpdateError } = await adminClient
      .from("profiles")
      .update({
        is_blocked: shouldBlock,
        blocked_reason: cleanReason,
        blocked_at: blockedAt,
        updated_at: nowIso,
      })
      .eq("id", targetUserId);

    if (profileUpdateError) {
      return { success: false, error: profileUpdateError.message };
    }

    revalidatePath("/admin/users");

    return {
      success: true,
      data: {
        is_blocked: shouldBlock,
        blocked_reason: cleanReason,
        blocked_at: blockedAt,
      },
    };
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to update user status.";
    return { success: false, error: msg };
  }
}

