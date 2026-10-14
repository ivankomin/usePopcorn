import { createClient } from '@/lib/supabase/server';
import type {
  MediaItem,
  GenreRow,
  WatchlistEntry,
  WatchlistStatus,
  ReviewWithAuthor,
  ProfileRow,
  CatalogFilterParams,
  ReviewRow,
} from '@/types/media';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Fetches all normalized genre categories from Supabase.
 */
export async function getGenres(): Promise<GenreRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('genres')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching genres:', error);
    throw error;
  }

  return data || [];
}

/**
 * Fetches paginated media items with optional search, genre, and type filters.
 */
export async function getMediaCatalog(
  params: CatalogFilterParams = {}
): Promise<PaginatedResult<MediaItem>> {
  const supabase = await createClient();
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.max(1, Math.min(100, params.pageSize || 20));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // If filtering by genre, inner-join media_genres for filtering while selecting all genres
  const selectQuery = params.genreId
    ? '*, media_genres!inner(genre_id), all_genres:media_genres(genres(*))'
    : '*, media_genres(genres(*))';

  let query = supabase.from('media_items').select(selectQuery, { count: 'exact' });

  // Filter: Media Type (movie / tv)
  if (params.mediaType && params.mediaType !== 'all') {
    query = query.eq('media_type', params.mediaType);
  }

  // Filter: Genre
  if (params.genreId) {
    query = query.eq('media_genres.genre_id', params.genreId);
  }

  // Filter: Title Search (case-insensitive substring)
  if (params.search && params.search.trim() !== '') {
    query = query.ilike('title', `%${params.search.trim()}%`);
  }

  // Sorting
  switch (params.sortBy) {
    case 'vote_average':
      query = query
        .order('vote_average', { ascending: false })
        .order('vote_count', { ascending: false });
      break;
    case 'release_year':
      query = query.order('release_year', { ascending: false });
      break;
    case 'title':
      query = query.order('title', { ascending: true });
      break;
    case 'popularity':
    default:
      query = query
        .order('vote_count', { ascending: false })
        .order('vote_average', { ascending: false });
      break;
  }

  // Pagination
  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) {
    console.error('Error fetching media catalog:', error);
    throw error;
  }

  // Format joined genres cleanly
  const items: MediaItem[] = (data || []).map((row: any) => {
    const rawGenres = params.genreId ? row.all_genres : row.media_genres;
    const genres: GenreRow[] = (rawGenres || [])
      .map((mg: any) => mg.genres)
      .filter((g: any): g is GenreRow => Boolean(g));

    const { media_genres, all_genres, ...mediaFields } = row;

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
    .from('media_items')
    .select('*, media_genres(genres(*))')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error(`Error fetching media item ${id}:`, error);
    throw error;
  }

  if (!data) return null;

  const genres: GenreRow[] = ((data as any).media_genres || [])
    .map((mg: any) => mg.genres)
    .filter((g: any): g is GenreRow => Boolean(g));

  const { media_genres, ...mediaFields } = data as any;

  return {
    ...mediaFields,
    genres,
  };
}

/**
 * Fetches public reviews for a specific media item.
 */
export async function getMediaReviews(
  mediaId: string
): Promise<ReviewWithAuthor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('reviews')
    .select('*, profile:profiles(id, username, avatar_url)')
    .eq('media_id', mediaId)
    .order('created_at', { ascending: false });

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
  userId?: string
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
    .from('reviews')
    .select('*')
    .eq('media_id', mediaId)
    .eq('user_id', targetUserId)
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
  userId?: string
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
    .from('watchlists')
    .select('*, media:media_items(*, media_genres(genres(*)))')
    .eq('user_id', targetUserId)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching watchlist:', error);
    throw error;
  }

  return (data || []).map((entry: any) => {
    if (!entry.media) return entry;

    const rawGenres = entry.media.media_genres || [];
    const genres: GenreRow[] = rawGenres
      .map((mg: any) => mg.genres)
      .filter((g: any): g is GenreRow => Boolean(g));

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
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }

  return data;
}
