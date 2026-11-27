import {
  applyCatalogQueryFilters,
  applyCatalogQuerySorting,
  compareMediaItems,
  matchesMediaFilters,
  matchesRuntime,
  matchesSeasons,
  parseMediaFilterParams,
  parseRuntimeRange,
  parseSeasonsRange,
  type CatalogFilterQueryBuilder,
  type CatalogSortQueryBuilder,
} from "@/lib/filters";
import type { MediaItem } from "@/types/media";

function makeMedia(overrides: Partial<MediaItem> = {}): MediaItem {
  return {
    id: "media-1",
    tmdb_id: 100,
    media_type: "movie",
    title: "Inception",
    original_title: "Inception",
    overview: "Dream heist.",
    release_year: 2010,
    release_date: "2010-07-16",
    runtime: 148,
    seasons_count: null,
    episodes_count: null,
    status: "Released",
    poster_path: "/inception.jpg",
    budget: 160_000_000,
    revenue: 836_800_000,
    budget_category: "Blockbuster (> $120M)",
    country: "United States",
    countries: ["United States", "United Kingdom"],
    age_rating: "PG-13",
    imdb_rating: 8.8,
    vote_average: 8.4,
    vote_count: 35000,
    metadata: null,
    created_at: "2026-01-01T00:00:00Z",
    genres: [
      { id: 28, name: "Action" },
      { id: 878, name: "Science Fiction" },
    ],
    ...overrides,
  };
}

describe("lib/filters", () => {
  describe("parseRuntimeRange & matchesRuntime", () => {
    it("parses all supported runtime labels including hyphen and en-dash variants", () => {
      expect(parseRuntimeRange(undefined)).toBeNull();
      expect(parseRuntimeRange("All Runtimes")).toBeNull();
      expect(parseRuntimeRange("Unknown")).toBeNull();
      expect(parseRuntimeRange("Under 90 min")).toEqual({ lt: 90 });
      expect(parseRuntimeRange("90–120 min")).toEqual({ gte: 90, lte: 120 });
      expect(parseRuntimeRange("90-120 min")).toEqual({ gte: 90, lte: 120 });
      expect(parseRuntimeRange("120–150 min")).toEqual({ gte: 120, lte: 150 });
      expect(parseRuntimeRange("120-150 min")).toEqual({ gte: 120, lte: 150 });
      expect(parseRuntimeRange("Over 150 min")).toEqual({ gt: 150 });
    });

    it("evaluates runtime boundary conditions and null values", () => {
      expect(matchesRuntime(null, "All Runtimes")).toBe(true);
      expect(matchesRuntime(null, "Under 90 min")).toBe(false);
      expect(matchesRuntime(89, "Under 90 min")).toBe(true);
      expect(matchesRuntime(90, "Under 90 min")).toBe(false);
      expect(matchesRuntime(90, "90–120 min")).toBe(true);
      expect(matchesRuntime(120, "90–120 min")).toBe(true);
      expect(matchesRuntime(150, "Over 150 min")).toBe(false);
      expect(matchesRuntime(151, "Over 150 min")).toBe(true);
    });
  });

  describe("parseSeasonsRange & matchesSeasons", () => {
    it("parses all supported seasons labels", () => {
      expect(parseSeasonsRange(undefined)).toBeNull();
      expect(parseSeasonsRange("All Seasons")).toBeNull();
      expect(parseSeasonsRange("1 Season")).toEqual({ eq: 1 });
      expect(parseSeasonsRange("1 Season (Miniseries)")).toEqual({ eq: 1 });
      expect(parseSeasonsRange("2–3 Seasons")).toEqual({ gte: 2, lte: 3 });
      expect(parseSeasonsRange("2-3 Seasons")).toEqual({ gte: 2, lte: 3 });
      expect(parseSeasonsRange("4–6 Seasons")).toEqual({ gte: 4, lte: 6 });
      expect(parseSeasonsRange("4-6 Seasons")).toEqual({ gte: 4, lte: 6 });
      expect(parseSeasonsRange("7+ Seasons")).toEqual({ gte: 7 });
    });

    it("evaluates seasons boundary conditions", () => {
      expect(matchesSeasons(null, "1 Season")).toBe(false);
      expect(matchesSeasons(1, "1 Season")).toBe(true);
      expect(matchesSeasons(2, "1 Season")).toBe(false);
      expect(matchesSeasons(3, "2–3 Seasons")).toBe(true);
      expect(matchesSeasons(6, "4–6 Seasons")).toBe(true);
      expect(matchesSeasons(7, "7+ Seasons")).toBe(true);
    });
  });

  describe("parseMediaFilterParams", () => {
    it("parses valid URL query params and normalizes genres & whitespace", () => {
      const parsed = parseMediaFilterParams(
        {
          search: "  Dune  ",
          mediaType: "movie",
          genreId: "28",
          genres: "Action, Science Fiction , , Drama",
          runtime: "120–150 min",
          country: "United States",
          budget: "Blockbuster (> $120M)",
          ageRating: "PG-13",
          minRating: "7.5",
          maxRating: "9.5",
          minYear: "2000",
          maxYear: "2024",
          page: "3",
        },
        "all",
      );

      expect(parsed).toEqual({
        search: "Dune",
        mediaType: "movie",
        genreId: 28,
        genres: ["Action", "Science Fiction", "Drama"],
        runtime: "120–150 min",
        seasons: undefined,
        country: "United States",
        budget: "Blockbuster (> $120M)",
        ageRating: "PG-13",
        minRating: 7.5,
        maxRating: 9.5,
        minYear: 2000,
        maxYear: 2024,
        page: 3,
      });
    });

    it("falls back safely on invalid numbers, invalid mediaType, and page < 1", () => {
      const parsed = parseMediaFilterParams(
        {
          search: "   ",
          mediaType: "invalid" as "all",
          genreId: "abc",
          minRating: "NaN",
          minYear: "nope",
          page: "0",
        },
        "tv",
      );

      expect(parsed.search).toBeUndefined();
      expect(parsed.mediaType).toBe("tv");
      expect(parsed.genreId).toBeUndefined();
      expect(parsed.minRating).toBeUndefined();
      expect(parsed.minYear).toBeUndefined();
      expect(parsed.page).toBe(1);
    });
  });

  describe("matchesMediaFilters", () => {
    it("returns false for null/undefined media", () => {
      expect(matchesMediaFilters(null, {})).toBe(false);
      expect(matchesMediaFilters(undefined, {})).toBe(false);
    });

    it("filters by media type, case-insensitive title search, genres, and genreId", () => {
      const item = makeMedia();
      expect(matchesMediaFilters(item, { mediaType: "movie" })).toBe(true);
      expect(matchesMediaFilters(item, { mediaType: "tv" })).toBe(false);
      expect(matchesMediaFilters(item, { search: "  cept " })).toBe(true);
      expect(matchesMediaFilters(item, { search: "Matrix" })).toBe(false);
      expect(matchesMediaFilters(item, { genres: ["science fiction"] })).toBe(
        true,
      );
      expect(matchesMediaFilters(item, { genres: ["Horror"] })).toBe(false);
      expect(matchesMediaFilters(item, { genreId: 28 })).toBe(true);
      expect(matchesMediaFilters(item, { genreId: 999 })).toBe(false);
    });

    it("filters by runtime, seasons, rating range, and year range", () => {
      const movie = makeMedia({
        runtime: 148,
        vote_average: 8.4,
        release_year: 2010,
      });
      const show = makeMedia({
        media_type: "tv",
        runtime: null,
        seasons_count: 5,
      });

      expect(matchesMediaFilters(movie, { runtime: "120–150 min" })).toBe(true);
      expect(matchesMediaFilters(movie, { runtime: "Under 90 min" })).toBe(
        false,
      );
      expect(matchesMediaFilters(show, { seasons: "4–6 Seasons" })).toBe(true);
      expect(matchesMediaFilters(show, { seasons: "1 Season" })).toBe(false);

      expect(
        matchesMediaFilters(movie, { minRating: 8, maxRating: 9 }),
      ).toBe(true);
      expect(matchesMediaFilters(movie, { minRating: 9 })).toBe(false);
      expect(matchesMediaFilters(movie, { maxRating: 8 })).toBe(false);

      expect(matchesMediaFilters(movie, { minYear: 2005, maxYear: 2015 })).toBe(
        true,
      );
      expect(matchesMediaFilters(movie, { minYear: 2015 })).toBe(false);
      expect(matchesMediaFilters(movie, { maxYear: 2005 })).toBe(false);
    });

    it("matches country via direct column or metadata.country fallback, plus budget & ageRating", () => {
      const metaCountryItem = makeMedia({
        country: null,
        metadata: { country: "Japan" },
      });

      expect(matchesMediaFilters(metaCountryItem, { country: "Japan" })).toBe(
        true,
      );
      expect(
        matchesMediaFilters(metaCountryItem, { country: "All Countries" }),
      ).toBe(true);
      expect(matchesMediaFilters(metaCountryItem, { country: "France" })).toBe(
        false,
      );

      const movie = makeMedia();
      expect(
        matchesMediaFilters(movie, {
          budget: "Blockbuster (> $120M)",
          ageRating: "PG-13",
        }),
      ).toBe(true);
      expect(matchesMediaFilters(movie, { budget: "Low (< $15M)" })).toBe(false);
      expect(matchesMediaFilters(movie, { ageRating: "R" })).toBe(false);
      expect(matchesMediaFilters(movie, { ageRating: "All Ratings" })).toBe(
        true,
      );
    });
  });

  describe("compareMediaItems", () => {
    const a = makeMedia({
      id: "a",
      title: "Arrival",
      vote_average: 8.0,
      vote_count: 2000,
      release_year: 2016,
    });
    const b = makeMedia({
      id: "b",
      title: "Dune",
      vote_average: 8.0,
      vote_count: 5000,
      release_year: 2021,
    });
    const c = makeMedia({
      id: "c",
      title: "Batman",
      vote_average: 9.0,
      vote_count: 1000,
      release_year: 2008,
    });

    it("sorts by rating desc/asc with vote_count tie-breakers", () => {
      const desc = [a, b, c].sort((x, y) =>
        compareMediaItems(x, y, "vote_average_desc"),
      );
      expect(desc.map((i) => i.id)).toEqual(["c", "b", "a"]);

      const asc = [a, b, c].sort((x, y) =>
        compareMediaItems(x, y, "vote_average_asc"),
      );
      expect(asc.map((i) => i.id)).toEqual(["a", "b", "c"]);
    });

    it("sorts by release year desc/asc and title asc/desc", () => {
      const yearDesc = [a, b, c].sort((x, y) =>
        compareMediaItems(x, y, "release_year_desc"),
      );
      expect(yearDesc.map((i) => i.id)).toEqual(["b", "a", "c"]);

      const yearAsc = [a, b, c].sort((x, y) =>
        compareMediaItems(x, y, "release_year_asc"),
      );
      expect(yearAsc.map((i) => i.id)).toEqual(["c", "a", "b"]);

      const titleAsc = [a, b, c].sort((x, y) =>
        compareMediaItems(x, y, "title_asc"),
      );
      expect(titleAsc.map((i) => i.id)).toEqual(["a", "c", "b"]);

      const titleDesc = [a, b, c].sort((x, y) =>
        compareMediaItems(x, y, "title_desc"),
      );
      expect(titleDesc.map((i) => i.id)).toEqual(["b", "c", "a"]);
    });

    it("defaults to popularity (vote_count desc)", () => {
      const pop = [a, b, c].sort((x, y) => compareMediaItems(x, y));
      expect(pop.map((i) => i.id)).toEqual(["b", "a", "c"]);
    });
  });

  describe("applyCatalogQueryFilters & applyCatalogQuerySorting", () => {
    interface SpyFilterBuilder
      extends CatalogFilterQueryBuilder<SpyFilterBuilder> {
      calls: Array<{ method: string; args: unknown[] }>;
    }

    function createSpyFilterBuilder() {
      const calls: Array<{ method: string; args: unknown[] }> = [];
      const builder: SpyFilterBuilder = {
        calls,
        eq(column, value) {
          calls.push({ method: "eq", args: [column, value] });
          return builder;
        },
        in(column, values) {
          calls.push({ method: "in", args: [column, values] });
          return builder;
        },
        ilike(column, pattern) {
          calls.push({ method: "ilike", args: [column, pattern] });
          return builder;
        },
        lt(column, value) {
          calls.push({ method: "lt", args: [column, value] });
          return builder;
        },
        lte(column, value) {
          calls.push({ method: "lte", args: [column, value] });
          return builder;
        },
        gt(column, value) {
          calls.push({ method: "gt", args: [column, value] });
          return builder;
        },
        gte(column, value) {
          calls.push({ method: "gte", args: [column, value] });
          return builder;
        },
        contains(column, value) {
          calls.push({ method: "contains", args: [column, value] });
          return builder;
        },
      };
      return { builder, calls };
    }

    it("applies all active catalog filters to the query builder", () => {
      const { builder, calls } = createSpyFilterBuilder();
      applyCatalogQueryFilters(builder, {
        mediaType: "movie",
        genres: ["Action", "Drama"],
        search: "  Batman ",
        runtime: "90–120 min",
        minRating: 7,
        maxRating: 9,
        minYear: 2000,
        maxYear: 2024,
        country: "United States",
        budget: "High ($60M–$120M)",
        ageRating: "PG-13",
      });

      expect(calls).toEqual([
        { method: "eq", args: ["media_type", "movie"] },
        { method: "in", args: ["media_genres.genres.name", ["Action", "Drama"]] },
        { method: "ilike", args: ["title", "%Batman%"] },
        { method: "lte", args: ["runtime", 120] },
        { method: "gte", args: ["runtime", 90] },
        { method: "gte", args: ["vote_average", 7] },
        { method: "lte", args: ["vote_average", 9] },
        { method: "gte", args: ["release_year", 2000] },
        { method: "lte", args: ["release_year", 2024] },
        { method: "contains", args: ["countries", ["United States"]] },
        { method: "eq", args: ["budget_category", "High ($60M–$120M)"] },
        { method: "eq", args: ["age_rating", "PG-13"] },
      ]);
    });

    it("prefers genreId over genres and skips default/noop filter values", () => {
      const { builder, calls } = createSpyFilterBuilder();
      applyCatalogQueryFilters(builder, {
        mediaType: "all",
        genreId: 28,
        genres: ["Drama"],
        runtime: "All Runtimes",
        seasons: "All Seasons",
        minRating: 0,
        maxRating: 10,
        minYear: 1900,
        maxYear: 2026,
        country: "All Countries",
        budget: "All Budgets",
        ageRating: "All Age Ratings",
      });

      expect(calls).toEqual([{ method: "eq", args: ["media_genres.genre_id", 28] }]);
    });

    it("applies the expected order clauses for sorting options", () => {
      interface SpySortBuilder
        extends CatalogSortQueryBuilder<SpySortBuilder> {
        orders: Array<{ column: string; options?: { ascending?: boolean } }>;
      }

      const createSortSpy = () => {
        const orders: Array<{ column: string; options?: { ascending?: boolean } }> =
          [];
        const builder: SpySortBuilder = {
          orders,
          order(column, options) {
            orders.push({ column, options });
            return builder;
          },
        };
        return { builder, orders };
      };

      const pop = createSortSpy();
      applyCatalogQuerySorting(pop.builder);
      expect(pop.orders).toEqual([
        { column: "vote_count", options: { ascending: false } },
        { column: "vote_average", options: { ascending: false } },
      ]);

      const titleAsc = createSortSpy();
      applyCatalogQuerySorting(titleAsc.builder, "title_asc");
      expect(titleAsc.orders).toEqual([
        { column: "title", options: { ascending: true } },
      ]);

      const ratingAsc = createSortSpy();
      applyCatalogQuerySorting(ratingAsc.builder, "vote_average_asc");
      expect(ratingAsc.orders).toEqual([
        { column: "vote_average", options: { ascending: true } },
        { column: "vote_count", options: { ascending: false } },
      ]);
    });
  });
});
