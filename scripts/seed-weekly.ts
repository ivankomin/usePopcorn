import * as fs from 'node:fs';
import * as path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import type { Database, TablesInsert } from '../types/database.types';

// Load .env.local when running locally (never overwrites existing env vars from CI/CLI)
function loadLocalEnv(): void {
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

loadLocalEnv();

function parseNonNegativeInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) || parsed < 0 ? fallback : parsed;
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const parsed = parseNonNegativeInt(raw, fallback);
  return parsed > 0 ? parsed : fallback;
}

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

// Weekly seeding configuration (overridable via environment variables)
const LOOKBACK_DAYS = parsePositiveInt(process.env.WEEKLY_LOOKBACK_DAYS, 30);
const TARGET_NEW_MOVIES = parseNonNegativeInt(process.env.WEEKLY_MOVIES_LIMIT, 25);
const TARGET_NEW_TV = parseNonNegativeInt(process.env.WEEKLY_TV_LIMIT, 25);
const MIN_MOVIE_VOTES = parseNonNegativeInt(process.env.WEEKLY_MOVIE_MIN_VOTES, 15);
const MIN_TV_VOTES = parseNonNegativeInt(process.env.WEEKLY_TV_MIN_VOTES, 10);
const MAX_DISCOVER_PAGES = parsePositiveInt(process.env.WEEKLY_MAX_PAGES, 10);
const DRY_RUN =
  process.argv.includes('--dry-run') ||
  process.env.DRY_RUN === 'true' ||
  process.env.DRY_RUN === '1';

// Exclude News (10763), Soap (10766), and Talk (10767) from weekly TV premieres
const EXCLUDED_TV_GENRE_IDS = '10763|10766|10767';
const SKIPPED_STATUSES = new Set(['Canceled', 'Rumored']);

const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// TMDB response interfaces
interface TMDBGenre {
  id: number;
  name: string;
}

interface TMDBGenreListResponse {
  genres: TMDBGenre[];
}

interface TMDBListResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

interface TMDBMovieListItem {
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

interface TMDBTVListItem {
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

interface TMDBCredits {
  cast?: Array<{ id: number; name: string; character?: string; order: number }>;
  crew?: Array<{ id: number; name: string; job: string; department?: string }>;
}

interface TMDBMovieDetails {
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

interface TMDBTVDetails {
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

interface MediaSeedData {
  item: TablesInsert<'media_items'>;
  genreIds: number[];
}

interface DateWindow {
  fromDate: string;
  toDate: string;
}

function getRollingDateWindow(lookbackDays: number): DateWindow {
  const now = new Date();
  const toUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const fromUtc = new Date(toUtc);
  fromUtc.setUTCDate(fromUtc.getUTCDate() - lookbackDays);

  return {
    fromDate: fromUtc.toISOString().slice(0, 10),
    toDate: toUtc.toISOString().slice(0, 10),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function tmdbFetch<T>(endpoint: string, maxAttempts = 3): Promise<T> {
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

async function mapConcurrent<T, R>(
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

function normalizeCountry(name?: string): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  if (trimmed === 'United States of America') return 'United States';
  if (trimmed.includes('Korea')) return 'South Korea';
  return trimmed;
}

function getBudgetCategory(budget?: number | null): string | null {
  if (!budget || budget <= 0) return null;
  if (budget < 15_000_000) return 'Low (< $15M)';
  if (budget <= 60_000_000) return 'Medium ($15M–$60M)';
  if (budget <= 120_000_000) return 'High ($60M–$120M)';
  return 'Blockbuster (> $120M)';
}

function makeTitleYearKey(title: string, year: number): string {
  return `${title.trim().toLowerCase()}::${year}`;
}

async function fetchExistingMediaKeys(): Promise<{
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

async function syncGenres(): Promise<Map<number, string>> {
  const [movieGenresRes, tvGenresRes] = await Promise.all([
    tmdbFetch<TMDBGenreListResponse>('/genre/movie/list?language=en'),
    tmdbFetch<TMDBGenreListResponse>('/genre/tv/list?language=en'),
  ]);

  const genreMap = new Map<number, string>();
  for (const g of movieGenresRes.genres) {
    genreMap.set(g.id, g.name);
  }
  for (const g of tvGenresRes.genres) {
    genreMap.set(g.id, g.name);
  }

  if (!DRY_RUN) {
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
    `Synced ${genreMap.size} TMDB genres${DRY_RUN ? ' (dry-run, skipped DB write)' : ''}.`
  );
  return genreMap;
}

async function discoverWeeklyMovies(
  window: DateWindow,
  existingTmdbIds: Set<number>,
  existingTitleYears: Set<string>,
  targetCount: number
): Promise<MediaSeedData[]> {
  if (targetCount <= 0) return [];

  console.log(
    `Discovering up to ${targetCount} newly released movies (${window.fromDate}..${window.toDate}, minVotes=${MIN_MOVIE_VOTES})...`
  );

  const candidateIds: number[] = [];
  const seenCandidateIds = new Set<number>(existingTmdbIds);
  const bufferTarget = Math.ceil(targetCount * 1.4);

  for (
    let page = 1;
    page <= MAX_DISCOVER_PAGES && candidateIds.length < bufferTarget;
    page++
  ) {
    const params = new URLSearchParams({
      language: 'en-US',
      include_adult: 'false',
      include_video: 'false',
      sort_by: 'popularity.desc',
      'primary_release_date.gte': window.fromDate,
      'primary_release_date.lte': window.toDate,
      'vote_count.gte': String(MIN_MOVIE_VOTES),
      page: String(page),
    });

    const res = await tmdbFetch<TMDBListResponse<TMDBMovieListItem>>(
      `/discover/movie?${params.toString()}`
    );

    for (const m of res.results) {
      if (seenCandidateIds.has(m.id)) continue;
      if (!m.title || !m.poster_path || !m.overview?.trim() || !m.release_date) {
        continue;
      }

      const year = Number.parseInt(m.release_date.slice(0, 4), 10);
      if (Number.isNaN(year)) continue;
      if (existingTitleYears.has(makeTitleYearKey(m.title, year))) continue;

      seenCandidateIds.add(m.id);
      candidateIds.push(m.id);
      if (candidateIds.length >= bufferTarget) break;
    }

    if (page >= res.total_pages) break;
  }

  if (candidateIds.length === 0) {
    console.log('No new candidate movies found for this window.');
    return [];
  }

  console.log(`Fetching details for ${candidateIds.length} candidate movies...`);

  const detailed = await mapConcurrent(candidateIds, 5, async (tmdbId) => {
    try {
      const details = await tmdbFetch<TMDBMovieDetails>(
        `/movie/${tmdbId}?append_to_response=credits,release_dates&language=en-US`
      );

      if (details.status && SKIPPED_STATUSES.has(details.status)) {
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

async function discoverWeeklyTV(
  window: DateWindow,
  existingTmdbIds: Set<number>,
  existingTitleYears: Set<string>,
  targetCount: number
): Promise<MediaSeedData[]> {
  if (targetCount <= 0) return [];

  console.log(
    `Discovering up to ${targetCount} newly premiered TV series (${window.fromDate}..${window.toDate}, minVotes=${MIN_TV_VOTES})...`
  );

  const candidateIds: number[] = [];
  const seenCandidateIds = new Set<number>(existingTmdbIds);
  const bufferTarget = Math.ceil(targetCount * 1.4);

  for (
    let page = 1;
    page <= MAX_DISCOVER_PAGES && candidateIds.length < bufferTarget;
    page++
  ) {
    const params = new URLSearchParams({
      language: 'en-US',
      include_adult: 'false',
      include_null_first_air_dates: 'false',
      sort_by: 'popularity.desc',
      'first_air_date.gte': window.fromDate,
      'first_air_date.lte': window.toDate,
      'vote_count.gte': String(MIN_TV_VOTES),
      without_genres: EXCLUDED_TV_GENRE_IDS,
      page: String(page),
    });

    const res = await tmdbFetch<TMDBListResponse<TMDBTVListItem>>(
      `/discover/tv?${params.toString()}`
    );

    for (const t of res.results) {
      if (seenCandidateIds.has(t.id)) continue;
      if (!t.name || !t.poster_path || !t.overview?.trim() || !t.first_air_date) {
        continue;
      }

      const year = Number.parseInt(t.first_air_date.slice(0, 4), 10);
      if (Number.isNaN(year)) continue;
      if (existingTitleYears.has(makeTitleYearKey(t.name, year))) continue;

      seenCandidateIds.add(t.id);
      candidateIds.push(t.id);
      if (candidateIds.length >= bufferTarget) break;
    }

    if (page >= res.total_pages) break;
  }

  if (candidateIds.length === 0) {
    console.log('No new candidate TV series found for this window.');
    return [];
  }

  console.log(
    `Fetching details for ${candidateIds.length} candidate TV series...`
  );

  const detailed = await mapConcurrent(candidateIds, 5, async (tmdbId) => {
    try {
      const details = await tmdbFetch<TMDBTVDetails>(
        `/tv/${tmdbId}?append_to_response=credits,content_ratings&language=en-US`
      );

      if (details.status && SKIPPED_STATUSES.has(details.status)) {
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

async function seedNewMediaItems(
  allMedia: MediaSeedData[],
  genreMap: Map<number, string>,
  existingTmdbIds: Set<number>,
  existingTitleYears: Set<string>
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

  if (DRY_RUN) {
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

async function main(): Promise<void> {
  const startTime = Date.now();
  const window = getRollingDateWindow(LOOKBACK_DAYS);

  console.log(
    `Starting weekly TMDB release sync (${window.fromDate} to ${window.toDate}, dryRun=${DRY_RUN})...`
  );

  const [genreMap, { existingTmdbIds, existingTitleYears }] = await Promise.all([
    syncGenres(),
    fetchExistingMediaKeys(),
  ]);

  const [movies, tvSeries] = await Promise.all([
    discoverWeeklyMovies(
      window,
      existingTmdbIds,
      existingTitleYears,
      TARGET_NEW_MOVIES
    ),
    discoverWeeklyTV(
      window,
      existingTmdbIds,
      existingTitleYears,
      TARGET_NEW_TV
    ),
  ]);

  console.log(
    `Prepared ${movies.length} movies and ${tvSeries.length} newly premiered TV series.`
  );

  await seedNewMediaItems(
    [...movies, ...tvSeries],
    genreMap,
    existingTmdbIds,
    existingTitleYears
  );

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Weekly TMDB sync finished in ${durationSec}s.`);
}

main().catch((err) => {
  console.error('Fatal weekly seeding error:', err);
  process.exit(1);
});
