import type { Database } from "./database.types";

export type MediaItemRow = Database["public"]["Tables"]["media_items"]["Row"];
export type GenreRow = Database["public"]["Tables"]["genres"]["Row"];
export type WatchlistRow = Database["public"]["Tables"]["watchlists"]["Row"];
export type ReviewRow = Database["public"]["Tables"]["reviews"]["Row"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export type MediaType = "movie" | "tv";
export type UserRole = "user" | "admin";

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginatedResult<T> extends PaginationMeta {
  items: T[];
}

export interface MediaMetadata {
  tagline?: string | null;
  directors?: string[];
  creators?: string[];
  cast?: string[];
  awards?: string | string[];
  end_year?: number | string;
  [key: string]: unknown;
}

export interface MediaItem extends Omit<MediaItemRow, "metadata" | "media_type"> {
  media_type: MediaType;
  metadata?: MediaMetadata | null;
  genres?: GenreRow[];
}

export type WatchlistStatus = "plan_to_watch" | "watched" | "favorite";

export interface WatchlistEntry extends Omit<WatchlistRow, "status"> {
  status: WatchlistStatus;
  media?: MediaItem | null;
}

export type ReviewModerationStatus = "approved" | "pending" | "flagged";

export interface ReviewWithAuthor extends Omit<ReviewRow, "status"> {
  status: ReviewModerationStatus;
  profile?: Pick<ProfileRow, "id" | "username" | "avatar_url"> | null;
}

export type SortOption =
  | "popularity"
  | "vote_average_desc"
  | "vote_average_asc"
  | "release_year_desc"
  | "release_year_asc"
  | "title_asc"
  | "title_desc"
  | "vote_average"
  | "release_year"
  | "title";

export interface CatalogFilterParams {
  search?: string;
  genreId?: number;
  genres?: string[];
  runtime?: string;
  seasons?: string;
  country?: string;
  budget?: string;
  ageRating?: string;
  minRating?: number;
  maxRating?: number;
  minYear?: number;
  maxYear?: number;
  mediaType?: "all" | MediaType;
  sortBy?: SortOption;
  page?: number;
  pageSize?: number;
}

export type WatchlistSortOption =
  | "added_desc"
  | "added_asc"
  | "vote_average_desc"
  | "vote_average_asc"
  | "release_year_desc"
  | "release_year_asc"
  | "title_asc"
  | "title_desc";

export interface WatchlistFilterParams
  extends Omit<CatalogFilterParams, "sortBy"> {
  status?: WatchlistStatus | "all";
  sortBy?: WatchlistSortOption;
}

export interface WatchlistStatusCounts {
  all: number;
  plan_to_watch: number;
  watched: number;
  favorite: number;
}

export interface WatchlistQueryResult extends PaginatedResult<WatchlistEntry> {
  statusCounts: WatchlistStatusCounts;
}

export interface UserReviewArchiveItem extends ReviewRow {
  media?: MediaItem | null;
}

export interface UserCabinetStats {
  watchlistTotal: number;
  planToWatchCount: number;
  watchedCount: number;
  favoriteCount: number;
  reviewsCount: number;
  averageRatingGiven: number | null;
}

export interface ModeratedReviewItem extends Omit<ReviewRow, "status"> {
  status: ReviewModerationStatus;
  profile?: Pick<ProfileRow, "id" | "username" | "avatar_url" | "role"> | null;
  media?: Pick<
    MediaItemRow,
    "id" | "title" | "release_year" | "poster_path" | "media_type"
  > | null;
}

export interface ModeratedReviewsCounts {
  all: number;
  approved: number;
  pending: number;
  flagged: number;
}

export interface ModeratedReviewsResult extends PaginationMeta {
  reviews: ModeratedReviewItem[];
  statusCounts: ModeratedReviewsCounts;
}

export interface RecommendedMediaItem {
  media: MediaItem;
  matchReasons: string[];
}

export interface SimilarMediaItem {
  media: MediaItem;
}

export interface UserTasteProfile {
  stage: "cold" | "warming" | "personalized";
  signalCount: number;
  topGenres: string[];
  preferredDecade: string | null;
  movieRatio: number;
  tvRatio: number;
}

export interface RecommendationsResult {
  items: RecommendedMediaItem[];
  tasteProfile: UserTasteProfile;
}

export type ManagedUserStatusFilter = "all" | "active" | "blocked" | "admin";

export type ManagedUserSortOption =
  | "newest"
  | "oldest"
  | "username_asc"
  | "reviews_desc";

export interface ManagedUserItem {
  id: string;
  username: string;
  email: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_blocked: boolean;
  blocked_reason: string | null;
  blocked_at: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  reviews_count: number;
  watchlist_count: number;
}

export interface ManagedUsersCounts {
  all: number;
  active: number;
  blocked: number;
  admin: number;
}

export interface ManagedUsersResult extends PaginationMeta {
  users: ManagedUserItem[];
  counts: ManagedUsersCounts;
}

export type SystemLogRow = Database["public"]["Tables"]["system_logs"]["Row"];

export type LogLevel = "info" | "warn" | "error" | "critical";
export type LogCategory = "system" | "auth" | "admin" | "db" | "sync";

export interface SystemLogItem extends Omit<SystemLogRow, "level" | "category"> {
  level: LogLevel;
  category: LogCategory;
  actor?: Pick<ProfileRow, "id" | "username" | "role"> | null;
}

export interface SystemLogLevelCounts {
  all: number;
  info: number;
  warn: number;
  error: number;
  critical: number;
}

export interface SystemLogsResult extends PaginationMeta {
  logs: SystemLogItem[];
  levelCounts: SystemLogLevelCounts;
}
