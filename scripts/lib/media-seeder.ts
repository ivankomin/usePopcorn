import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, TablesInsert } from '../../types/database.types.ts';
import {
  getBudgetCategory,
  makeTitleYearKey,
  mapConcurrent,
  normalizeCountry,
  tmdbFetch,
  type TMDBGenreListResponse,
  type TMDBMovieDetails,
  type TMDBTVDetails,
} from './tmdb-client.ts';
import { writeSeedLog } from './system-lock.ts';

export interface MediaSeedData {
  item: TablesInsert<'media_items'>;
  genreIds: number[];
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

  await writeSeedLog(supabase, {
    level: 'info',
    category: 'db',
    action: 'db.sync_media_inserted',
    message: `Inserted ${insertedItems.length} new media items and linked ${mediaGenresToInsert.length} genre relations.`,
    metadata: {
      insertedCount: insertedItems.length,
      genreLinksCount: mediaGenresToInsert.length,
      moviesCount: insertedItems.filter((r) => r.media_type === 'movie').length,
      tvCount: insertedItems.filter((r) => r.media_type === 'tv').length,
    },
    dryRun,
  });
}
