import type { Json } from '../types/database.types.ts';
import {
  createSeedContext,
  getBudgetCategory,
  mapConcurrent,
  normalizeCountry,
  tmdbFetch,
  type TMDBMovieDetails,
  type TMDBTVDetails,
} from './lib/tmdb-seed.ts';

const { supabase, tmdbToken } = createSeedContext();

async function fetchTmdbOptional<T>(endpoint: string): Promise<T | null> {
  try {
    return await tmdbFetch<T>(endpoint, tmdbToken);
  } catch (err) {
    console.warn(`Failed fetching TMDB endpoint ${endpoint}:`, err);
    return null;
  }
}

async function runEnrichment() {
  console.log('Fetching all media items from Supabase...');
  const { data: items, error } = await supabase
    .from('media_items')
    .select('id, tmdb_id, media_type, title, metadata')
    .not('tmdb_id', 'is', null);

  if (error || !items) {
    console.error('Error fetching media items:', error);
    process.exit(1);
  }

  console.log(`Found ${items.length} media items to enrich.`);

  let enrichedCount = 0;

  await mapConcurrent(items, 5, async (item) => {
    if (!item.tmdb_id) return;

    try {
      let primaryCountry: string | null = null;
      let countries: string[] = [];
      let budget: number | null = null;
      let budgetCategory: string | null = null;
      let revenue: number | null = null;
      let status: string | null = null;
      let episodesCount: number | null = null;
      let ageRating: string | null = null;

      if (item.media_type === 'movie') {
        const details = await fetchTmdbOptional<TMDBMovieDetails>(
          `/movie/${item.tmdb_id}?append_to_response=release_dates&language=en-US`
        );

        if (details) {
          countries = (details.production_countries || [])
            .map((c) => normalizeCountry(c.name))
            .filter((c): c is string => Boolean(c));
          primaryCountry = countries[0] || null;

          budget = details.budget && details.budget > 0 ? details.budget : null;
          budgetCategory = getBudgetCategory(budget);
          revenue = details.revenue && details.revenue > 0 ? details.revenue : null;
          status = details.status || null;

          const usRelease = details.release_dates?.results?.find(
            (r) => r.iso_3166_1 === 'US'
          );
          if (usRelease?.release_dates) {
            const certObj = usRelease.release_dates.find(
              (d) => d.certification && d.certification.trim() !== ''
            );
            ageRating = certObj?.certification?.trim() || null;
          }
        }
      } else if (item.media_type === 'tv') {
        const details = await fetchTmdbOptional<TMDBTVDetails>(
          `/tv/${item.tmdb_id}?append_to_response=content_ratings&language=en-US`
        );

        if (details) {
          countries = (details.production_countries || [])
            .map((c) => normalizeCountry(c.name))
            .filter((c): c is string => Boolean(c));
          primaryCountry = countries[0] || null;

          ageRating =
            details.content_ratings?.results?.find((r) => r.iso_3166_1 === 'US')
              ?.rating || null;
          status = details.status || null;
          episodesCount = details.number_of_episodes || null;
        }
      }

      // Ensure metadata only contains unstructured supplementary attributes
      const cleanMetadata: Record<string, Json | undefined> =
        item.metadata &&
        typeof item.metadata === 'object' &&
        !Array.isArray(item.metadata)
          ? { ...(item.metadata as Record<string, Json | undefined>) }
          : {};
      delete cleanMetadata.country;
      delete cleanMetadata.countries;
      delete cleanMetadata.budget;
      delete cleanMetadata.budget_category;
      delete cleanMetadata.age_rating;

      const { error: updateError } = await supabase
        .from('media_items')
        .update({
          country: primaryCountry,
          countries,
          budget,
          budget_category: budgetCategory,
          age_rating: ageRating,
          revenue,
          status,
          episodes_count: episodesCount,
          metadata: cleanMetadata as Json,
        })
        .eq('id', item.id);

      if (updateError) {
        console.error(
          `Failed to update item ${item.title} (${item.id}):`,
          updateError
        );
      } else {
        enrichedCount++;
        if (enrichedCount % 10 === 0 || enrichedCount === items.length) {
          console.log(`Enriched ${enrichedCount}/${items.length} items...`);
        }
      }
    } catch (err) {
      console.warn(`Error enriching ${item.title}:`, err);
    }
  });

  console.log(`\nSuccessfully enriched ${enrichedCount} media items in Supabase.`);
}

runEnrichment();
