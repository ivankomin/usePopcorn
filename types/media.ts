import type { Database } from './database.types';

export type MediaItemRow = Database['public']['Tables']['media_items']['Row'];
export type GenreRow = Database['public']['Tables']['genres']['Row'];
export type WatchlistRow = Database['public']['Tables']['watchlists']['Row'];
export type ReviewRow = Database['public']['Tables']['reviews']['Row'];
export type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export interface MediaMetadata {
  tagline?: string | null;
  directors?: string[];
  creators?: string[];
  cast?: string[];
  awards?: string | string[];
  end_year?: number | string;
  [key: string]: unknown;
}

export interface MediaItem extends Omit<MediaItemRow, 'metadata'> {
  metadata?: MediaMetadata | null;
  genres?: GenreRow[];
}

export type WatchlistStatus = 'plan_to_watch' | 'watched' | 'favorite';

export interface WatchlistEntry extends WatchlistRow {
  media?: MediaItem;
}

export interface ReviewWithAuthor extends ReviewRow {
  profile?: Pick<ProfileRow, 'id' | 'username' | 'avatar_url'>;
}

export type SortOption =
  | 'popularity'
  | 'vote_average_desc'
  | 'vote_average_asc'
  | 'release_year_desc'
  | 'release_year_asc'
  | 'title_asc'
  | 'title_desc'
  | 'vote_average'
  | 'release_year'
  | 'title';

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
  mediaType?: 'all' | 'movie' | 'tv';
  sortBy?: SortOption;
  page?: number;
  pageSize?: number;
}

export type WatchlistSortOption =
  | 'added_desc'
  | 'added_asc'
  | 'vote_average_desc'
  | 'vote_average_asc'
  | 'release_year_desc'
  | 'release_year_asc'
  | 'title_asc'
  | 'title_desc';

export interface WatchlistFilterParams {
  status?: WatchlistStatus | 'all';
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
  mediaType?: 'all' | 'movie' | 'tv';
  sortBy?: WatchlistSortOption;
  page?: number;
  pageSize?: number;
}

export interface WatchlistStatusCounts {
  all: number;
  plan_to_watch: number;
  watched: number;
  favorite: number;
}

export interface WatchlistQueryResult {
  items: WatchlistEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  statusCounts: WatchlistStatusCounts;
}
