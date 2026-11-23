import type { Json } from '../types/database.types.ts';
import {
  createSeedContext,
  mapConcurrent,
  pickBestYouTubeTrailerKey,
  tmdbFetch,
  type TMDBVideosResponse,
} from './lib/tmdb-seed.ts';

const { supabase, tmdbToken, dryRun } = createSeedContext();

interface ExistingMediaRow {
  id: string;
  tmdb_id: number | null;
  media_type: string;
  title: string;
  metadata: Json | null;
}

async function fetchAllTmdbMedia(): Promise<ExistingMediaRow[]> {
  const rows: ExistingMediaRow[] = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('media_items')
      .select('id, tmdb_id, media_type, title, metadata')
      .not('tmdb_id', 'is', null)
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(`Failed loading media_items: ${error.message}`);
    }

    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < pageSize) break;
  }

  return rows;
}

async function main() {
  console.log(
    `Scanning catalog for items missing YouTube trailer keys${dryRun ? ' (DRY RUN)' : ''}...`
  );

  const allItems = await fetchAllTmdbMedia();
  const missingTrailers = allItems.filter((item) => {
    if (!item.tmdb_id) return false;
    const meta =
      item.metadata &&
      typeof item.metadata === 'object' &&
      !Array.isArray(item.metadata)
        ? (item.metadata as Record<string, unknown>)
        : null;
    const existing = meta?.trailer_key;
    return typeof existing !== 'string' || existing.trim().length === 0;
  });

  console.log(
    `Found ${missingTrailers.length}/${allItems.length} TMDB items without trailer_key.`
  );

  if (missingTrailers.length === 0) {
    console.log('All catalog items already have trailer keys.');
    return;
  }

  let updatedCount = 0;
  let notFoundCount = 0;

  await mapConcurrent(missingTrailers, 5, async (item) => {
    if (!item.tmdb_id) return;
    const endpoint =
      item.media_type === 'tv'
        ? `/tv/${item.tmdb_id}/videos?language=en-US`
        : `/movie/${item.tmdb_id}/videos?language=en-US`;

    try {
      const res = await tmdbFetch<TMDBVideosResponse>(endpoint, tmdbToken);
      const trailerKey = pickBestYouTubeTrailerKey(res.results);

      if (!trailerKey) {
        notFoundCount++;
        return;
      }

      if (dryRun) {
        updatedCount++;
        console.log(
          `  [DRY RUN] ${item.title} (${item.media_type}) -> https://youtu.be/${trailerKey}`
        );
        return;
      }

      const existingMeta: Record<string, Json | undefined> =
        item.metadata &&
        typeof item.metadata === 'object' &&
        !Array.isArray(item.metadata)
          ? { ...(item.metadata as Record<string, Json | undefined>) }
          : {};

      const { error: updateError } = await supabase
        .from('media_items')
        .update({
          metadata: {
            ...existingMeta,
            trailer_key: trailerKey,
          } as Json,
        })
        .eq('id', item.id);

      if (updateError) {
        console.warn(
          `Failed updating trailer for "${item.title}" (${item.id}): ${updateError.message}`
        );
        return;
      }

      updatedCount++;
      if (updatedCount % 25 === 0 || updatedCount === missingTrailers.length) {
        console.log(
          `Updated ${updatedCount} trailers (${notFoundCount} without YouTube trailers)...`
        );
      }
    } catch (err) {
      console.warn(`Error fetching trailer for "${item.title}":`, err);
    }
  });

  console.log(
    `\nTrailer backfill complete: ${updatedCount} updated, ${notFoundCount} had no YouTube trailer on TMDB.`
  );
}

main().catch((err) => {
  console.error('Unexpected error during trailer backfill:', err);
  process.exit(1);
});
