import { createClient } from "@/lib/supabase/server";
import {
  applyCatalogQueryFilters,
  applyCatalogQuerySorting,
  matchesMediaFilters,
  compareMediaItems,
} from "@/lib/filters";
import type {
  MediaItem,
  MediaItemRow,
  MediaMetadata,
  GenreRow,
  WatchlistRow,
  WatchlistEntry,
  WatchlistStatus,
  ReviewWithAuthor,
  ProfileRow,
  CatalogFilterParams,
  ReviewRow,
  WatchlistFilterParams,
  WatchlistQueryResult,
  WatchlistStatusCounts,
  UserReviewArchiveItem,
  UserCabinetStats,
} from "@/types/media";

interface MediaGenreJoin {
  genre_id?: number;
  genres: GenreRow | null;
}

interface MediaCatalogRow extends Omit<MediaItemRow, "metadata"> {
  metadata?: MediaMetadata | null;
  media_genres?: MediaGenreJoin[] | null;
  all_genres?: MediaGenreJoin[] | null;
}

interface WatchlistMediaJoinRow extends WatchlistRow {
  media:
    | (Omit<MediaItemRow, "metadata"> & {
        metadata?: MediaMetadata | null;
        media_genres?: MediaGenreJoin[] | null;
      })
    | null;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
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

  // Apply encapsulated filters, sorting, and pagination
  query = applyCatalogQueryFilters(query, params);
  query = applyCatalogQuerySorting(query, params.sortBy);
  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) {
    console.error("Error fetching media catalog:", error);
    throw error;
  }

  // Format joined genres cleanly
  const rows = (data || []) as unknown as MediaCatalogRow[];
  const items: MediaItem[] = rows.map((row) => {
    const rawGenres = isFilteringGenre ? row.all_genres : row.media_genres;
    const genres: GenreRow[] = (rawGenres || [])
       .map((mg) => mg.genres)
       .filter((g): g is GenreRow => Boolean(g));

    const { media_genres: _mg, all_genres: _ag, ...mediaFields } = row;

    return {
      ...mediaFields,
      genres,
    };
  });

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

  const row = data as unknown as MediaCatalogRow;
  const genres: GenreRow[] = (row.media_genres || [])
    .map((mg) => mg.genres)
    .filter((g): g is GenreRow => Boolean(g));

  const { media_genres, all_genres, ...mediaFields } = row;

  return {
    ...mediaFields,
    genres,
  };
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
  const supabase = await createClient();

  let targetUserId = userId;
  if (!targetUserId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    targetUserId = user.id;
  }

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
  const supabase = await createClient();

  let targetUserId = userId;
  if (!targetUserId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    targetUserId = user.id;
  }

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
 * Fetches the authenticated user's curated watchlist entries.
 */
export async function getUserWatchlist(
  status?: WatchlistStatus,
  userId?: string,
): Promise<WatchlistEntry[]> {
  const supabase = await createClient();

  let targetUserId = userId;
  if (!targetUserId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];
    targetUserId = user.id;
  }

  let query = supabase
    .from("watchlists")
    .select("*, media:media_items(*, media_genres(genres(*)))")
    .eq("user_id", targetUserId)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching watchlist:", error);
    throw error;
  }

  const rows = (data || []) as unknown as WatchlistMediaJoinRow[];
  return rows.map((entry) => {
    if (!entry.media) return entry as WatchlistEntry;

    const rawGenres = entry.media.media_genres || [];
    const genres: GenreRow[] = rawGenres
      .map((mg) => mg.genres)
      .filter((g): g is GenreRow => Boolean(g));

    const { media_genres, ...mediaFields } = entry.media;

    return {
      ...entry,
      media: {
        ...mediaFields,
        genres,
      },
    };
  });
}

/**
 * Queries user watchlist entries with full filtering, sorting, pagination, and status counts.
 */
export async function getWatchlistWithFilters(
  params: WatchlistFilterParams = {},
  userId?: string,
): Promise<WatchlistQueryResult> {
  const supabase = await createClient();

  let targetUserId = userId;
  if (!targetUserId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
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
    targetUserId = user.id;
  }

  // Fetch all user watchlist rows with joined media items and genres
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

  // Calculate overall status counts across all user watchlist entries
  const statusCounts: WatchlistStatusCounts = {
    all: rawRows.length,
    plan_to_watch: 0,
    watched: 0,
    favorite: 0,
  };

  for (const row of rawRows) {
    if (row.status === "plan_to_watch") statusCounts.plan_to_watch += 1;
    else if (row.status === "watched") statusCounts.watched += 1;
    else if (row.status === "favorite") statusCounts.favorite += 1;
  }

  // Map to domain WatchlistEntry objects
  const allEntries: WatchlistEntry[] = rawRows.map((entry) => {
    if (!entry.media) return entry as WatchlistEntry;

    const rawGenres = entry.media.media_genres || [];
    const genres: GenreRow[] = rawGenres
      .map((mg) => mg.genres)
      .filter((g): g is GenreRow => Boolean(g));

    const { media_genres: _mg, ...mediaFields } = entry.media;

    return {
      ...entry,
      media: {
        ...mediaFields,
        genres,
      },
    };
  });

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
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

  type RawReviewJoin = ReviewRow & {
    media: (Omit<MediaItemRow, "metadata"> & {
      metadata?: MediaMetadata | null;
      media_genres?: MediaGenreJoin[] | null;
    }) | null;
  };

  const rawRows = (data || []) as unknown as RawReviewJoin[];

  return rawRows.map((entry) => {
    if (!entry.media) return entry as UserReviewArchiveItem;

    const rawGenres = entry.media.media_genres || [];
    const genres: GenreRow[] = rawGenres
      .map((mg) => mg.genres)
      .filter((g): g is GenreRow => Boolean(g));

    const { media_genres: _mg, ...mediaFields } = entry.media;

    return {
      ...entry,
      media: {
        ...mediaFields,
        genres,
      },
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

  // Watchlist stats
  const { data: watchlistData, error: wlError } = await supabase
    .from("watchlists")
    .select("status")
    .eq("user_id", userId);

  if (wlError) {
    console.error("Error fetching watchlist stats:", wlError);
  }

  const wlItems = watchlistData || [];
  let planToWatchCount = 0;
  let watchedCount = 0;
  let favoriteCount = 0;

  for (const item of wlItems) {
    if (item.status === "plan_to_watch") planToWatchCount++;
    else if (item.status === "watched") watchedCount++;
    else if (item.status === "favorite") favoriteCount++;
  }

  // Reviews stats
  const { data: reviewData, error: revError } = await supabase
    .from("reviews")
    .select("rating")
    .eq("user_id", userId);

  if (revError) {
    console.error("Error fetching review stats:", revError);
  }

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
    watchlistTotal: wlItems.length,
    planToWatchCount,
    watchedCount,
    favoriteCount,
    reviewsCount,
    averageRatingGiven,
  };
}

