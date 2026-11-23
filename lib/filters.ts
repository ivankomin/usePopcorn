import type {
  MediaItem,
  CatalogFilterParams,
  WatchlistFilterParams,
  SortOption,
  WatchlistSortOption,
} from "@/types/media";

export interface NumericRangeRule {
  eq?: number;
  lt?: number;
  lte?: number;
  gt?: number;
  gte?: number;
}

/**
 * Parses a runtime filter bucket label into a declarative numeric range rule.
 */
export function parseRuntimeRange(filter?: string): NumericRangeRule | null {
  if (!filter || filter === "All Runtimes") return null;

  if (filter === "Under 90 min") return { lt: 90 };
  if (filter === "90–120 min" || filter === "90-120 min") {
    return { gte: 90, lte: 120 };
  }
  if (filter === "120–150 min" || filter === "120-150 min") {
    return { gte: 120, lte: 150 };
  }
  if (filter === "Over 150 min") return { gt: 150 };

  return null;
}

/**
 * Parses a seasons filter bucket label into a declarative numeric range rule.
 */
export function parseSeasonsRange(filter?: string): NumericRangeRule | null {
  if (!filter || filter === "All Seasons") return null;

  if (filter === "1 Season" || filter.startsWith("1 Season")) {
    return { eq: 1 };
  }
  if (filter === "2–3 Seasons" || filter === "2-3 Seasons") {
    return { gte: 2, lte: 3 };
  }
  if (filter === "4–6 Seasons" || filter === "4-6 Seasons") {
    return { gte: 4, lte: 6 };
  }
  if (filter === "7+ Seasons") return { gte: 7 };

  return null;
}

function matchesNumericRange(
  value: number | null | undefined,
  rule: NumericRangeRule | null,
): boolean {
  if (!rule) return true;
  if (value == null) return false;
  if (rule.eq !== undefined && value !== rule.eq) return false;
  if (rule.lt !== undefined && !(value < rule.lt)) return false;
  if (rule.lte !== undefined && !(value <= rule.lte)) return false;
  if (rule.gt !== undefined && !(value > rule.gt)) return false;
  if (rule.gte !== undefined && !(value >= rule.gte)) return false;
  return true;
}

/**
 * Checks whether a runtime value matches the selected runtime filter bucket.
 */
export function matchesRuntime(
  runtime: number | null | undefined,
  filter?: string,
): boolean {
  return matchesNumericRange(runtime, parseRuntimeRange(filter));
}

/**
 * Checks whether a seasons count matches the selected seasons filter bucket.
 */
export function matchesSeasons(
  seasons: number | null | undefined,
  filter?: string,
): boolean {
  return matchesNumericRange(seasons, parseSeasonsRange(filter));
}

export interface RawMediaFilterSearchParams {
  search?: string;
  mediaType?: "all" | "movie" | "tv";
  genreId?: string;
  genres?: string;
  runtime?: string;
  seasons?: string;
  country?: string;
  budget?: string;
  ageRating?: string;
  minRating?: string;
  maxRating?: string;
  minYear?: string;
  maxYear?: string;
  page?: string;
}

function parseOptionalInt(raw?: string): number | undefined {
  if (!raw) return undefined;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseOptionalFloat(raw?: string): number | undefined {
  if (!raw) return undefined;
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Parses shared URL search parameters used by both `/catalog` and `/watchlist`.
 */
export function parseMediaFilterParams(
  raw: RawMediaFilterSearchParams,
  defaultMediaType: "all" | "movie" | "tv",
) {
  const mediaType =
    raw.mediaType === "all" || raw.mediaType === "movie" || raw.mediaType === "tv"
      ? raw.mediaType
      : defaultMediaType;

  const genres = raw.genres
    ? raw.genres
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean)
    : undefined;

  const parsedPage = parseOptionalInt(raw.page);

  return {
    search: raw.search?.trim() || undefined,
    mediaType,
    genreId: parseOptionalInt(raw.genreId),
    genres,
    runtime: raw.runtime,
    seasons: raw.seasons,
    country: raw.country,
    budget: raw.budget,
    ageRating: raw.ageRating,
    minRating: parseOptionalFloat(raw.minRating),
    maxRating: parseOptionalFloat(raw.maxRating),
    minYear: parseOptionalInt(raw.minYear),
    maxYear: parseOptionalInt(raw.maxYear),
    page: parsedPage && parsedPage >= 1 ? parsedPage : 1,
  };
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
  const runtimeRule = parseRuntimeRange(params.runtime);
  if (runtimeRule) {
    if (runtimeRule.eq !== undefined) query = query.eq("runtime", runtimeRule.eq);
    if (runtimeRule.lt !== undefined) query = query.lt("runtime", runtimeRule.lt);
    if (runtimeRule.lte !== undefined) query = query.lte("runtime", runtimeRule.lte);
    if (runtimeRule.gt !== undefined) query = query.gt("runtime", runtimeRule.gt);
    if (runtimeRule.gte !== undefined) query = query.gte("runtime", runtimeRule.gte);
  }

  // Filter: Seasons (TV series)
  const seasonsRule = parseSeasonsRange(params.seasons);
  if (seasonsRule) {
    if (seasonsRule.eq !== undefined) query = query.eq("seasons_count", seasonsRule.eq);
    if (seasonsRule.lt !== undefined) query = query.lt("seasons_count", seasonsRule.lt);
    if (seasonsRule.lte !== undefined) query = query.lte("seasons_count", seasonsRule.lte);
    if (seasonsRule.gt !== undefined) query = query.gt("seasons_count", seasonsRule.gt);
    if (seasonsRule.gte !== undefined) query = query.gte("seasons_count", seasonsRule.gte);
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
