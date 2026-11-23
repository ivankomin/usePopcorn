import { getBudgetCategory } from '../../lib/utils.ts';

export { getBudgetCategory };

export interface TMDBGenre {
  id: number;
  name: string;
}

export interface TMDBGenreListResponse {
  genres: TMDBGenre[];
}

export interface TMDBListResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface TMDBMovieListItem {
  id: number;
  title: string;
  original_title?: string;
  overview?: string;
  release_date?: string;
  poster_path?: string | null;
  vote_average?: number;
  vote_count?: number;
  genre_ids?: number[];
}

export interface TMDBTVListItem {
  id: number;
  name: string;
  original_name?: string;
  overview?: string;
  first_air_date?: string;
  poster_path?: string | null;
  vote_average?: number;
  vote_count?: number;
  genre_ids?: number[];
}

export interface TMDBCredits {
  cast?: Array<{ id: number; name: string; character?: string; order: number }>;
  crew?: Array<{ id: number; name: string; job: string; department?: string }>;
}

export interface TMDBMovieDetails {
  id: number;
  title: string;
  original_title?: string;
  overview?: string;
  release_date?: string;
  runtime?: number | null;
  budget?: number;
  revenue?: number;
  status?: string;
  production_countries?: Array<{ iso_3166_1: string; name: string }>;
  poster_path?: string | null;
  vote_average?: number;
  vote_count?: number;
  tagline?: string | null;
  genres?: TMDBGenre[];
  credits?: TMDBCredits;
  release_dates?: {
    results?: Array<{
      iso_3166_1: string;
      release_dates?: Array<{ certification?: string }>;
    }>;
  };
}

export interface TMDBTVDetails {
  id: number;
  name: string;
  original_name?: string;
  overview?: string;
  first_air_date?: string;
  episode_run_time?: number[];
  last_episode_to_air?: { runtime?: number | null } | null;
  number_of_seasons?: number;
  number_of_episodes?: number;
  status?: string;
  production_countries?: Array<{ iso_3166_1: string; name: string }>;
  poster_path?: string | null;
  vote_average?: number;
  vote_count?: number;
  tagline?: string | null;
  genres?: TMDBGenre[];
  created_by?: Array<{ id: number; name: string }>;
  credits?: TMDBCredits;
  content_ratings?: {
    results?: Array<{
      iso_3166_1: string;
      rating?: string;
    }>;
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function tmdbFetch<T>(
  endpoint: string,
  tmdbToken: string,
  maxAttempts = 3
): Promise<T> {
  const url = `https://api.themoviedb.org/3${endpoint}`;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${tmdbToken}`,
          Accept: 'application/json',
        },
      });

      if (res.ok) {
        return (await res.json()) as T;
      }

      const isRetryable = res.status === 429 || res.status >= 500;
      if (isRetryable && attempt < maxAttempts) {
        const retryAfterSec = Number.parseFloat(
          res.headers.get('retry-after') || ''
        );
        const delayMs =
          !Number.isNaN(retryAfterSec) && retryAfterSec > 0
            ? Math.ceil(retryAfterSec * 1000)
            : 1000 * attempt;
        console.warn(
          `TMDB ${res.status} on ${endpoint}; retrying in ${delayMs}ms (attempt ${attempt}/${maxAttempts})...`
        );
        await sleep(delayMs);
        continue;
      }

      const errorBody = await res.text();
      throw new Error(`TMDB API error (${res.status}) on ${endpoint}: ${errorBody}`);
    } catch (err) {
      if (attempt < maxAttempts && err instanceof TypeError) {
        const delayMs = 1000 * attempt;
        console.warn(
          `Network error on ${endpoint}; retrying in ${delayMs}ms (attempt ${attempt}/${maxAttempts})...`
        );
        await sleep(delayMs);
        continue;
      }
      throw err;
    }
  }

  throw new Error(`TMDB API failed after ${maxAttempts} attempts on ${endpoint}`);
}

export async function mapConcurrent<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const current = nextIndex++;
      results[current] = await fn(items[current]);
    }
  }

  const workerCount = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

export function normalizeCountry(name?: string): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  if (trimmed === 'United States of America') return 'United States';
  if (trimmed.includes('Korea')) return 'South Korea';
  return trimmed;
}

export function makeTitleYearKey(title: string, year: number): string {
  return `${title.trim().toLowerCase()}::${year}`;
}
