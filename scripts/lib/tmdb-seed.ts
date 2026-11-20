import * as fs from 'node:fs';
import * as path from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database, TablesInsert } from '../../types/database.types';

// Shared TMDB response interfaces
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

export interface MediaSeedData {
  item: TablesInsert<'media_items'>;
  genreIds: number[];
}

export interface SeedContext {
  supabase: SupabaseClient<Database>;
  tmdbToken: string;
  dryRun: boolean;
}

export interface SystemLockOptions {
  dryRun?: boolean;
  updatingMessage: string;
  successMessage: string;
  errorMessage: string;
  interruptLabel: string;
}

const SYSTEM_STATE_ID = 'sync_status';
type SystemStatus = 'Free' | 'Updating';

// Load .env.local when running locally (never overwrites existing env vars from CI/CLI)
export function loadLocalEnv(): void {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const normalized = line.startsWith('export ') ? line.slice(7).trim() : line;
    const eqIndex = normalized.indexOf('=');
    if (eqIndex === -1) continue;

    const key = normalized.slice(0, eqIndex).trim();
    let value = normalized.slice(eqIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function parseNonNegativeInt(
  raw: string | undefined,
  fallback: number
): number {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) || parsed < 0 ? fallback : parsed;
}

export function parsePositiveInt(
  raw: string | undefined,
  fallback: number
): number {
  const parsed = parseNonNegativeInt(raw, fallback);
  return parsed > 0 ? parsed : fallback;
}

export function isDryRun(): boolean {
  return (
    process.argv.includes('--dry-run') ||
    process.env.DRY_RUN === 'true' ||
    process.env.DRY_RUN === '1'
  );
}

export function createSeedContext(): SeedContext {
  loadLocalEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY;
  const tmdbToken = process.env.TMDB_ACCESS_TOKEN;

  if (!supabaseUrl || !supabaseKey) {
    console.error(
      'Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.'
    );
    process.exit(1);
  }

  if (!tmdbToken) {
    console.error('Error: TMDB_ACCESS_TOKEN must be set.');
    process.exit(1);
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return {
    supabase,
    tmdbToken,
    dryRun: isDryRun(),
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

export function getBudgetCategory(budget?: number | null): string | null {
  if (!budget || budget <= 0) return null;
  if (budget < 15_000_000) return 'Low (< $15M)';
  if (budget <= 60_000_000) return 'Medium ($15M–$60M)';
  if (budget <= 120_000_000) return 'High ($60M–$120M)';
  return 'Blockbuster (> $120M)';
}

export function makeTitleYearKey(title: string, year: number): string {
  return `${title.trim().toLowerCase()}::${year}`;
}

async function setSystemState(
  supabase: SupabaseClient<Database>,
  status: SystemStatus,
  message: string
): Promise<void> {
  const { error } = await supabase.from('system_state').upsert(
    {
      id: SYSTEM_STATE_ID,
      status,
      message,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  if (error) {
    throw new Error(
      `Failed updating system_state to "${status}": ${error.message}`
    );
  }
}

export async function withSystemStateLock(
  supabase: SupabaseClient<Database>,
  options: SystemLockOptions,
  task: () => Promise<void>
): Promise<void> {
  if (options.dryRun) {
    console.log('[DRY RUN] Skipping system_state lock update.');
    await task();
    return;
  }

  let lockAcquired = false;
  let lockReleased = false;

  const releaseLock = async (message: string): Promise<void> => {
    if (!lockAcquired || lockReleased) return;
    lockReleased = true;

    try {
      await setSystemState(supabase, 'Free', message);
      console.log('System status restored to "Free" (manual ingestion unlocked).');
    } catch (unlockErr) {
      console.error('Failed to restore system_state to "Free":', unlockErr);
    }
  };

  const handleSigInt = () => {
    console.warn('\nReceived SIGINT. Releasing system lock before exiting...');
    void releaseLock(
      `System operational. Unlocked after ${options.interruptLabel} interrupted (SIGINT).`
    ).finally(() => {
      process.exit(130);
    });
  };

  const handleSigTerm = () => {
    console.warn('\nReceived SIGTERM. Releasing system lock before exiting...');
    void releaseLock(
      `System operational. Unlocked after ${options.interruptLabel} interrupted (SIGTERM).`
    ).finally(() => {
      process.exit(143);
    });
  };

  process.on('SIGINT', handleSigInt);
  process.on('SIGTERM', handleSigTerm);

  await setSystemState(supabase, 'Updating', options.updatingMessage);
  lockAcquired = true;
  console.log('System status set to "Updating" (manual ingestion locked).');

  let succeeded = false;
  try {
    await task();
    succeeded = true;
  } finally {
    process.off('SIGINT', handleSigInt);
    process.off('SIGTERM', handleSigTerm);
    await releaseLock(succeeded ? options.successMessage : options.errorMessage);
  }
}

export async function fetchExistingMediaKeys(
  supabase: SupabaseClient<Database>
): Promise<{
  existingTmdbIds: Set<number>;
  existingTitleYears: Set<string>;
}> {
  const existingTmdbIds = new Set<number>();
  const existingTitleYears = new Set<string>();
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('media_items')
      .select('tmdb_id, title, release_year')
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(`Failed fetching existing media_items: ${error.message}`);
    }

    if (!data || data.length === 0) break;

    for (const row of data) {
      if (row.tmdb_id !== null) {
        existingTmdbIds.add(row.tmdb_id);
      }
      if (row.title && row.release_year) {
        existingTitleYears.add(makeTitleYearKey(row.title, row.release_year));
      }
    }

    if (data.length < pageSize) break;
  }

  console.log(
    `Loaded ${existingTmdbIds.size} existing TMDB IDs (${existingTitleYears.size} title+year keys) from Supabase.`
  );
  return { existingTmdbIds, existingTitleYears };
}

export async function syncGenres(
  supabase: SupabaseClient<Database>,
  tmdbToken: string,
  dryRun = false
): Promise<Map<number, string>> {
  const [movieGenresRes, tvGenresRes] = await Promise.all([
    tmdbFetch<TMDBGenreListResponse>('/genre/movie/list?language=en', tmdbToken),
    tmdbFetch<TMDBGenreListResponse>('/genre/tv/list?language=en', tmdbToken),
  ]);

  const genreMap = new Map<number, string>();
  for (const g of movieGenresRes.genres) {
    genreMap.set(g.id, g.name);
  }
  for (const g of tvGenresRes.genres) {
    genreMap.set(g.id, g.name);
  }

  if (!dryRun) {
    const genreRecords: TablesInsert<'genres'>[] = Array.from(
      genreMap.entries()
    ).map(([id, name]) => ({ id, name }));

    const { error } = await supabase
      .from('genres')
      .upsert(genreRecords, { onConflict: 'id' });

    if (error) {
      throw new Error(`Failed syncing genres: ${error.message}`);
    }
  }

  console.log(
    `Synced ${genreMap.size} TMDB genres${dryRun ? ' (dry-run, skipped DB write)' : ''}.`
  );
  return genreMap;
}

export async function fetchMovieSeedDetails(
  candidateIds: number[],
  tmdbToken: string,
  targetCount: number,
  options: {
    skippedStatuses?: Set<string>;
    language?: string;
    concurrency?: number;
  } = {}
): Promise<MediaSeedData[]> {
  if (candidateIds.length === 0 || targetCount <= 0) return [];

  const {
    skippedStatuses,
    language = 'en-US',
    concurrency = 5,
  } = options;

  console.log(`Fetching details for ${candidateIds.length} candidate movies...`);

  const detailed = await mapConcurrent(candidateIds, concurrency, async (tmdbId) => {
    try {
      const details = await tmdbFetch<TMDBMovieDetails>(
        `/movie/${tmdbId}?append_to_response=credits,release_dates&language=${language}`,
        tmdbToken
      );

      if (skippedStatuses && details.status && skippedStatuses.has(details.status)) {
        return null;
      }

      const releaseDate = details.release_date || null;
      const releaseYear = releaseDate
        ? Number.parseInt(releaseDate.slice(0, 4), 10)
        : null;

      if (
        !releaseYear ||
        Number.isNaN(releaseYear) ||
        !details.title?.trim() ||
        !details.poster_path
      ) {
        return null;
      }

      const directors = (details.credits?.crew || [])
        .filter((c) => c.job === 'Director')
        .map((c) => c.name);

      const topCast = (details.credits?.cast || [])
        .slice(0, 8)
        .map((c) => c.name);

      const genreIds = (details.genres || []).map((g) => g.id);

      const imdbRating = Math.min(
        10,
        Math.max(0, Math.round((details.vote_average || 0) * 10) / 10)
      );

      const countries = (details.production_countries || [])
        .map((c) => normalizeCountry(c.name))
        .filter((c): c is string => Boolean(c));
      const primaryCountry = countries[0] || null;

      const usRelease = details.release_dates?.results?.find(
        (r) => r.iso_3166_1 === 'US'
      );
      const ageRating =
        usRelease?.release_dates?.find((x) => x.certification?.trim())
          ?.certification?.trim() || null;

      const budget =
        details.budget && details.budget > 0 ? details.budget : null;
      const budgetCategory = getBudgetCategory(budget);
      const revenue =
        details.revenue && details.revenue > 0 ? details.revenue : null;

      const item: TablesInsert<'media_items'> = {
        tmdb_id: details.id,
        media_type: 'movie',
        title: details.title.trim(),
        original_title: details.original_title?.trim() || null,
        overview: details.overview?.trim() || null,
        release_year: releaseYear,
        release_date: releaseDate,
        runtime: details.runtime || null,
        seasons_count: null,
        episodes_count: null,
        poster_path: details.poster_path,
        imdb_rating: imdbRating > 0 ? imdbRating : null,
        vote_average: 0,
        vote_count: 0,
        country: primaryCountry,
        countries,
        budget,
        budget_category: budgetCategory,
        revenue,
        status: details.status || null,
        age_rating: ageRating,
        metadata: {
          tagline: details.tagline || null,
          directors,
          cast: topCast,
        },
      };

      return { item, genreIds };
    } catch (err) {
      console.warn(`Failed to fetch details for movie ${tmdbId}:`, err);
      return null;
    }
  });

  return detailed
    .filter((entry): entry is MediaSeedData => entry !== null)
    .slice(0, targetCount);
}

export async function fetchTVSeedDetails(
  candidateIds: number[],
  tmdbToken: string,
  targetCount: number,
  options: {
    skippedStatuses?: Set<string>;
    language?: string;
    concurrency?: number;
  } = {}
): Promise<MediaSeedData[]> {
  if (candidateIds.length === 0 || targetCount <= 0) return [];

  const {
    skippedStatuses,
    language = 'en-US',
    concurrency = 5,
  } = options;

  console.log(
    `Fetching details for ${candidateIds.length} candidate TV series...`
  );

  const detailed = await mapConcurrent(candidateIds, concurrency, async (tmdbId) => {
    try {
      const details = await tmdbFetch<TMDBTVDetails>(
        `/tv/${tmdbId}?append_to_response=credits,content_ratings&language=${language}`,
        tmdbToken
      );

      if (skippedStatuses && details.status && skippedStatuses.has(details.status)) {
        return null;
      }

      const airDate = details.first_air_date || null;
      const releaseYear = airDate
        ? Number.parseInt(airDate.slice(0, 4), 10)
        : null;

      if (
        !releaseYear ||
        Number.isNaN(releaseYear) ||
        !details.name?.trim() ||
        !details.poster_path
      ) {
        return null;
      }

      const creators = (details.created_by || []).map((c) => c.name);
      const topCast = (details.credits?.cast || [])
        .slice(0, 8)
        .map((c) => c.name);

      const genreIds = (details.genres || []).map((g) => g.id);

      const imdbRating = Math.min(
        10,
        Math.max(0, Math.round((details.vote_average || 0) * 10) / 10)
      );

      const countries = (details.production_countries || [])
        .map((c) => normalizeCountry(c.name))
        .filter((c): c is string => Boolean(c));
      const primaryCountry = countries[0] || null;

      const usRating =
        details.content_ratings?.results
          ?.find((r) => r.iso_3166_1 === 'US')
          ?.rating?.trim() || null;

      const runtime =
        details.episode_run_time?.[0] ||
        details.last_episode_to_air?.runtime ||
        null;

      const item: TablesInsert<'media_items'> = {
        tmdb_id: details.id,
        media_type: 'tv',
        title: details.name.trim(),
        original_title: details.original_name?.trim() || null,
        overview: details.overview?.trim() || null,
        release_year: releaseYear,
        release_date: airDate,
        runtime,
        seasons_count: details.number_of_seasons || 1,
        episodes_count: details.number_of_episodes || null,
        poster_path: details.poster_path,
        imdb_rating: imdbRating > 0 ? imdbRating : null,
        vote_average: 0,
        vote_count: 0,
        country: primaryCountry,
        countries,
        budget: null,
        budget_category: null,
        revenue: null,
        status: details.status || null,
        age_rating: usRating,
        metadata: {
          tagline: details.tagline || null,
          creators,
          cast: topCast,
        },
      };

      return { item, genreIds };
    } catch (err) {
      console.warn(`Failed to fetch details for TV ${tmdbId}:`, err);
      return null;
    }
  });

  return detailed
    .filter((entry): entry is MediaSeedData => entry !== null)
    .slice(0, targetCount);
}

export async function seedNewMediaItems(
  supabase: SupabaseClient<Database>,
  allMedia: MediaSeedData[],
  genreMap: Map<number, string>,
  existingTmdbIds: Set<number>,
  existingTitleYears: Set<string>,
  dryRun = false
): Promise<void> {
  const seenTmdb = new Set<number>(existingTmdbIds);
  const seenTitleYear = new Set<string>(existingTitleYears);
  const uniqueItems: MediaSeedData[] = [];

  for (const entry of allMedia) {
    const tmdbId = entry.item.tmdb_id;
    if (tmdbId === null || tmdbId === undefined) continue;

    const titleKey = makeTitleYearKey(entry.item.title, entry.item.release_year);
    if (seenTmdb.has(tmdbId) || seenTitleYear.has(titleKey)) {
      continue;
    }

    seenTmdb.add(tmdbId);
    seenTitleYear.add(titleKey);
    uniqueItems.push(entry);
  }

  if (uniqueItems.length === 0) {
    console.log('Catalog is already up to date — no new media items to insert.');
    return;
  }

  if (dryRun) {
    console.log(
      `\n[DRY RUN] Would insert ${uniqueItems.length} new media items:`
    );
    for (const { item, genreIds } of uniqueItems) {
      const genreNames = genreIds
        .map((id) => genreMap.get(id))
        .filter((name): name is string => Boolean(name))
        .join(', ');
      console.log(
        `  - [${item.media_type.toUpperCase()}] ${item.title} (${item.release_date || item.release_year}) | TMDB #${item.tmdb_id} | rating=${item.imdb_rating ?? 'N/A'} | genres=[${genreNames}]`
      );
    }
    return;
  }

  const chunkSize = 25;
  const insertedItems: Array<{
    id: string;
    tmdb_id: number | null;
    title: string;
    media_type: string;
    release_date: string | null;
  }> = [];

  console.log(`Inserting ${uniqueItems.length} new media items into Supabase...`);

  for (let i = 0; i < uniqueItems.length; i += chunkSize) {
    const chunk = uniqueItems.slice(i, i + chunkSize).map((u) => u.item);
    const { data, error } = await supabase
      .from('media_items')
      .upsert(chunk, { onConflict: 'tmdb_id', ignoreDuplicates: true })
      .select('id, tmdb_id, title, media_type, release_date');

    if (error) {
      throw new Error(`Failed inserting media_items chunk: ${error.message}`);
    }

    if (data) {
      insertedItems.push(...data);
    }
  }

  console.log(`Inserted ${insertedItems.length} new media items:`);
  for (const row of insertedItems) {
    console.log(
      `  + [${row.media_type.toUpperCase()}] ${row.title} (${row.release_date || 'N/A'})`
    );
  }

  const tmdbToUuid = new Map<number, string>();
  for (const row of insertedItems) {
    if (row.tmdb_id !== null) {
      tmdbToUuid.set(row.tmdb_id, row.id);
    }
  }

  const mediaGenresToInsert: TablesInsert<'media_genres'>[] = [];
  for (const entry of uniqueItems) {
    const tmdbId = entry.item.tmdb_id;
    if (tmdbId === null || tmdbId === undefined) continue;

    const mediaId = tmdbToUuid.get(tmdbId);
    if (!mediaId) continue;

    for (const genreId of entry.genreIds) {
      if (genreMap.has(genreId)) {
        mediaGenresToInsert.push({
          media_id: mediaId,
          genre_id: genreId,
        });
      }
    }
  }

  if (mediaGenresToInsert.length > 0) {
    const genreChunkSize = 50;
    for (let i = 0; i < mediaGenresToInsert.length; i += genreChunkSize) {
      const chunk = mediaGenresToInsert.slice(i, i + genreChunkSize);
      const { error } = await supabase
        .from('media_genres')
        .upsert(chunk, { onConflict: 'media_id,genre_id', ignoreDuplicates: true });

      if (error) {
        throw new Error(`Failed upserting media_genres chunk: ${error.message}`);
      }
    }
    console.log(`Linked ${mediaGenresToInsert.length} media_genre associations.`);
  }
}
