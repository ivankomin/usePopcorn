import {
  extractGenres,
  normalizeMediaRow,
  toMediaType,
  toWatchlistStatus,
  type MediaRowWithGenres,
} from "@/lib/media-mappers";

function makeRawRow(
  overrides: Partial<MediaRowWithGenres> = {},
): MediaRowWithGenres {
  return {
    id: "m-1",
    tmdb_id: 42,
    media_type: "movie",
    title: "Interstellar",
    original_title: "Interstellar",
    overview: "Space travel.",
    release_year: 2014,
    release_date: "2014-11-07",
    runtime: 169,
    seasons_count: null,
    episodes_count: null,
    status: "Released",
    poster_path: "/interstellar.jpg",
    budget: 165_000_000,
    revenue: 701_700_000,
    budget_category: "Blockbuster (> $120M)",
    country: "United States",
    countries: ["United States"],
    age_rating: "PG-13",
    imdb_rating: 8.7,
    vote_average: 8.6,
    vote_count: 34000,
    metadata: { tagline: "Mankind was born on Earth." },
    created_at: "2026-01-01T00:00:00Z",
    media_genres: [{ genre_id: 878, genres: { id: 878, name: "Science Fiction" } }],
    ...overrides,
  };
}

describe("lib/media-mappers", () => {
  describe("extractGenres", () => {
    it("returns an empty array for null, undefined, or empty joins", () => {
      expect(extractGenres(null)).toEqual([]);
      expect(extractGenres(undefined)).toEqual([]);
      expect(extractGenres([])).toEqual([]);
    });

    it("flattens single-object and array genre joins while skipping null entries", () => {
      const genres = extractGenres([
        { genres: { id: 28, name: "Action" } },
        { genres: null },
        {
          genres: [
            { id: 18, name: "Drama" },
            { id: 53, name: "Thriller" },
          ],
        },
      ]);

      expect(genres).toEqual([
        { id: 28, name: "Action" },
        { id: 18, name: "Drama" },
        { id: 53, name: "Thriller" },
      ]);
    });
  });

  describe("toMediaType & toWatchlistStatus", () => {
    it("normalizes media types with fallback to movie", () => {
      expect(toMediaType("tv")).toBe("tv");
      expect(toMediaType("movie")).toBe("movie");
      expect(toMediaType("unknown")).toBe("movie");
    });

    it("normalizes watchlist statuses with fallback to plan_to_watch", () => {
      expect(toWatchlistStatus("watched")).toBe("watched");
      expect(toWatchlistStatus("favorite")).toBe("favorite");
      expect(toWatchlistStatus("plan_to_watch")).toBe("plan_to_watch");
      expect(toWatchlistStatus("other")).toBe("plan_to_watch");
    });
  });

  describe("normalizeMediaRow", () => {
    it("normalizes a Supabase row and strips join properties", () => {
      const row = makeRawRow({
        media_type: "tv",
        metadata: undefined,
        all_genres: [
          { genres: { id: 18, name: "Drama" } },
          { genres: { id: 878, name: "Science Fiction" } },
        ],
      });

      const normalized = normalizeMediaRow(row);
      expect(normalized.media_type).toBe("tv");
      expect(normalized.metadata).toBeNull();
      expect(normalized.genres).toEqual([{ id: 878, name: "Science Fiction" }]);
      expect("media_genres" in normalized).toBe(false);
      expect("all_genres" in normalized).toBe(false);
    });

    it("uses all_genres when preferAllGenres is true and falls back to media_genres", () => {
      const rowWithAll = makeRawRow({
        all_genres: [
          { genres: { id: 18, name: "Drama" } },
          { genres: { id: 12, name: "Adventure" } },
        ],
      });
      const result = normalizeMediaRow(rowWithAll, { preferAllGenres: true });
      expect(result.genres).toEqual([
        { id: 18, name: "Drama" },
        { id: 12, name: "Adventure" },
      ]);

      const rowWithoutAll = makeRawRow({ all_genres: null });
      const fallback = normalizeMediaRow(rowWithoutAll, {
        preferAllGenres: true,
      });
      expect(fallback.genres).toEqual([{ id: 878, name: "Science Fiction" }]);
    });
  });
});
