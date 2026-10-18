import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  for (const line of envConfig.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const tmdbToken = process.env.TMDB_ACCESS_TOKEN;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase URL and Key must be defined in .env.local');
  process.exit(1);
}

if (!tmdbToken) {
  console.error('Error: TMDB_ACCESS_TOKEN must be defined in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

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

async function tmdbFetch<T>(endpoint: string): Promise<T | null> {
  const url = `https://api.themoviedb.org/3${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${tmdbToken}`,
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      console.warn(`TMDB returned ${res.status} for ${endpoint}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`Failed fetching TMDB endpoint ${endpoint}:`, err);
    return null;
  }
}

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

interface MediaItemRecord {
  id: string;
  tmdb_id: number | null;
  media_type: string;
  title: string;
  metadata: Record<string, unknown> | null;
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

  await mapConcurrent(items as MediaItemRecord[], 5, async (item) => {
    try {
      let countries: string[] = [];
      let primaryCountry: string | null = null;
      let budget: number | null = null;
      let budgetCategory: string | null = null;
      let ageRating: string | null = null;
      let revenue: number | null = null;
      let status: string | null = null;
      let episodesCount: number | null = null;

      if (item.media_type === 'movie') {
        const details = await tmdbFetch<{
          budget?: number;
          revenue?: number;
          status?: string;
          production_countries?: Array<{ iso_3166_1: string; name: string }>;
          release_dates?: {
            results?: Array<{
              iso_3166_1: string;
              release_dates?: Array<{ certification?: string }>;
            }>;
          };
        }>(`/movie/${item.tmdb_id}?append_to_response=release_dates&language=en`);

        if (details) {
          countries = (details.production_countries || [])
            .map((c) => normalizeCountry(c.name))
            .filter((c): c is string => Boolean(c));
          primaryCountry = countries[0] || null;

          const usRelease = details.release_dates?.results?.find(
            (r) => r.iso_3166_1 === 'US'
          );
          ageRating =
            usRelease?.release_dates?.find((x) => x.certification)?.certification ||
            null;

          budget = details.budget && details.budget > 0 ? details.budget : null;
          budgetCategory = getBudgetCategory(budget);
          revenue = details.revenue && details.revenue > 0 ? details.revenue : null;
          status = details.status || null;
        }
      } else {
        const details = await tmdbFetch<{
          number_of_episodes?: number;
          status?: string;
          production_countries?: Array<{ iso_3166_1: string; name: string }>;
          content_ratings?: {
            results?: Array<{
              iso_3166_1: string;
              rating?: string;
            }>;
          };
        }>(`/tv/${item.tmdb_id}?append_to_response=content_ratings&language=en`);

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
      const {
        country: _c,
        countries: _cs,
        budget: _b,
        budget_category: _bc,
        age_rating: _ar,
        ...cleanMetadata
      } = (item.metadata || {}) as Record<string, unknown>;

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
          metadata: cleanMetadata,
        })
        .eq('id', item.id);

      if (updateError) {
        console.error(`Failed to update item ${item.title} (${item.id}):`, updateError);
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
