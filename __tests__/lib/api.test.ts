import { createClient } from "@/lib/supabase/server";
import {
  filterCollectionItems,
  getCurrentUserProfile,
  getGenres,
  getMediaById,
  getMediaCatalog,
  getMediaReviews,
  getUserCabinetStats,
  getUserCollectionsWithMedia,
  getUserReviewForMedia,
  getUserReviewsArchive,
  getUserWatchlistEntryForMedia,
  getWatchlistWithFilters,
} from "@/lib/api";
import type { MediaRowWithGenres } from "@/lib/media-mappers";
import type { CollectionWithMedia } from "@/types/media";

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
    title: `Movie ${id}`,
    original_title: `Movie ${id}`,
    overview: "Overview",
    release_year: 2020,
    release_date: "2020-05-01",
    runtime: 115,
    seasons_count: null,
    episodes_count: null,
    status: "Released",
    poster_path: `/${id}.jpg`,
    budget: 25_000_000,
    revenue: 90_000_000,
    budget_category: "Medium ($15M–$60M)",
    country: "United States",
    countries: ["United States"],
    age_rating: "PG-13",
    imdb_rating: 7.9,
    vote_average: 8.2,
    vote_count: 5000,
    metadata: null,
    created_at: "2026-01-01T00:00:00Z",
    media_genres: [{ genre_id: 28, genres: { id: 28, name: "Action" } }],
    ...overrides,
  };
}

describe("lib/api", () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  describe("getGenres", () => {
    it("deduplicates and sorts genres for a specific mediaType and falls back on error", async () => {
      mockedCreateClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [
                  { id: 18, name: "Drama" },
                  { id: 28, name: "Action" },
                  { id: 18, name: "Drama" },
                ],
                error: null,
              }),
            }),
          }),
        }),
      } as never);

      expect(await getGenres("movie")).toEqual([
        { id: 28, name: "Action" },
        { id: 18, name: "Drama" },
      ]);

      let call = 0;
      mockedCreateClient.mockResolvedValue({
        from: jest.fn(() => {
          call += 1;
          if (call === 1) {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  order: jest
                    .fn()
                    .mockResolvedValue({ data: null, error: { message: "join err" } }),
                }),
              }),
            };
          }
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [{ id: 35, name: "Comedy" }],
                error: null,
              }),
            }),
          };
        }),
      } as never);

      expect(await getGenres("tv")).toEqual([{ id: 35, name: "Comedy" }]);
    });

    it("fetches all genres when mediaType is omitted and throws on DB error", async () => {
      mockedCreateClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [{ id: 28, name: "Action" }],
              error: null,
            }),
          }),
        }),
      } as never);

      expect(await getGenres()).toEqual([{ id: 28, name: "Action" }]);

      mockedCreateClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: null,
              error: new Error("Genres failed"),
            }),
          }),
        }),
      } as never);

      await expect(getGenres()).rejects.toThrow("Genres failed");
    });
  });

  describe("getMediaCatalog & getMediaById", () => {
    it("uses inner genre join + preferAllGenres when filtering by genres and clamps pagination", async () => {
      const selectCalls: string[] = [];
      const rangeMock = jest.fn().mockResolvedValue({
        data: [
          makeMediaRow("m-1", {
            media_genres: [{ genres: { id: 28, name: "Action" } }],
            all_genres: [
              { genres: { id: 28, name: "Action" } },
              { genres: { id: 878, name: "Science Fiction" } },
            ],
          }),
        ],
        count: 25,
        error: null,
      });

      const fluent: Record<string, jest.Mock> = {
        select: jest.fn((q: string) => {
          selectCalls.push(q);
          return fluent;
        }),
        eq: jest.fn(() => fluent),
        in: jest.fn(() => fluent),
        ilike: jest.fn(() => fluent),
        lt: jest.fn(() => fluent),
        lte: jest.fn(() => fluent),
        gt: jest.fn(() => fluent),
        gte: jest.fn(() => fluent),
        contains: jest.fn(() => fluent),
        order: jest.fn(() => fluent),
        range: rangeMock,
      };

      mockedCreateClient.mockResolvedValue({
        from: jest.fn().mockReturnValue(fluent),
      } as never);

      const result = await getMediaCatalog({
        genres: ["Action"],
        page: 2,
        pageSize: 10,
      });

      expect(selectCalls[0]).toContain("all_genres:media_genres(genres(*))");
      expect(rangeMock).toHaveBeenCalledWith(10, 19);
      expect(result.total).toBe(25);
      expect(result.totalPages).toBe(3);
      expect(result.items[0].genres).toEqual([
        { id: 28, name: "Action" },
        { id: 878, name: "Science Fiction" },
      ]);
    });

    it("returns null for PGRST116 not-found in getMediaById and normalizes existing items", async () => {
      mockedCreateClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: "PGRST116", message: "0 rows" },
              }),
            }),
          }),
        }),
      } as never);

      expect(await getMediaById("missing-id")).toBeNull();

      mockedCreateClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: makeMediaRow("m-9"),
                error: null,
              }),
            }),
          }),
        }),
      } as never);

      const media = await getMediaById("m-9");
      expect(media?.id).toBe("m-9");
      expect(media?.genres).toEqual([{ id: 28, name: "Action" }]);
    });
  });

  describe("reviews, watchlist, profile & cabinet stats", () => {
    it("fetches non-anonymized media reviews and handles guest early returns", async () => {
      const notMock = jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: [{ id: "r-1", rating: 9 }],
          error: null,
        }),
      });
      mockedCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({ not: notMock }),
          }),
        }),
      } as never);

      expect(await getMediaReviews("m-1")).toHaveLength(1);
      expect(notMock).toHaveBeenCalledWith("user_id", "is", null);
      expect(await getUserReviewForMedia("m-1")).toBeNull();
      expect(await getUserWatchlistEntryForMedia("m-1")).toBeNull();
      expect(await getCurrentUserProfile()).toBeNull();
    });

    it("filters, counts statuses, sorts, and paginates watchlists in getWatchlistWithFilters", async () => {
      mockedCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
        },
      } as never);

      const guestWatchlist = await getWatchlistWithFilters({ pageSize: 12 });
      expect(guestWatchlist).toEqual({
        items: [],
        total: 0,
        page: 1,
        pageSize: 12,
        totalPages: 0,
        statusCounts: { all: 0, plan_to_watch: 0, watched: 0, favorite: 0 },
      });

      mockedCreateClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [
                  {
                    id: "w-1",
                    user_id: "u-1",
                    media_id: "m-1",
                    status: "favorite",
                    created_at: "2026-01-01T00:00:00Z",
                    media: makeMediaRow("m-1", {
                      title: "Alpha",
                      vote_average: 7.5,
                    }),
                  },
                  {
                    id: "w-2",
                    user_id: "u-1",
                    media_id: "m-2",
                    status: "watched",
                    created_at: "2026-02-01T00:00:00Z",
                    media: makeMediaRow("m-2", {
                      title: "Beta",
                      vote_average: 9.1,
                    }),
                  },
                  {
                    id: "w-3",
                    user_id: "u-1",
                    media_id: "m-3",
                    status: "favorite",
                    created_at: "2026-03-01T00:00:00Z",
                    media: makeMediaRow("m-3", {
                      title: "Gamma",
                      vote_average: 8.8,
                    }),
                  },
                ],
                error: null,
              }),
            }),
          }),
        }),
      } as never);

      const res = await getWatchlistWithFilters(
        {
          status: "favorite",
          sortBy: "vote_average_desc",
          page: 1,
          pageSize: 1,
        },
        "u-1",
      );

      expect(res.statusCounts).toEqual({
        all: 3,
        plan_to_watch: 0,
        watched: 1,
        favorite: 2,
      });
      expect(res.total).toBe(2);
      expect(res.totalPages).toBe(2);
      expect(res.items.map((e) => e.id)).toEqual(["w-3"]);
    });

    it("computes cabinet stats including rounded averageRatingGiven and ignores null ratings", async () => {
      mockedCreateClient.mockResolvedValue({
        from: jest.fn((table: string) => {
          if (table === "watchlists") {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [
                    { status: "plan_to_watch" },
                    { status: "watched" },
                    { status: "favorite" },
                    { status: "favorite" },
                  ],
                  error: null,
                }),
              }),
            };
          }
          if (table === "reviews") {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [
                    { rating: 8 },
                    { rating: 9 },
                    { rating: 10 },
                    { rating: null },
                  ],
                  error: null,
                }),
              }),
            };
          }
          throw new Error(`Unexpected table: ${table}`);
        }),
      } as never);

      expect(await getUserCabinetStats("u-1")).toEqual({
        watchlistTotal: 4,
        planToWatchCount: 1,
        watchedCount: 1,
        favoriteCount: 2,
        reviewsCount: 4,
        averageRatingGiven: 9,
      });
    });

    it("normalizes user review archives and collections, and filters collection items in-memory", async () => {
      mockedCreateClient.mockResolvedValue({
        from: jest.fn((table: string) => {
          if (table === "reviews") {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  order: jest.fn().mockResolvedValue({
                    data: [
                      { id: "r-1", media: makeMediaRow("m-1") },
                      { id: "r-2", media: null },
                    ],
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === "collections") {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  order: jest.fn().mockResolvedValue({
                    data: [
                      {
                        id: "col-1",
                        user_id: "u-1",
                        name: "Sci-Fi Picks",
                        description: null,
                        created_at: "2026-01-01T00:00:00Z",
                        updated_at: "2026-01-01T00:00:00Z",
                        collection_items: [
                          {
                            id: "ci-1",
                            collection_id: "col-1",
                            media_id: "m-old",
                            created_at: "2026-01-02T00:00:00Z",
                            media: makeMediaRow("m-old", { title: "Dune" }),
                          },
                          {
                            id: "ci-2",
                            collection_id: "col-1",
                            media_id: "m-new",
                            created_at: "2026-05-02T00:00:00Z",
                            media: makeMediaRow("m-new", { title: "Arrival" }),
                          },
                        ],
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            };
          }
          throw new Error(`Unexpected table: ${table}`);
        }),
      } as never);

      const archive = await getUserReviewsArchive("u-1");
      expect(archive).toHaveLength(2);
      expect(archive[0].media?.genres).toEqual([{ id: 28, name: "Action" }]);
      expect(archive[1].media).toBeNull();

      const collections = await getUserCollectionsWithMedia("u-1");
      expect(collections).toHaveLength(1);
      expect(collections[0].itemCount).toBe(2);
      expect(collections[0].items.map((i) => i.id)).toEqual(["ci-2", "ci-1"]);

      const filtered = filterCollectionItems(collections[0] as CollectionWithMedia, {
        search: "dune",
        sortBy: "added_asc",
      });
      expect(filtered.total).toBe(1);
      expect(filtered.items[0].media?.title).toBe("Dune");
    });
  });
});
