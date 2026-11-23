import * as fs from 'node:fs';
import * as path from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database.types.ts';

export interface SeedContext {
  supabase: SupabaseClient<Database>;
  tmdbToken: string;
  dryRun: boolean;
}

/**
 * Loads `.env.local` when running scripts locally (never overwrites existing CI/CLI env vars).
 */
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

/**
 * Loads `.env.local` and instantiates a typed Supabase service-role client for offline scripts.
 */
export function createAdminSupabaseClient(): SupabaseClient<Database> {
  loadLocalEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error(
      'Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.'
    );
    process.exit(1);
  }

  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function createSeedContext(): SeedContext {
  const supabase = createAdminSupabaseClient();
  const tmdbToken = process.env.TMDB_ACCESS_TOKEN;

  if (!tmdbToken) {
    console.error('Error: TMDB_ACCESS_TOKEN must be set.');
    process.exit(1);
  }

  return {
    supabase,
    tmdbToken,
    dryRun: isDryRun(),
  };
}
