import type { GenreRow, MediaItem, MediaItemRow, MediaMetadata } from "@/types/media";

export interface MediaGenreJoin {
  genre_id?: number;
  genres: GenreRow | GenreRow[] | null;
}

export interface MediaRowWithGenres extends Omit<MediaItemRow, "metadata"> {
  metadata?: MediaMetadata | null;
  media_genres?: MediaGenreJoin[] | null;
  all_genres?: MediaGenreJoin[] | null;
}

/**
 * Extracts a flat list of GenreRow objects from a Supabase media_genres join array.
 */
export function extractGenres(
  joins: MediaGenreJoin[] | null | undefined
): GenreRow[] {
  if (!joins || joins.length === 0) return [];

  const result: GenreRow[] = [];
  for (const join of joins) {
    const g = join.genres;
    if (!g) continue;
    if (Array.isArray(g)) {
      for (const item of g) {
        if (item) result.push(item);
      }
    } else {
      result.push(g);
    }
  }
  return result;
}

/**
 * Normalizes a Supabase media_items row (with joined genres) into a clean MediaItem domain object,
 * stripping internal join keys without leaving unused destructured bindings.
 */
export function normalizeMediaRow(
  row: MediaRowWithGenres,
  options?: { preferAllGenres?: boolean }
): MediaItem {
  const rawGenres = options?.preferAllGenres
    ? row.all_genres ?? row.media_genres
    : row.media_genres;

  const genres = extractGenres(rawGenres);
  const normalized = { ...row };
  delete normalized.media_genres;
  delete normalized.all_genres;

  return {
    ...normalized,
    metadata: normalized.metadata ?? null,
    genres,
  };
}
