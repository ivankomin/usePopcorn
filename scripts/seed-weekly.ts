import {
  createSeedContext,
  fetchExistingMediaKeys,
  fetchMovieSeedDetails,
  fetchTVSeedDetails,
  makeTitleYearKey,
  parseNonNegativeInt,
  parsePositiveInt,
  seedNewMediaItems,
  syncGenres,
  tmdbFetch,
  withSystemStateLock,
  writeSeedLog,
  type MediaSeedData,
  type TMDBListResponse,
  type TMDBMovieListItem,
  type TMDBTVListItem,
} from './lib/tmdb-seed.ts';

const { supabase, tmdbToken, dryRun } = createSeedContext();

// Weekly seeding configuration (overridable via environment variables)
const LOOKBACK_DAYS = parsePositiveInt(process.env.WEEKLY_LOOKBACK_DAYS, 30);
const TARGET_NEW_MOVIES = parseNonNegativeInt(
  process.env.WEEKLY_MOVIES_LIMIT,
  25
);
const TARGET_NEW_TV = parseNonNegativeInt(process.env.WEEKLY_TV_LIMIT, 25);
const MIN_MOVIE_VOTES = parseNonNegativeInt(
  process.env.WEEKLY_MOVIE_MIN_VOTES,
  15
);
const MIN_TV_VOTES = parseNonNegativeInt(process.env.WEEKLY_TV_MIN_VOTES, 10);
const MAX_DISCOVER_PAGES = parsePositiveInt(process.env.WEEKLY_MAX_PAGES, 10);

// Exclude News (10763), Soap (10766), and Talk (10767) from weekly TV premieres
const EXCLUDED_TV_GENRE_IDS = '10763|10766|10767';
const SKIPPED_STATUSES = new Set(['Canceled', 'Rumored']);

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
      `/discover/movie?${params.toString()}`,
      tmdbToken
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

  return fetchMovieSeedDetails(candidateIds, tmdbToken, targetCount, {
    skippedStatuses: SKIPPED_STATUSES,
    language: 'en-US',
  });
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
      `/discover/tv?${params.toString()}`,
      tmdbToken
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

  return fetchTVSeedDetails(candidateIds, tmdbToken, targetCount, {
    skippedStatuses: SKIPPED_STATUSES,
    language: 'en-US',
  });
}

async function main(): Promise<void> {
  const startTime = Date.now();
  const window = getRollingDateWindow(LOOKBACK_DAYS);

  console.log(
    `Starting weekly TMDB release sync (${window.fromDate} to ${window.toDate}, dryRun=${dryRun})...`
  );

  await withSystemStateLock(
    supabase,
    {
      dryRun,
      updatingMessage:
        'Weekly TMDB release synchronization in progress. Manual ingestion locked.',
      successMessage:
        'System operational. Last weekly TMDB sync completed successfully.',
      errorMessage:
        'System operational. Unlocked after weekly TMDB sync error.',
      interruptLabel: 'weekly TMDB sync',
    },
    async () => {
      const [genreMap, { existingTmdbIds, existingTitleYears }] =
        await Promise.all([
          syncGenres(supabase, tmdbToken, dryRun),
          fetchExistingMediaKeys(supabase),
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
        supabase,
        [...movies, ...tvSeries],
        genreMap,
        existingTmdbIds,
        existingTitleYears,
        dryRun
      );

      const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`Weekly TMDB sync finished in ${durationSec}s.`);
      await writeSeedLog(supabase, {
        level: 'info',
        category: 'sync',
        action: 'sync.weekly_completed',
        message: `Weekly TMDB sync completed in ${durationSec}s (prepared ${movies.length} movies, ${tvSeries.length} TV series).`,
        metadata: {
          fromDate: window.fromDate,
          toDate: window.toDate,
          preparedMovies: movies.length,
          preparedTv: tvSeries.length,
          durationSec: Number(durationSec),
        },
        dryRun,
      });
    }
  );
}

main().catch(async (err) => {
  console.error('Fatal weekly seeding error:', err);
  await writeSeedLog(supabase, {
    level: 'critical',
    category: 'sync',
    action: 'sync.weekly_fatal',
    message: `Fatal weekly TMDB sync error: ${
      err instanceof Error ? err.message : String(err)
    }`,
    dryRun,
  });
  process.exit(1);
});
