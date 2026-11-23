import { createClient } from "@/lib/supabase/server";
import {
  applyCatalogQueryFilters,
  applyCatalogQuerySorting,
  matchesMediaFilters,
  compareMediaItems,
} from "@/lib/filters";
import {
  normalizeMediaRow,
  toWatchlistStatus,
  type MediaRowWithGenres,
} from "@/lib/media-mappers";
import type {
  MediaItem,
  GenreRow,
  WatchlistRow,
  WatchlistEntry,
  ReviewWithAuthor,
  ProfileRow,
  CatalogFilterParams,
  ReviewRow,
  WatchlistFilterParams,
  WatchlistQueryResult,
  WatchlistStatusCounts,
  UserReviewArchiveItem,
  UserCabinetStats,
  PaginatedResult,
  CollectionRow,
  CollectionItemRow,
  CollectionWithMedia,
  CollectionItemWithMedia,
} from "@/types/media";

export type { PaginatedResult };

interface WatchlistMediaJoinRow extends WatchlistRow {
  media: MediaRowWithGenres | null;
}

interface ReviewMediaJoinRow extends ReviewRow {
  media: MediaRowWithGenres | null;
}

/**
 * Resolves a server Supabase client along with the target user ID (falling back to the active session).
 */
async function resolveServerUser(userId?: string) {
  const supabase = await createClient();
  if (userId) {
    return { supabase, userId };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, userId: user?.id ?? null };
}

/**
 * Counts watchlist rows grouped by status.
 */
function countWatchlistStatuses(
  rows: ReadonlyArray<{ status: string }>,
): WatchlistStatusCounts {
  const counts: WatchlistStatusCounts = {
    all: rows.length,
    plan_to_watch: 0,
    watched: 0,
    favorite: 0,
  };

  for (const row of rows) {
    if (row.status === "plan_to_watch") counts.plan_to_watch += 1;
    else if (row.status === "watched") counts.watched += 1;
    else if (row.status === "favorite") counts.favorite += 1;
  }

  return counts;
}

function mapWatchlistJoinRow(entry: WatchlistMediaJoinRow): WatchlistEntry {
  const status = toWatchlistStatus(entry.status);
  if (!entry.media) {
    return {
      ...entry,
      status,
      media: null,
    };
  }
  return {
    ...entry,
    status,
    media: normalizeMediaRow(entry.media),
  };
}

/**
 * Fetches normalized genre categories from Supabase, optionally scoped to a mediaType (movie or tv).
 */
export async function getGenres(
  mediaType?: "movie" | "tv"
): Promise<GenreRow[]> {
  const supabase = await createClient();

  if (mediaType) {
    const { data, error } = await supabase
      .from("genres")
      .select("id, name, media_genres!inner(media_items!inner(media_type))")
      .eq("media_genres.media_items.media_type", mediaType)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching genres for mediaType:", error);
      const { data: allData } = await supabase
        .from("genres")
        .select("*")
        .order("name", { ascending: true });
      return allData || [];
    }

    const uniqueMap = new Map<number, GenreRow>();
    for (const item of data || []) {
      if (!uniqueMap.has(item.id)) {
        uniqueMap.set(item.id, { id: item.id, name: item.name });
      }
    }
    return Array.from(uniqueMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }

  const { data, error } = await supabase
    .from("genres")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching genres:", error);
    throw error;
  }

  return data || [];
}

/**
 * Fetches paginated media items with optional search, genre, and type filters.
 */
export async function getMediaCatalog(
  params: CatalogFilterParams = {},
): Promise<PaginatedResult<MediaItem>> {
  const supabase = await createClient();
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.max(1, Math.min(100, params.pageSize || 20));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const isFilteringGenre = Boolean(
    params.genreId || (params.genres && params.genres.length > 0)
  );

  // If filtering by genre, inner-join media_genres for filtering while selecting all genres
  const selectQuery = isFilteringGenre
    ? "*, media_genres!inner(genre_id, genres!inner(name)), all_genres:media_genres(genres(*))"
    : "*, media_genres(genres(*))";

  let query = supabase
    .from("media_items")
    .select(selectQuery, { count: "exact" });

  query = applyCatalogQueryFilters(query, params);
  query = applyCatalogQuerySorting(query, params.sortBy);
  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) {
    console.error("Error fetching media catalog:", error);
    throw error;
  }

  const rows = (data || []) as unknown as MediaRowWithGenres[];
  const items: MediaItem[] = rows.map((row) =>
    normalizeMediaRow(row, { preferAllGenres: isFilteringGenre })
  );

  const total = count || 0;
  const totalPages = Math.ceil(total / pageSize);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Fetches a single media item by its primary key UUID.
 */
export async function getMediaById(id: string): Promise<MediaItem | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("media_items")
    .select("*, media_genres(genres(*))")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Not found
    }
    console.error(`Error fetching media item ${id}:`, error);
    throw error;
  }

  if (!data) return null;

  return normalizeMediaRow(data as unknown as MediaRowWithGenres);
}

/**
 * Fetches public reviews for a specific media item.
 */
export async function getMediaReviews(
  mediaId: string,
): Promise<ReviewWithAuthor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("*, profile:profiles(id, username, avatar_url)")
    .eq("media_id", mediaId)
    .not("user_id", "is", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(`Error fetching reviews for media ${mediaId}:`, error);
    throw error;
  }

  return (data || []) as unknown as ReviewWithAuthor[];
}

/**
 * Fetches the user's review for a given media item (if any).
 */
export async function getUserReviewForMedia(
  mediaId: string,
  userId?: string,
): Promise<ReviewRow | null> {
  const { supabase, userId: targetUserId } = await resolveServerUser(userId);
  if (!targetUserId) return null;

  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("media_id", mediaId)
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (error) {
    console.error(`Error fetching user review for media ${mediaId}:`, error);
    throw error;
  }

  return data;
}

/**
 * Fetches the user's watchlist entry for a given media item (if any).
 */
export async function getUserWatchlistEntryForMedia(
  mediaId: string,
  userId?: string,
): Promise<WatchlistRow | null> {
  const { supabase, userId: targetUserId } = await resolveServerUser(userId);
  if (!targetUserId) return null;

  const { data, error } = await supabase
    .from("watchlists")
    .select("*")
    .eq("media_id", mediaId)
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (error) {
    console.error(
      `Error fetching user watchlist entry for media ${mediaId}:`,
      error,
    );
    throw error;
  }

  return data;
}

/**
 * Queries user watchlist entries with full filtering, sorting, pagination, and status counts.
 */
export async function getWatchlistWithFilters(
  params: WatchlistFilterParams = {},
  userId?: string,
): Promise<WatchlistQueryResult> {
  const { supabase, userId: targetUserId } = await resolveServerUser(userId);
  if (!targetUserId) {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize: params.pageSize || 20,
      totalPages: 0,
      statusCounts: {
        all: 0,
        plan_to_watch: 0,
        watched: 0,
        favorite: 0,
      },
    };
  }

  const { data, error } = await supabase
    .from("watchlists")
    .select("*, media:media_items(*, media_genres(genres(*)))")
    .eq("user_id", targetUserId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching watchlist with filters:", error);
    throw error;
  }

  const rawRows = (data || []) as unknown as WatchlistMediaJoinRow[];
  const statusCounts = countWatchlistStatuses(rawRows);
  const allEntries: WatchlistEntry[] = rawRows.map(mapWatchlistJoinRow);

  // Apply filters in-memory
  let filtered = allEntries;

  // 1. Status (all | plan_to_watch | watched | favorite)
  if (params.status && params.status !== "all") {
    filtered = filtered.filter((entry) => entry.status === params.status);
  }

  // 2. Media metadata filters (genres, runtime, seasons, rating, year, country, etc.)
  filtered = filtered.filter((entry) =>
    matchesMediaFilters(entry.media, params),
  );

  // 3. Sorting
  const sortBy = params.sortBy || "added_desc";
  filtered.sort((a, b) => {
    if (sortBy === "added_desc") {
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
    if (sortBy === "added_asc") {
      return (
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    }
    return compareMediaItems(a.media, b.media, sortBy);
  });

  // Pagination
  const total = filtered.length;
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.max(1, Math.min(100, params.pageSize || 20));
  const totalPages = Math.ceil(total / pageSize);
  const from = (page - 1) * pageSize;
  const paginatedItems = filtered.slice(from, from + pageSize);

  return {
    items: paginatedItems,
    total,
    page,
    pageSize,
    totalPages,
    statusCounts,
  };
}

/**
 * Fetches the profile of the currently authenticated user.
 */
export async function getCurrentUserProfile(): Promise<ProfileRow | null> {
  const { supabase, userId } = await resolveServerUser();
  if (!userId) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching user profile:", error);
    throw error;
  }

  return data;
}

/**
 * Fetches the archive of reviews and ratings submitted by a specific user.
 */
export async function getUserReviewsArchive(
  userId: string
): Promise<UserReviewArchiveItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("*, media:media_items(*, media_genres(genres(*)))")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching user reviews archive:", error);
    throw error;
  }

  const rawRows = (data || []) as unknown as ReviewMediaJoinRow[];

  return rawRows.map((entry) => {
    if (!entry.media) return entry as UserReviewArchiveItem;
    return {
      ...entry,
      media: normalizeMediaRow(entry.media),
    };
  });
}

/**
 * Aggregates statistics for the user cabinet (watchlists, reviews, average rating).
 */
export async function getUserCabinetStats(
  userId: string
): Promise<UserCabinetStats> {
  const supabase = await createClient();

  const [
    { data: watchlistData, error: wlError },
    { data: reviewData, error: revError },
  ] = await Promise.all([
    supabase.from("watchlists").select("status").eq("user_id", userId),
    supabase.from("reviews").select("rating").eq("user_id", userId),
  ]);

  if (wlError) {
    console.error("Error fetching watchlist stats:", wlError);
  }
  if (revError) {
    console.error("Error fetching review stats:", revError);
  }

  const counts = countWatchlistStatuses(watchlistData || []);

  const reviews = reviewData || [];
  const reviewsCount = reviews.length;
  const ratingsWithScore = reviews.filter(
    (r) => typeof r.rating === "number" && r.rating !== null
  );
  const averageRatingGiven =
    ratingsWithScore.length > 0
      ? Math.round(
          (ratingsWithScore.reduce((sum, r) => sum + (r.rating || 0), 0) /
            ratingsWithScore.length) *
            10
        ) / 10
      : null;

  return {
    watchlistTotal: counts.all,
    planToWatchCount: counts.plan_to_watch,
    watchedCount: counts.watched,
    favoriteCount: counts.favorite,
    reviewsCount,
    averageRatingGiven,
  };
}

interface CollectionItemJoinRow extends CollectionItemRow {
  media: MediaRowWithGenres | null;
}

interface CollectionJoinRow extends CollectionRow {
  collection_items?: CollectionItemJoinRow[] | null;
}

/**
 * Fetches all custom user-named collections along with their hydrated media items.
 */
export async function getUserCollectionsWithMedia(
  userId?: string,
): Promise<CollectionWithMedia[]> {
  const { supabase, userId: targetUserId } = await resolveServerUser(userId);
  if (!targetUserId) return [];

  const { data, error } = await supabase
    .from("collections")
    .select(
      "*, collection_items(*, media:media_items(*, media_genres(genres(*))))",
    )
    .eq("user_id", targetUserId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching user collections:", error);
    return [];
  }

  const rows = (data || []) as unknown as CollectionJoinRow[];
  return rows.map((col) => {
    const rawItems = col.collection_items || [];
    const items: CollectionItemWithMedia[] = [...rawItems]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .map((entry) => ({
        id: entry.id,
        collection_id: entry.collection_id,
        media_id: entry.media_id,
        created_at: entry.created_at,
        media: entry.media ? normalizeMediaRow(entry.media) : null,
      }));

    return {
      id: col.id,
      user_id: col.user_id,
      name: col.name,
      description: col.description,
      created_at: col.created_at,
      updated_at: col.updated_at,
      items,
      itemCount: items.length,
    };
  });
}

/**
 * Applies the same WatchlistFilterParams (search, metadata filters, sorting, pagination)
 * to a specific custom collection's items.
 */
export function filterCollectionItems(
  collection: CollectionWithMedia,
  params: WatchlistFilterParams = {},
): PaginatedResult<CollectionItemWithMedia> {
  let filtered = collection.items.filter((entry) =>
    matchesMediaFilters(entry.media, params),
  );

  const sortBy = params.sortBy || "added_desc";
  filtered = [...filtered].sort((a, b) => {
    if (sortBy === "added_desc") {
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
    if (sortBy === "added_asc") {
      return (
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    }
    return compareMediaItems(a.media, b.media, sortBy);
  });

  const total = filtered.length;
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.max(1, Math.min(100, params.pageSize || 20));
  const totalPages = Math.ceil(total / pageSize);
  const from = (page - 1) * pageSize;

  return {
    items: filtered.slice(from, from + pageSize),
    total,
    page,
    pageSize,
    totalPages,
  };
}
