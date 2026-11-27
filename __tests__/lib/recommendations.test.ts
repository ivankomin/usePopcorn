import { createClient } from "@/lib/supabase/server";
import {
  getSimilarMedia,
  getUserRecommendations,
} from "@/lib/recommendations";
import type { MediaRowWithGenres } from "@/lib/media-mappers";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

const mockedCreateClient = createClient as jest.MockedFunction<
  typeof createClient
>;

function makeMediaRow(
  id: string,
  overrides: Partial<MediaRowWithGenres> = {},
): MediaRowWithGenres {
  return {
    id,
    tmdb_id: 100,
    media_type: "movie",
    title: `Title ${id}`,
    original_title: `Title ${id}`,
    overview: "Overview",
    release_year: 2015,
    release_date: "2015-05-01",
    runtime: 120,
    seasons_count: null,
    episodes_count: null,
    status: "Released",
    poster_path: `/${id}.jpg`,
    budget: 50_000_000,
    revenue: 150_000_000,
    budget_category: "Medium ($15M–$60M)",
    country: "United States",
    countries: ["United States"],
    age_rating: "PG-13",
    imdb_rating: 8.1,
    vote_average: 8.0,
    vote_count: 1000,
    metadata: null,
    created_at: "2026-01-01T00:00:00Z",
    media_genres: [{ genre_id: 28, genres: { id: 28, name: "Action" } }],
    ...overrides,
  };
}

interface MockSupabaseConfig {
  userId?: string | null;
  rpcResult?: { data: unknown[] | null; error: { message: string } | null };
  reviewsResult?: {
    data: Array<{ media_id: string; rating: number | null }> | null;
    error: { message: string } | null;
  };
  watchlistsResult?: {
    data: Array<{ media_id: string; status: string }> | null;
    error: { message: string } | null;
  };
  signalMediaResult?: {
    data: Array<{
      id: string;
      media_type: string;
      release_year: number;
      media_genres: Array<{ genres: { id: number; name: string } | null }>;
    }> | null;
    error: { message: string } | null;
  };
  hydratedMediaResult?: {
    data: MediaRowWithGenres[] | null;
    error: { message: string } | null;
  };
}

function createMockSupabase(cfg: MockSupabaseConfig = {}) {
  const rpc = jest
    .fn()
    .mockResolvedValue(cfg.rpcResult ?? { data: [], error: null });

  const mediaInCalls: Array<{ selectCols: string; ids: string[] }> = [];

  const from = jest.fn((table: string) => {
    if (table === "reviews") {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest
            .fn()
            .mockResolvedValue(cfg.reviewsResult ?? { data: [], error: null }),
        }),
      };
    }

    if (table === "watchlists") {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest
            .fn()
            .mockResolvedValue(
              cfg.watchlistsResult ?? { data: [], error: null },
            ),
        }),
      };
    }

    if (table === "media_items") {
      return {
        select: jest.fn((selectCols: string) => ({
          in: jest.fn((_col: string, ids: string[]) => {
            mediaInCalls.push({ selectCols, ids });
            if (selectCols.startsWith("*,")) {
              return Promise.resolve(
                cfg.hydratedMediaResult ?? { data: [], error: null },
              );
            }
            return Promise.resolve(
              cfg.signalMediaResult ?? { data: [], error: null },
            );
          }),
        })),
      };
    }

    throw new Error(`Unexpected table queried: ${table}`);
  });

  const client = {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: cfg.userId ? { id: cfg.userId } : null },
      }),
    },
    rpc,
    from,
  };

  mockedCreateClient.mockResolvedValue(client as never);
  return { client, rpc, from, mediaInCalls };
}

describe("lib/recommendations", () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  describe("getUserRecommendations", () => {
    it("returns a cold taste profile for guest users and preserves RPC ordering while skipping missing rows", async () => {
      const { rpc } = createMockSupabase({
        userId: null,
        rpcResult: {
          data: [
            { media_id: "m-2", match_reasons: ["Top rated"] },
            { media_id: "m-missing", match_reasons: ["Should be skipped"] },
            { media_id: "m-1", match_reasons: null },
          ],
          error: null,
        },
        hydratedMediaResult: {
          // Deliberately returned out of RPC order
          data: [makeMediaRow("m-1"), makeMediaRow("m-2")],
          error: null,
        },
      });

      const result = await getUserRecommendations();

      expect(rpc).toHaveBeenCalledWith("get_user_recommendations", {
        p_media_type: "all",
        p_limit: 16,
      });
      expect(result.tasteProfile).toEqual({
        stage: "cold",
        signalCount: 0,
        topGenres: [],
        preferredDecade: null,
        movieRatio: 50,
        tvRatio: 50,
      });
      expect(result.items.map((item) => item.media.id)).toEqual(["m-2", "m-1"]);
      expect(result.items[0].matchReasons).toEqual(["Top rated"]);
      expect(result.items[1].matchReasons).toEqual([]);
    });

    it("returns a cold profile for a signed-in user with zero reviews and zero watchlist entries", async () => {
      const { mediaInCalls } = createMockSupabase({
        userId: "user-empty",
        reviewsResult: { data: [], error: null },
        watchlistsResult: { data: [], error: null },
        rpcResult: { data: [], error: null },
      });

      const result = await getUserRecommendations({
        mediaType: "movie",
        limit: 8,
      });

      expect(result.tasteProfile.stage).toBe("cold");
      expect(result.tasteProfile.signalCount).toBe(0);
      expect(mediaInCalls).toHaveLength(0);
    });

    it("returns warming stage when user has fewer than 3 signals", async () => {
      createMockSupabase({
        userId: "user-warming",
        reviewsResult: {
          data: [{ media_id: "sig-1", rating: 9 }],
          error: null,
        },
        watchlistsResult: {
          data: [{ media_id: "sig-2", status: "plan_to_watch" }],
          error: null,
        },
        signalMediaResult: {
          data: [
            {
              id: "sig-1",
              media_type: "movie",
              release_year: 2014,
              media_genres: [{ genres: { id: 878, name: "Science Fiction" } }],
            },
            {
              id: "sig-2",
              media_type: "tv",
              release_year: 2022,
              media_genres: [{ genres: { id: 18, name: "Drama" } }],
            },
          ],
          error: null,
        },
      });

      const result = await getUserRecommendations();

      expect(result.tasteProfile.stage).toBe("warming");
      expect(result.tasteProfile.signalCount).toBe(2);
      expect(result.tasteProfile.topGenres).toEqual([
        "Science Fiction",
        "Drama",
      ]);
      expect(result.tasteProfile.movieRatio + result.tasteProfile.tvRatio).toBe(
        100,
      );
      expect(result.tasteProfile.movieRatio).toBeGreaterThan(50);
    });

    it("stays in warming stage when >= 3 signals exist but all ratings are negative", async () => {
      createMockSupabase({
        userId: "user-critic",
        reviewsResult: {
          data: [
            { media_id: "s1", rating: 1 },
            { media_id: "s2", rating: 2 },
            { media_id: "s3", rating: 4 },
          ],
          error: null,
        },
        watchlistsResult: { data: [], error: null },
        signalMediaResult: {
          data: [
            {
              id: "s1",
              media_type: "movie",
              release_year: 2001,
              media_genres: [{ genres: { id: 27, name: "Horror" } }],
            },
            {
              id: "s2",
              media_type: "movie",
              release_year: 2005,
              media_genres: [{ genres: { id: 35, name: "Comedy" } }],
            },
            {
              id: "s3",
              media_type: "tv",
              release_year: 2010,
              media_genres: [{ genres: { id: 18, name: "Drama" } }],
            },
          ],
          error: null,
        },
      });

      const result = await getUserRecommendations();

      expect(result.tasteProfile).toEqual({
        stage: "warming",
        signalCount: 3,
        topGenres: [],
        preferredDecade: null,
        movieRatio: 50,
        tvRatio: 50,
      });
    });

    it("computes personalized taste profile weights, top 4 genres, decade, and movie/TV ratios", async () => {
      const { rpc } = createMockSupabase({
        userId: "user-pro",
        // Deduplicated signals across reviews & watchlists:
        // s1: rating 10 + favorite -> clamped to 1.0 (movie, 2012, Sci-Fi + Thriller + blank)
        // s2: favorite only -> 1.0 (tv, 2018, Drama + Sci-Fi)
        // s3: plan_to_watch only -> 0.35 (movie, 2014, Action)
        // s4: watched only -> 0.20 (movie, 2016, Adventure)
        // s5: unknown status only -> 0.15 (tv, 2019, Mystery)
        // s6: rating 1 -> -1.0 (movie, 1995, Horror -> negative, excluded from topGenres & decade)
        reviewsResult: {
          data: [
            { media_id: "s1", rating: 10 },
            { media_id: "s6", rating: 1 },
          ],
          error: null,
        },
        watchlistsResult: {
          data: [
            { media_id: "s1", status: "favorite" },
            { media_id: "s2", status: "favorite" },
            { media_id: "s3", status: "plan_to_watch" },
            { media_id: "s4", status: "watched" },
            { media_id: "s5", status: "custom" },
          ],
          error: null,
        },
        signalMediaResult: {
          data: [
            {
              id: "s1",
              media_type: "movie",
              release_year: 2012,
              media_genres: [
                { genres: { id: 878, name: "Science Fiction" } },
                { genres: { id: 53, name: "Thriller" } },
                { genres: { id: 999, name: "   " } },
              ],
            },
            {
              id: "s2",
              media_type: "tv",
              release_year: 2018,
              media_genres: [
                { genres: { id: 18, name: "Drama" } },
                { genres: { id: 878, name: "Science Fiction" } },
              ],
            },
            {
              id: "s3",
              media_type: "movie",
              release_year: 2014,
              media_genres: [{ genres: { id: 28, name: "Action" } }],
            },
            {
              id: "s4",
              media_type: "movie",
              release_year: 2016,
              media_genres: [{ genres: { id: 12, name: "Adventure" } }],
            },
            {
              id: "s5",
              media_type: "tv",
              release_year: 2019,
              media_genres: [{ genres: { id: 9648, name: "Mystery" } }],
            },
            {
              id: "s6",
              media_type: "movie",
              release_year: 1995,
              media_genres: [{ genres: { id: 27, name: "Horror" } }],
            },
          ],
          error: null,
        },
        rpcResult: {
          data: [{ media_id: "rec-1", match_reasons: ["Matches Sci-Fi"] }],
          error: null,
        },
        hydratedMediaResult: {
          data: [makeMediaRow("rec-1")],
          error: null,
        },
      });

      const result = await getUserRecommendations({
        mediaType: "tv",
        limit: 10,
      });

      expect(rpc).toHaveBeenCalledWith("get_user_recommendations", {
        p_media_type: "tv",
        p_limit: 10,
      });

      // positiveWeightSum = 1.0 + 1.0 + 0.35 + 0.20 + 0.15 = 2.70
      // movieWeightSum = 1.0 + 0.35 + 0.20 = 1.55 -> Math.round(1.55 / 2.70 * 100) = 57
      expect(result.tasteProfile).toEqual({
        stage: "personalized",
        signalCount: 6,
        topGenres: ["Science Fiction", "Thriller", "Drama", "Action"],
        preferredDecade: "2010s",
        movieRatio: 57,
        tvRatio: 43,
      });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].matchReasons).toEqual(["Matches Sci-Fi"]);
    });

    it("returns empty items while preserving tasteProfile when the RPC or hydration fails", async () => {
      createMockSupabase({
        userId: null,
        rpcResult: { data: null, error: { message: "RPC timeout" } },
      });

      const rpcFailed = await getUserRecommendations();
      expect(rpcFailed.items).toEqual([]);
      expect(rpcFailed.tasteProfile.stage).toBe("cold");
      expect(errorSpy).toHaveBeenCalledWith(
        "Error fetching user recommendations RPC:",
        { message: "RPC timeout" },
      );

      createMockSupabase({
        userId: null,
        rpcResult: {
          data: [{ media_id: "m-1", match_reasons: ["Popular"] }],
          error: null,
        },
        hydratedMediaResult: {
          data: null,
          error: { message: "Hydration failed" },
        },
      });

      const hydrationFailed = await getUserRecommendations();
      expect(hydrationFailed.items).toEqual([]);
      expect(errorSpy).toHaveBeenCalledWith(
        "Error hydrating recommendation media items:",
        { message: "Hydration failed" },
      );
    });
  });

  describe("getSimilarMedia", () => {
    it("hydrates similar media in RPC order using default or custom limits", async () => {
      const { rpc } = createMockSupabase({
        rpcResult: {
          data: [{ media_id: "sim-2" }, { media_id: "sim-1" }],
          error: null,
        },
        hydratedMediaResult: {
          data: [makeMediaRow("sim-1"), makeMediaRow("sim-2")],
          error: null,
        },
      });

      const items = await getSimilarMedia("target-123");

      expect(rpc).toHaveBeenCalledWith("get_similar_media", {
        p_media_id: "target-123",
        p_limit: 6,
      });
      expect(items.map((item) => item.media.id)).toEqual(["sim-2", "sim-1"]);
    });

    it("returns an empty array on RPC error or empty RPC result without querying media_items", async () => {
      const { rpc, mediaInCalls } = createMockSupabase({
        rpcResult: { data: null, error: { message: "Database error" } },
      });

      const failed = await getSimilarMedia("target-999", 4);
      expect(rpc).toHaveBeenCalledWith("get_similar_media", {
        p_media_id: "target-999",
        p_limit: 4,
      });
      expect(failed).toEqual([]);
      expect(mediaInCalls).toHaveLength(0);
    });
  });
});
