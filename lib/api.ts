import { createClient } from "@/lib/supabase/server";
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

  // Filter: Media Type (movie / tv)
  if (params.mediaType && params.mediaType !== "all") {
    query = query.eq("media_type", params.mediaType);
  }

  // Filter: Genre
  if (params.genreId) {
    query = query.eq("media_genres.genre_id", params.genreId);
  } else if (params.genres && params.genres.length > 0) {
    query = query.in("media_genres.genres.name", params.genres);
  }

  // Filter: Title Search (case-insensitive substring)
  if (params.search && params.search.trim() !== "") {
    query = query.ilike("title", `%${params.search.trim()}%`);
  }

  // Filter: Runtime (primarily for movies)
  if (params.runtime && params.runtime !== "All Runtimes") {
    if (params.runtime === "Under 90 min") {
      query = query.lt("runtime", 90);
    } else if (
      params.runtime === "90–120 min" ||
      params.runtime === "90-120 min"
    ) {
      query = query.gte("runtime", 90).lte("runtime", 120);
    } else if (
      params.runtime === "120–150 min" ||
      params.runtime === "120-150 min"
    ) {
      query = query.gte("runtime", 120).lte("runtime", 150);
    } else if (params.runtime === "Over 150 min") {
      query = query.gt("runtime", 150);
    }
  }

  // Filter: Seasons (primarily for TV series)
  if (params.seasons && params.seasons !== "All Seasons") {
    if (params.seasons === "1 Season" || params.seasons.startsWith("1 Season")) {
      query = query.eq("seasons_count", 1);
    } else if (
      params.seasons === "2–3 Seasons" ||
      params.seasons === "2-3 Seasons"
    ) {
      query = query.gte("seasons_count", 2).lte("seasons_count", 3);
    } else if (
      params.seasons === "4–6 Seasons" ||
      params.seasons === "4-6 Seasons"
    ) {
      query = query.gte("seasons_count", 4).lte("seasons_count", 6);
    } else if (params.seasons === "7+ Seasons") {
      query = query.gte("seasons_count", 7);
    }
  }

  // Filter: Rating Range
  if (params.minRating !== undefined && params.minRating > 0) {
    query = query.gte("vote_average", params.minRating);
  }
  if (params.maxRating !== undefined && params.maxRating < 10) {
    query = query.lte("vote_average", params.maxRating);
  }

  // Filter: Year Range
  if (params.minYear !== undefined && params.minYear > 1900) {
    query = query.gte("release_year", params.minYear);
  }
  if (params.maxYear !== undefined && params.maxYear < 2026) {
    query = query.lte("release_year", params.maxYear);
  }

  // Filter: Country (direct column)
  if (params.country && params.country !== "All Countries") {
    query = query.contains("countries", [params.country]);
  }

  // Filter: Budget (direct column)
  if (params.budget && params.budget !== "All Budgets") {
    query = query.eq("budget_category", params.budget);
  }

  // Filter: Age Rating (direct column)
  if (params.ageRating && params.ageRating !== "All Age Ratings") {
    query = query.eq("age_rating", params.ageRating);
  }

  // Sorting
  switch (params.sortBy) {
    case "vote_average_desc":
    case "vote_average":
      query = query
        .order("vote_average", { ascending: false })
        .order("vote_count", { ascending: false });
      break;
    case "vote_average_asc":
      query = query
        .order("vote_average", { ascending: true })
        .order("vote_count", { ascending: false });
      break;
    case "release_year_desc":
    case "release_year":
      query = query
        .order("release_year", { ascending: false })
        .order("vote_average", { ascending: false });
      break;
    case "release_year_asc":
      query = query
        .order("release_year", { ascending: true })
        .order("vote_average", { ascending: false });
      break;
    case "title_asc":
    case "title":
      query = query.order("title", { ascending: true });
      break;
    case "title_desc":
      query = query.order("title", { ascending: false });
      break;
    case "popularity":
    default:
      query = query
        .order("vote_count", { ascending: false })
        .order("vote_average", { ascending: false });
      break;
  }

  // Pagination
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

