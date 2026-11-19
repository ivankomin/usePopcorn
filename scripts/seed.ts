import type { TablesInsert } from '../types/database.types';

// Environment variables check
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY;
const tmdbToken = process.env.TMDB_ACCESS_TOKEN;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    'Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_SERVICE_KEY must be set in .env.local'
  );
  process.exit(1);
}

if (!tmdbToken) {
  console.error('Error: TMDB_ACCESS_TOKEN must be set in .env.local');
  process.exit(1);
}

// Target counts for new items to add per run (defaults to 50 movies + 50 TV = 100 total)
const TARGET_NEW_MOVIES = parseInt(process.env.SEED_MOVIES_COUNT || '50', 10);
const TARGET_NEW_TV = parseInt(process.env.SEED_TV_COUNT || '50', 10);

// Interfaces for TMDB API Responses
interface TMDBGenre {
  id: number;
  name: string;
}

interface TMDBGenreListResponse {
  genres: TMDBGenre[];
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

interface TMDBListResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
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

// Helpers for API requests
async function tmdbFetch<T>(endpoint: string): Promise<T> {
  const url = `https://api.themoviedb.org/3${endpoint}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${tmdbToken}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`TMDB API error (${res.status}) on ${endpoint}: ${errorBody}`);
  }

  return res.json() as Promise<T>;
}

async function supabaseFetch<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    prefer?: string;
  } = {}
): Promise<T> {
  const url = `${supabaseUrl}/rest/v1${path}`;
  const headers: Record<string, string> = {
    apikey: supabaseKey as string,
    Authorization: `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
  };

  if (options.prefer) {
    headers.Prefer = options.prefer;
  }

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Supabase API error (${res.status}) on ${path}: ${errorBody}`);
  }

  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

// Concurrency helper
async function mapConcurrent<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const p = fn(item).then((res) => {
      results.push(res);
    });

    const runner = p.then(() => {
      executing.splice(executing.indexOf(runner), 1);
    });

    executing.push(runner);

    if (executing.length >= limit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}

async function fetchExistingMediaKeys(): Promise<{
  existingTmdbIds: Set<number>;
  existingTitleYears: Set<string>;
}> {
  const rows = await supabaseFetch<
    Array<{ tmdb_id: number | null; title: string; release_year: number }>
  >('/media_items?select=tmdb_id,title,release_year&limit=2000');

  const existingTmdbIds = new Set<number>();
  const existingTitleYears = new Set<string>();

  for (const row of rows || []) {
    if (row.tmdb_id !== null) {
      existingTmdbIds.add(row.tmdb_id);
    }
    if (row.title && row.release_year) {
      existingTitleYears.add(`${row.title.toLowerCase()}::${row.release_year}`);
    }
  }

  console.log(
    `Found ${existingTmdbIds.size} existing TMDB IDs (${existingTitleYears.size} title+year keys) in Supabase.`
  );
  return { existingTmdbIds, existingTitleYears };
}

async function seedGenres(): Promise<Map<number, string>> {
  console.log('Fetching genres from TMDB...');
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

  const genreRecords: TablesInsert<'genres'>[] = Array.from(
    genreMap.entries()
  ).map(([id, name]) => ({
    id,
    name,
  }));

  console.log(`Upserting ${genreRecords.length} genres to Supabase...`);
  await supabaseFetch('/genres?on_conflict=id', {
    method: 'POST',
    body: genreRecords,
    prefer: 'resolution=merge-duplicates',
  });

  console.log(`Successfully synced ${genreRecords.length} genres.`);
  return genreMap;
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

interface MediaSeedData {
  item: TablesInsert<'media_items'>;
  genreIds: number[];
}

async function fetchMoviesToSeed(
  existingTmdbIds: Set<number>,
  existingTitleYears: Set<string>,
  targetCount: number
): Promise<MediaSeedData[]> {
  if (targetCount <= 0) return [];
  console.log(
    `Discovering ${targetCount} new popular & top-rated movies from TMDB...`
  );

  const candidateIds: number[] = [];
  const seenCandidateIds = new Set<number>(existingTmdbIds);
  const endpoints = [
    '/movie/top_rated?language=en',
    '/movie/popular?language=en',
  ];

  // Fetch extra buffer so we still hit targetCount after detail validation/dedup
  const bufferTarget = Math.ceil(targetCount * 1.4);

  for (let page = 1; page <= 12 && candidateIds.length < bufferTarget; page++) {
    const responses = await Promise.all(
      endpoints.map((ep) =>
        tmdbFetch<TMDBListResponse<TMDBMovieListItem>>(`${ep}&page=${page}`)
      )
    );

    for (const res of responses) {
      for (const m of res.results) {
        if (seenCandidateIds.has(m.id)) continue;
        if (!m.poster_path || !m.overview || !m.release_date) continue;
        if ((m.vote_count || 0) < 200) continue;

        const year = parseInt(m.release_date.slice(0, 4), 10);
        if (isNaN(year)) continue;
        const key = `${m.title.trim().toLowerCase()}::${year}`;
        if (existingTitleYears.has(key)) continue;

        seenCandidateIds.add(m.id);
        candidateIds.push(m.id);
        if (candidateIds.length >= bufferTarget) break;
      }
      if (candidateIds.length >= bufferTarget) break;
    }
  }

  console.log(`Fetching details for ${candidateIds.length} candidate new movies...`);

  const movies = await mapConcurrent(candidateIds, 5, async (tmdbId) => {
    try {
      const details = await tmdbFetch<TMDBMovieDetails>(
        `/movie/${tmdbId}?append_to_response=credits,release_dates&language=en`
      );

      const releaseDate = details.release_date || null;
      const releaseYear = releaseDate
        ? parseInt(releaseDate.slice(0, 4), 10)
        : null;

      if (!releaseYear || isNaN(releaseYear) || !details.title || !details.poster_path) {
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
        usRelease?.release_dates?.find((x) => x.certification)?.certification ||
        null;

      const budget = details.budget && details.budget > 0 ? details.budget : null;
      const budgetCategory = getBudgetCategory(budget);
      const revenue = details.revenue && details.revenue > 0 ? details.revenue : null;
      const status = details.status || null;

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
        poster_path: details.poster_path || null,
        imdb_rating: imdbRating > 0 ? imdbRating : null,
        vote_average: 0,
        vote_count: 0,
        country: primaryCountry,
        countries,
        budget,
        budget_category: budgetCategory,
        revenue,
        status,
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

  return movies.filter((m): m is MediaSeedData => m !== null).slice(0, targetCount);
}

async function fetchTVToSeed(
  existingTmdbIds: Set<number>,
  existingTitleYears: Set<string>,
  targetCount: number
): Promise<MediaSeedData[]> {
  if (targetCount <= 0) return [];
  console.log(
    `Discovering ${targetCount} new popular & top-rated TV series from TMDB...`
  );

  const candidateIds: number[] = [];
  const seenCandidateIds = new Set<number>(existingTmdbIds);
  const endpoints = [
    '/tv/top_rated?language=en',
    '/tv/popular?language=en',
  ];

  const bufferTarget = Math.ceil(targetCount * 1.4);

  for (let page = 1; page <= 12 && candidateIds.length < bufferTarget; page++) {
    const responses = await Promise.all(
      endpoints.map((ep) =>
        tmdbFetch<TMDBListResponse<TMDBTVListItem>>(`${ep}&page=${page}`)
      )
    );

    for (const res of responses) {
      for (const t of res.results) {
        if (seenCandidateIds.has(t.id)) continue;
        if (!t.poster_path || !t.overview || !t.first_air_date) continue;
        if ((t.vote_count || 0) < 200) continue;

        const year = parseInt(t.first_air_date.slice(0, 4), 10);
        if (isNaN(year)) continue;
        const key = `${t.name.trim().toLowerCase()}::${year}`;
        if (existingTitleYears.has(key)) continue;

        seenCandidateIds.add(t.id);
        candidateIds.push(t.id);
        if (candidateIds.length >= bufferTarget) break;
      }
      if (candidateIds.length >= bufferTarget) break;
    }
  }

  console.log(
    `Fetching details for ${candidateIds.length} candidate new TV series...`
  );

  const tvSeries = await mapConcurrent(candidateIds, 5, async (tmdbId) => {
    try {
      const details = await tmdbFetch<TMDBTVDetails>(
        `/tv/${tmdbId}?append_to_response=credits,content_ratings&language=en`
      );

      const airDate = details.first_air_date || null;
      const releaseYear = airDate ? parseInt(airDate.slice(0, 4), 10) : null;

      if (!releaseYear || isNaN(releaseYear) || !details.name || !details.poster_path) {
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
        details.content_ratings?.results?.find((r) => r.iso_3166_1 === 'US')
          ?.rating || null;

      const item: TablesInsert<'media_items'> = {
        tmdb_id: details.id,
        media_type: 'tv',
        title: details.name.trim(),
        original_title: details.original_name?.trim() || null,
        overview: details.overview?.trim() || null,
        release_year: releaseYear,
        release_date: airDate,
        runtime: details.episode_run_time?.[0] || null,
        seasons_count: details.number_of_seasons || 1,
        episodes_count: details.number_of_episodes || null,
        poster_path: details.poster_path || null,
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

  return tvSeries.filter((t): t is MediaSeedData => t !== null).slice(0, targetCount);
}

async function seedMediaItems(
  allMedia: MediaSeedData[],
  genreMap: Map<number, string>,
  existingTmdbIds: Set<number>,
  existingTitleYears: Set<string>
) {
  const seenTmdb = new Set<number>(existingTmdbIds);
  const seenTitleYear = new Set<string>(existingTitleYears);
  const uniqueItems: MediaSeedData[] = [];

  for (const entry of allMedia) {
    const tmdbId = entry.item.tmdb_id!;
    const titleKey = `${entry.item.title.toLowerCase()}::${entry.item.release_year}`;

    if (seenTmdb.has(tmdbId) || seenTitleYear.has(titleKey)) {
      continue;
    }

    seenTmdb.add(tmdbId);
    seenTitleYear.add(titleKey);
    uniqueItems.push(entry);
  }

  console.log(
    `Prepared ${uniqueItems.length} new unique media items to insert.`
  );

  if (uniqueItems.length === 0) {
    console.log('No new media items to insert.');
    return;
  }

  const mediaInsertRecords = uniqueItems.map((u) => u.item);

  console.log('Inserting new media items to Supabase in chunks...');
  const chunkSize = 25;
  const insertedItems: Array<{ id: string; tmdb_id: number }> = [];

  for (let i = 0; i < mediaInsertRecords.length; i += chunkSize) {
    const chunk = mediaInsertRecords.slice(i, i + chunkSize);
    const result = await supabaseFetch<Array<{ id: string; tmdb_id: number }>>(
      '/media_items?on_conflict=tmdb_id',
      {
        method: 'POST',
        body: chunk,
        prefer: 'resolution=ignore-duplicates,return=representation',
      }
    );
    insertedItems.push(...result);
  }

  console.log(`Successfully inserted ${insertedItems.length} new media items.`);

  // Map returned UUIDs back to genre associations
  const tmdbToUuid = new Map<number, string>();
  for (const item of insertedItems) {
    tmdbToUuid.set(item.tmdb_id, item.id);
  }

  const mediaGenresToInsert: TablesInsert<'media_genres'>[] = [];
  for (const entry of uniqueItems) {
    const mediaId = tmdbToUuid.get(entry.item.tmdb_id!);
    if (!mediaId) continue;

    for (const gId of entry.genreIds) {
      if (genreMap.has(gId)) {
        mediaGenresToInsert.push({
          media_id: mediaId,
          genre_id: gId,
        });
      }
    }
  }

  console.log(
    `Upserting ${mediaGenresToInsert.length} media_genre junction records...`
  );

  for (let i = 0; i < mediaGenresToInsert.length; i += chunkSize) {
    const chunk = mediaGenresToInsert.slice(i, i + chunkSize);
    await supabaseFetch('/media_genres?on_conflict=media_id,genre_id', {
      method: 'POST',
      body: chunk,
      prefer: 'resolution=merge-duplicates',
    });
  }

  console.log(
    `Successfully linked ${mediaGenresToInsert.length} media_genre relations.`
  );
}

async function main() {
  console.log('Starting TMDB offline database seeding...');
  const startTime = Date.now();

  const [genreMap, { existingTmdbIds, existingTitleYears }] = await Promise.all([
    seedGenres(),
    fetchExistingMediaKeys(),
  ]);

  const [movies, tvSeries] = await Promise.all([
    fetchMoviesToSeed(existingTmdbIds, existingTitleYears, TARGET_NEW_MOVIES),
    fetchTVToSeed(existingTmdbIds, existingTitleYears, TARGET_NEW_TV),
  ]);

  console.log(
    `Fetched ${movies.length} new movies and ${tvSeries.length} new TV series from TMDB.`
  );

  await seedMediaItems(
    [...movies, ...tvSeries],
    genreMap,
    existingTmdbIds,
    existingTitleYears
  );

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Seeding complete in ${durationSec}s!`);
}

main().catch((err) => {
  console.error('Fatal seeding error:', err);
  process.exit(1);
});
