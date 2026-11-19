import { createClient } from "@/lib/supabase/server";
import type {
  GenreRow,
  MediaItem,
  MediaItemRow,
  MediaMetadata,
  RecommendedMediaItem,
  RecommendationsResult,
  SimilarMediaItem,
  TasteGenreStat,
  UserTasteProfile,
} from "@/types/media";

interface MediaGenreJoin {
  genres: GenreRow | null;
}

interface HydratedMediaRow extends Omit<MediaItemRow, "metadata"> {
  metadata?: MediaMetadata | null;
  media_genres?: MediaGenreJoin[] | null;
}

interface SignalMediaRow {
  id: string;
  media_type: string;
  release_year: number;
  media_genres?: MediaGenreJoin[] | null;
}

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

function formatHydratedRow(row: HydratedMediaRow): MediaItem {
  const genres: GenreRow[] = (row.media_genres || [])
    .map((mg) => mg.genres)
    .filter((g): g is GenreRow => Boolean(g));

  const mediaFields: Omit<HydratedMediaRow, "media_genres"> = {
    id: row.id,
    tmdb_id: row.tmdb_id,
    media_type: row.media_type,
    title: row.title,
    original_title: row.original_title,
    overview: row.overview,
    release_year: row.release_year,
    release_date: row.release_date,
    runtime: row.runtime,
    seasons_count: row.seasons_count,
    episodes_count: row.episodes_count,
    status: row.status,
    poster_path: row.poster_path,
    budget: row.budget,
    revenue: row.revenue,
    budget_category: row.budget_category,
    country: row.country,
    countries: row.countries,
    age_rating: row.age_rating,
    vote_average: row.vote_average,
    vote_count: row.vote_count,
    imdb_rating: row.imdb_rating,
    metadata: row.metadata ?? null,
    created_at: row.created_at,
  };

  return {
    ...mediaFields,
    genres,
  };
}

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

  const rows = (data || []) as unknown as HydratedMediaRow[];
  for (const row of rows) {
    map.set(row.id, formatHydratedRow(row));
  }

  return map;
}

function buildGuestProfile(): UserTasteProfile {
  return {
    isAuthenticated: false,
    stage: "guest",
    signalCount: 0,
    reviewsCount: 0,
    watchlistCount: 0,
    positiveCount: 0,
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
    return buildGuestProfile();
  }

  const [{ data: reviews, error: revErr }, { data: watchlists, error: wlErr }] =
    await Promise.all([
      supabase
        .from("reviews")
        .select("media_id, rating")
        .eq("user_id", userId),
      supabase
        .from("watchlists")
        .select("media_id, status")
        .eq("user_id", userId),
    ]);

  if (revErr) console.error("Error fetching user reviews for taste profile:", revErr);
  if (wlErr) console.error("Error fetching user watchlists for taste profile:", wlErr);

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
  const reviewsCount = (reviews || []).length;
  const watchlistCount = (watchlists || []).length;

  if (signalCount === 0) {
    return {
      isAuthenticated: true,
      stage: "cold",
      signalCount: 0,
      reviewsCount,
      watchlistCount,
      positiveCount: 0,
      topGenres: [],
      preferredDecade: null,
      movieRatio: 50,
      tvRatio: 50,
    };
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

    const genres = (media.media_genres || [])
      .map((mg) => mg.genres?.name)
      .filter((name): name is string => Boolean(name));

    for (const genreName of genres) {
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

  const positiveGenres = Array.from(genreWeights.entries())
    .filter(([, w]) => w > 0)
    .sort((a, b) => b[1] - a[1]);

  const totalPositiveGenreWeight = positiveGenres.reduce(
    (acc, [, w]) => acc + w,
    0,
  );

  const topGenres: TasteGenreStat[] = positiveGenres
    .slice(0, 4)
    .map(([name, weight]) => ({
      name,
      weight: Number(weight.toFixed(2)),
      sharePercent:
        totalPositiveGenreWeight > 0
          ? Math.round((weight / totalPositiveGenreWeight) * 100)
          : 0,
    }));

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
    signalCount === 0
      ? "cold"
      : signalCount < 3 || positiveCount === 0
        ? "warming"
        : "personalized";

  return {
    isAuthenticated: true,
    stage,
    signalCount,
    reviewsCount,
    watchlistCount,
    positiveCount,
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
      isPersonalized: false,
      signalCount: tasteProfile.signalCount,
      tasteProfile,
    };
  }

  const rows = rpcRows || [];
  const orderedIds = rows.map((r) => r.media_id);
  const mediaMap = await hydrateMediaItemsByIds(supabase, orderedIds);

  const items: RecommendedMediaItem[] = [];
  for (const row of rows) {
    const media = mediaMap.get(row.media_id);
    if (!media) continue;
    items.push({
      media,
      score: row.score,
      matchPercent: row.match_percent,
      matchReasons: row.match_reasons || [],
      isPersonalized: row.is_personalized,
    });
  }

  const isPersonalized = rows.some((r) => r.is_personalized);
  const signalCount = rows[0]?.signal_count ?? tasteProfile.signalCount;

  return {
    items,
    isPersonalized,
    signalCount,
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

  const rows = rpcRows || [];
  const orderedIds = rows.map((r) => r.media_id);
  const mediaMap = await hydrateMediaItemsByIds(supabase, orderedIds);

  const items: SimilarMediaItem[] = [];
  for (const row of rows) {
    const media = mediaMap.get(row.media_id);
    if (!media) continue;
    items.push({
      media,
      score: row.score,
      matchPercent: row.match_percent,
      matchReasons: row.match_reasons || [],
    });
  }

  return items;
}
