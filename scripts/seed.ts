import {
  createSeedContext,
  fetchExistingMediaKeys,
  fetchMovieSeedDetails,
  fetchTVSeedDetails,
  makeTitleYearKey,
  parseNonNegativeInt,
  seedNewMediaItems,
  syncGenres,
  tmdbFetch,
  withSystemStateLock,
  type MediaSeedData,
  type TMDBListResponse,
  type TMDBMovieListItem,
  type TMDBTVListItem,
} from './lib/tmdb-seed.ts';

const { supabase, tmdbToken, dryRun } = createSeedContext();

// Target counts for new items to add per run (defaults to 50 movies + 50 TV = 100 total)
const TARGET_NEW_MOVIES = parseNonNegativeInt(process.env.SEED_MOVIES_COUNT, 50);
const TARGET_NEW_TV = parseNonNegativeInt(process.env.SEED_TV_COUNT, 50);

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
        tmdbFetch<TMDBListResponse<TMDBMovieListItem>>(
          `${ep}&page=${page}`,
          tmdbToken
        )
      )
    );

    for (const res of responses) {
      for (const m of res.results) {
        if (seenCandidateIds.has(m.id)) continue;
        if (!m.title || !m.poster_path || !m.overview || !m.release_date) continue;
        if ((m.vote_count || 0) < 200) continue;

        const year = Number.parseInt(m.release_date.slice(0, 4), 10);
        if (Number.isNaN(year)) continue;
        if (existingTitleYears.has(makeTitleYearKey(m.title, year))) continue;

        seenCandidateIds.add(m.id);
        candidateIds.push(m.id);
        if (candidateIds.length >= bufferTarget) break;
      }
      if (candidateIds.length >= bufferTarget) break;
    }
  }

  return fetchMovieSeedDetails(candidateIds, tmdbToken, targetCount, {
    language: 'en',
  });
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
        tmdbFetch<TMDBListResponse<TMDBTVListItem>>(
          `${ep}&page=${page}`,
          tmdbToken
        )
      )
    );

    for (const res of responses) {
      for (const t of res.results) {
        if (seenCandidateIds.has(t.id)) continue;
        if (!t.name || !t.poster_path || !t.overview || !t.first_air_date) continue;
        if ((t.vote_count || 0) < 200) continue;

        const year = Number.parseInt(t.first_air_date.slice(0, 4), 10);
        if (Number.isNaN(year)) continue;
        if (existingTitleYears.has(makeTitleYearKey(t.name, year))) continue;

        seenCandidateIds.add(t.id);
        candidateIds.push(t.id);
        if (candidateIds.length >= bufferTarget) break;
      }
      if (candidateIds.length >= bufferTarget) break;
    }
  }

  return fetchTVSeedDetails(candidateIds, tmdbToken, targetCount, {
    language: 'en',
  });
}

async function main(): Promise<void> {
  const startTime = Date.now();
  console.log(`Starting TMDB offline database seeding (dryRun=${dryRun})...`);

  await withSystemStateLock(
    supabase,
    {
      dryRun,
      updatingMessage:
        'TMDB database seeding in progress. Manual ingestion locked.',
      successMessage:
        'System operational. Last TMDB seeding completed successfully.',
      errorMessage: 'System operational. Unlocked after TMDB seeding error.',
      interruptLabel: 'TMDB seeding',
    },
    async () => {
      const [genreMap, { existingTmdbIds, existingTitleYears }] =
        await Promise.all([
          syncGenres(supabase, tmdbToken, dryRun),
          fetchExistingMediaKeys(supabase),
        ]);

      const [movies, tvSeries] = await Promise.all([
        fetchMoviesToSeed(
          existingTmdbIds,
          existingTitleYears,
          TARGET_NEW_MOVIES
        ),
        fetchTVToSeed(existingTmdbIds, existingTitleYears, TARGET_NEW_TV),
      ]);

      console.log(
        `Fetched ${movies.length} new movies and ${tvSeries.length} new TV series from TMDB.`
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
      console.log(`Seeding complete in ${durationSec}s!`);
    }
  );
}

main().catch((err) => {
  console.error('Fatal seeding error:', err);
  process.exit(1);
});
