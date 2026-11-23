import { createClient } from "@/lib/supabase/server";
import {
  extractGenres,
  normalizeMediaRow,
  type MediaGenreJoin,
  type MediaRowWithGenres,
} from "@/lib/media-mappers";
import type {
  MediaItem,
  RecommendedMediaItem,
  RecommendationsResult,
  SimilarMediaItem,
  UserTasteProfile,
} from "@/types/media";

interface SignalMediaRow {
  id: string;
  media_type: string;
  release_year: number;
  media_genres?: MediaGenreJoin[] | null;
}

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function hydrateMediaItemsByIds(
  supabase: ServerSupabaseClient,
  ids: string[],
): Promise<Map<string, MediaItem>> {
  const map = new Map<string, MediaItem>();
  if (ids.length === 0) return map;

  const { data, error } = await supabase
    .from("media_items")
    .select("*, media_genres(genres(*))")
    .in("id", ids);

  if (error) {
    console.error("Error hydrating recommendation media items:", error);
    return map;
  }

  const rows = (data || []) as unknown as MediaRowWithGenres[];
  for (const row of rows) {
    map.set(row.id, normalizeMediaRow(row));
  }

  return map;
}

async function hydrateOrderedRpcRows<
  TRow extends { media_id: string },
  TResult,
>(
  supabase: ServerSupabaseClient,
  rows: TRow[],
  mapItem: (media: MediaItem, row: TRow) => TResult,
): Promise<TResult[]> {
  if (rows.length === 0) return [];
  const mediaMap = await hydrateMediaItemsByIds(
    supabase,
    rows.map((r) => r.media_id),
  );

  const items: TResult[] = [];
  for (const row of rows) {
    const media = mediaMap.get(row.media_id);
    if (!media) continue;
    items.push(mapItem(media, row));
  }
  return items;
}

function buildColdProfile(): UserTasteProfile {
  return {
    stage: "cold",
    signalCount: 0,
    topGenres: [],
    preferredDecade: null,
    movieRatio: 50,
    tvRatio: 50,
  };
}

async function computeUserTasteProfile(
  supabase: ServerSupabaseClient,
  userId: string | null,
): Promise<UserTasteProfile> {
  if (!userId) {
    return buildColdProfile();
  }

  const [{ data: reviews, error: revErr }, { data: watchlists, error: wlErr }] =
    await Promise.all([
      supabase.from("reviews").select("media_id, rating").eq("user_id", userId),
      supabase
        .from("watchlists")
        .select("media_id, status")
        .eq("user_id", userId),
    ]);

  if (revErr)
    console.error("Error fetching user reviews for taste profile:", revErr);
  if (wlErr)
    console.error("Error fetching user watchlists for taste profile:", wlErr);

  const reviewMap = new Map<string, number | null>();
  for (const r of reviews || []) {
    reviewMap.set(r.media_id, r.rating);
  }

  const watchlistMap = new Map<string, string>();
  for (const w of watchlists || []) {
    watchlistMap.set(w.media_id, w.status);
  }

  const allMediaIds = Array.from(
    new Set([...reviewMap.keys(), ...watchlistMap.keys()]),
  );

  const signalCount = allMediaIds.length;

  if (signalCount === 0) {
    return buildColdProfile();
  }

  const { data: mediaRows, error: mediaErr } = await supabase
    .from("media_items")
    .select("id, media_type, release_year, media_genres(genres(*))")
    .in("id", allMediaIds);

  if (mediaErr) {
    console.error("Error fetching media for taste profile:", mediaErr);
  }

  const mediaById = new Map<string, SignalMediaRow>();
  for (const row of (mediaRows || []) as unknown as SignalMediaRow[]) {
    mediaById.set(row.id, row);
  }

  const genreWeights = new Map<string, number>();
  let positiveCount = 0;
  let positiveWeightSum = 0;
  let weightedYearSum = 0;
  let movieWeightSum = 0;

  for (const mediaId of allMediaIds) {
    const rating = reviewMap.get(mediaId);
    const wlStatus = watchlistMap.get(mediaId);

    let weight: number;
    if (rating !== undefined && rating !== null) {
      const favoriteBonus = wlStatus === "favorite" ? 0.25 : 0;
      weight = Math.max(-1, Math.min(1, (rating - 5.5) / 4.5 + favoriteBonus));
    } else if (wlStatus === "favorite") {
      weight = 1.0;
    } else if (wlStatus === "plan_to_watch") {
      weight = 0.35;
    } else if (wlStatus === "watched") {
      weight = 0.2;
    } else {
      weight = 0.15;
    }

    const media = mediaById.get(mediaId);
    if (!media) continue;

    const genreNames = extractGenres(media.media_genres)
      .map((g) => g.name)
      .filter(
        (name): name is string =>
          typeof name === "string" && name.trim().length > 0,
      );

    for (const genreName of genreNames) {
      genreWeights.set(genreName, (genreWeights.get(genreName) || 0) + weight);
    }

    if (weight > 0) {
      positiveCount += 1;
      positiveWeightSum += weight;
      weightedYearSum += media.release_year * weight;
      if (media.media_type === "movie") {
        movieWeightSum += weight;
      }
    }
  }

  const topGenres = Array.from(genreWeights.entries())
    .filter(([, w]) => w > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name]) => name);

  const preferredDecade =
    positiveWeightSum > 0
      ? `${Math.floor(weightedYearSum / positiveWeightSum / 10) * 10}s`
      : null;

  const movieRatio =
    positiveWeightSum > 0
      ? Math.round((movieWeightSum / positiveWeightSum) * 100)
      : 50;
  const tvRatio = positiveWeightSum > 0 ? 100 - movieRatio : 50;

  const stage: UserTasteProfile["stage"] =
    signalCount < 3 || positiveCount === 0 ? "warming" : "personalized";

  return {
    stage,
    signalCount,
    topGenres,
    preferredDecade,
    movieRatio,
    tvRatio,
  };
}

/**
 * Fetches personalized media recommendations via PostgreSQL RPC get_user_recommendations,
 * automatically falling back to genre-diversified top-rated picks for cold-start users.
 */
export async function getUserRecommendations(options?: {
  mediaType?: "all" | "movie" | "tv";
  limit?: number;
}): Promise<RecommendationsResult> {
  const supabase = await createClient();
  const mediaType = options?.mediaType ?? "all";
  const limit = options?.limit ?? 16;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: rpcRows, error: rpcError }, tasteProfile] = await Promise.all([
    supabase.rpc("get_user_recommendations", {
      p_media_type: mediaType,
      p_limit: limit,
    }),
    computeUserTasteProfile(supabase, user?.id ?? null),
  ]);

  if (rpcError) {
    console.error("Error fetching user recommendations RPC:", rpcError);
    return {
      items: [],
      tasteProfile,
    };
  }

  const items = await hydrateOrderedRpcRows<
    NonNullable<typeof rpcRows>[number],
    RecommendedMediaItem
  >(supabase, rpcRows || [], (media, row) => ({
    media,
    matchReasons: row.match_reasons || [],
  }));

  return {
    items,
    tasteProfile,
  };
}

/**
 * Fetches item-to-item similar titles for a media detail page via get_similar_media RPC.
 */
export async function getSimilarMedia(
  mediaId: string,
  limit = 6,
): Promise<SimilarMediaItem[]> {
  const supabase = await createClient();

  const { data: rpcRows, error: rpcError } = await supabase.rpc(
    "get_similar_media",
    {
      p_media_id: mediaId,
      p_limit: limit,
    },
  );

  if (rpcError) {
    console.error(`Error fetching similar media for ${mediaId}:`, rpcError);
    return [];
  }

  return hydrateOrderedRpcRows(supabase, rpcRows || [], (media) => ({
    media,
  }));
}
