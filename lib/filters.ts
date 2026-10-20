import type {
  MediaItem,
  CatalogFilterParams,
  WatchlistFilterParams,
  SortOption,
  WatchlistSortOption,
} from "@/types/media";

/**
 * Checks whether a runtime value matches the selected runtime filter bucket.
 */
export function matchesRuntime(
  runtime: number | null | undefined,
  filter?: string,
): boolean {
  if (!filter || filter === "All Runtimes") return true;
  if (runtime == null) return false;

  if (filter === "Under 90 min") return runtime < 90;
  if (filter === "90–120 min" || filter === "90-120 min") {
    return runtime >= 90 && runtime <= 120;
  }
  if (filter === "120–150 min" || filter === "120-150 min") {
    return runtime >= 120 && runtime <= 150;
  }
  if (filter === "Over 150 min") return runtime > 150;

  return true;
}

/**
 * Checks whether a seasons count matches the selected seasons filter bucket.
 */
export function matchesSeasons(
  seasons: number | null | undefined,
  filter?: string,
): boolean {
  if (!filter || filter === "All Seasons") return true;
  if (seasons == null) return false;

  if (filter === "1 Season" || filter.startsWith("1 Season")) {
    return seasons === 1;
  }
  if (filter === "2–3 Seasons" || filter === "2-3 Seasons") {
    return seasons >= 2 && seasons <= 3;
  }
  if (filter === "4–6 Seasons" || filter === "4-6 Seasons") {
    return seasons >= 4 && seasons <= 6;
  }
  if (filter === "7+ Seasons") {
    return seasons >= 7;
  }

  return true;
}

/**
 * In-memory predicate that checks whether a MediaItem matches all given filter criteria.
 * Used for in-memory filtering (e.g. Watchlist, client collections).
 */
export function matchesMediaFilters(
  media: MediaItem | null | undefined,
  filters: CatalogFilterParams | WatchlistFilterParams,
): boolean {
  if (!media) return false;

  // 1. Media Type
  if (
    filters.mediaType &&
    filters.mediaType !== "all" &&
    media.media_type !== filters.mediaType
  ) {
    return false;
  }

  // 2. Title Search
  if (filters.search && filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    if (!media.title?.toLowerCase().includes(q)) {
      return false;
    }
  }

  // 3. Genres (Multi-select by name)
  if (filters.genres && filters.genres.length > 0) {
    const searchGenres = filters.genres.map((g) => g.toLowerCase());
    const hasMatchingGenre = media.genres?.some((g) =>
      searchGenres.includes(g.name.toLowerCase()),
    );
    if (!hasMatchingGenre) return false;
  }

  // 4. Genre ID
  if (filters.genreId) {
    const hasId = media.genres?.some((g) => g.id === filters.genreId);
    if (!hasId) return false;
  }

  // 5. Runtime (movies)
  if (filters.runtime && !matchesRuntime(media.runtime, filters.runtime)) {
    return false;
  }

  // 6. Seasons (TV)
  if (filters.seasons && !matchesSeasons(media.seasons_count, filters.seasons)) {
    return false;
  }

  // 7. Rating Range
  if (
    filters.minRating !== undefined &&
    filters.minRating > 0 &&
    (media.vote_average || 0) < filters.minRating
  ) {
    return false;
  }
  if (
    filters.maxRating !== undefined &&
    filters.maxRating < 10 &&
    (media.vote_average || 0) > filters.maxRating
  ) {
    return false;
  }

  // 8. Release Year Range
  if (
    filters.minYear !== undefined &&
    filters.minYear > 1900 &&
    (media.release_year || 0) < filters.minYear
  ) {
    return false;
  }
  if (
    filters.maxYear !== undefined &&
    filters.maxYear < 2026 &&
    (media.release_year || 0) > filters.maxYear
  ) {
    return false;
  }

  // 9. Country
  if (filters.country && filters.country !== "All Countries") {
    const meta = media.metadata as Record<string, unknown> | null;
    const isDirectMatch = media.country === filters.country;
    const isMetaMatch = meta?.country === filters.country;
    if (!isDirectMatch && !isMetaMatch) {
      return false;
    }
  }

  // 10. Budget
  if (
    filters.budget &&
    filters.budget !== "All Budgets" &&
    media.budget_category !== filters.budget
  ) {
    return false;
  }

  // 11. Age Rating
  if (
    filters.ageRating &&
    filters.ageRating !== "All Age Ratings" &&
    filters.ageRating !== "All Ratings" &&
    media.age_rating !== filters.ageRating
  ) {
    return false;
  }

  return true;
}

/**
 * Pure comparator function for sorting media items in-memory.
 */
export function compareMediaItems(
  a: MediaItem | null | undefined,
  b: MediaItem | null | undefined,
  sortBy?: SortOption | WatchlistSortOption,
): number {
  switch (sortBy) {
    case "vote_average_desc":
    case "vote_average":
      return (
        (b?.vote_average || 0) - (a?.vote_average || 0) ||
        (b?.vote_count || 0) - (a?.vote_count || 0)
      );
    case "vote_average_asc":
      return (
        (a?.vote_average || 0) - (b?.vote_average || 0) ||
        (a?.vote_count || 0) - (b?.vote_count || 0)
      );
    case "release_year_desc":
    case "release_year":
      return (
        (b?.release_year || 0) - (a?.release_year || 0) ||
        (b?.vote_average || 0) - (a?.vote_average || 0)
      );
    case "release_year_asc":
      return (
        (a?.release_year || 0) - (b?.release_year || 0) ||
        (a?.vote_average || 0) - (b?.vote_average || 0)
      );
    case "title_asc":
    case "title":
      return (a?.title || "").localeCompare(b?.title || "");
    case "title_desc":
      return (b?.title || "").localeCompare(a?.title || "");
    case "popularity":
    default:
      return (
        (b?.vote_count || 0) - (a?.vote_count || 0) ||
        (b?.vote_average || 0) - (a?.vote_average || 0)
      );
  }
}

/**
 * Applies all catalog filter parameters to a Supabase PostgREST query builder.
 */
export function applyCatalogQueryFilters<T>(
  builder: T,
  params: CatalogFilterParams,
): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = builder;

  // Filter: Media Type
  if (params.mediaType && params.mediaType !== "all") {
    query = query.eq("media_type", params.mediaType);
  }

  // Filter: Genre
  if (params.genreId) {
    query = query.eq("media_genres.genre_id", params.genreId);
  } else if (params.genres && params.genres.length > 0) {
    query = query.in("media_genres.genres.name", params.genres);
  }

  // Filter: Title Search
  if (params.search && params.search.trim() !== "") {
    query = query.ilike("title", `%${params.search.trim()}%`);
  }

  // Filter: Runtime (movies)
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

  // Filter: Seasons (TV series)
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

  // Filter: Country
  if (params.country && params.country !== "All Countries") {
    query = query.contains("countries", [params.country]);
  }

  // Filter: Budget
  if (params.budget && params.budget !== "All Budgets") {
    query = query.eq("budget_category", params.budget);
  }

  // Filter: Age Rating
  if (params.ageRating && params.ageRating !== "All Age Ratings") {
    query = query.eq("age_rating", params.ageRating);
  }

  return query as T;
}

/**
 * Applies sorting clauses to a Supabase PostgREST query builder.
 */
export function applyCatalogQuerySorting<T>(
  builder: T,
  sortBy?: SortOption,
): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = builder;

  switch (sortBy) {
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

  return query as T;
}
