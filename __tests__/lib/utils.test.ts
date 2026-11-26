import {
  cn,
  extractYouTubeVideoId,
  formatAddedAtDate,
  formatCurrency,
  formatDate,
  formatMediaDuration,
  formatRuntime,
  formatVoteCount,
  getBudgetCategory,
  getPosterUrl,
  getYouTubeEmbedUrl,
  isMatureRating,
} from "@/lib/utils";

describe("lib/utils", () => {
  describe("getPosterUrl", () => {
    it("returns placeholder when posterPath is missing", () => {
      expect(getPosterUrl(null)).toBe("/placeholder-poster.png");
      expect(getPosterUrl(undefined)).toBe("/placeholder-poster.png");
      expect(getPosterUrl("")).toBe("/placeholder-poster.png");
    });

    it("passes through full http/https URLs unchanged", () => {
      const url = "https://cdn.example.com/posters/movie.jpg";
      expect(getPosterUrl(url)).toBe(url);
      expect(getPosterUrl("http://cdn.example.com/p.png")).toBe(
        "http://cdn.example.com/p.png",
      );
    });

    it("builds a TMDB image URL with default and custom sizes", () => {
      expect(getPosterUrl("/abc.jpg")).toBe(
        "https://image.tmdb.org/t/p/w500/abc.jpg",
      );
      expect(getPosterUrl("/abc.jpg", "w780")).toBe(
        "https://image.tmdb.org/t/p/w780/abc.jpg",
      );
      expect(getPosterUrl("/abc.jpg", "original")).toBe(
        "https://image.tmdb.org/t/p/original/abc.jpg",
      );
    });
  });

  describe("formatRuntime & formatMediaDuration", () => {
    it("formats movie runtimes and handles empty/non-positive values", () => {
      expect(formatRuntime(null)).toBeNull();
      expect(formatRuntime(undefined)).toBeNull();
      expect(formatRuntime(0)).toBeNull();
      expect(formatRuntime(-15)).toBeNull();
      expect(formatRuntime(45)).toBe("45 min");
      expect(formatRuntime(60)).toBe("1 h 00 min");
      expect(formatRuntime(125)).toBe("2 h 05 min");
      expect(formatRuntime(154)).toBe("2 h 34 min");
    });

    it("formats TV series seasons and delegates movies to formatRuntime", () => {
      expect(formatMediaDuration({ media_type: "tv", seasons_count: 1 })).toBe(
        "1 Season",
      );
      expect(formatMediaDuration({ media_type: "tv", seasons_count: null })).toBe(
        "1 Season",
      );
      expect(formatMediaDuration({ media_type: "tv", seasons_count: 5 })).toBe(
        "5 Seasons",
      );
      expect(formatMediaDuration({ media_type: "movie", runtime: 112 })).toBe(
        "1 h 52 min",
      );
      expect(formatMediaDuration({ media_type: "movie", runtime: null })).toBeNull();
    });
  });

  describe("getBudgetCategory", () => {
    it("returns null for missing or non-positive budgets", () => {
      expect(getBudgetCategory(null)).toBeNull();
      expect(getBudgetCategory(undefined)).toBeNull();
      expect(getBudgetCategory(0)).toBeNull();
      expect(getBudgetCategory(-500)).toBeNull();
    });

    it("categorizes budget bands accurately at exact boundaries", () => {
      expect(getBudgetCategory(14_999_999)).toBe("Low (< $15M)");
      expect(getBudgetCategory(15_000_000)).toBe("Medium ($15M–$60M)");
      expect(getBudgetCategory(60_000_000)).toBe("Medium ($15M–$60M)");
      expect(getBudgetCategory(60_000_001)).toBe("High ($60M–$120M)");
      expect(getBudgetCategory(120_000_000)).toBe("High ($60M–$120M)");
      expect(getBudgetCategory(120_000_001)).toBe("Blockbuster (> $120M)");
    });
  });

  describe("cn", () => {
    it("joins truthy class names and ignores falsy values", () => {
      expect(cn("btn", false, undefined, null, "btn-primary", "")).toBe(
        "btn btn-primary",
      );
    });
  });

  describe("formatCurrency", () => {
    it("formats positive amounts with space separators", () => {
      expect(formatCurrency(null)).toBeNull();
      expect(formatCurrency(0)).toBeNull();
      expect(formatCurrency(-100)).toBeNull();
      expect(formatCurrency(8_000_000)).toBe("$8 000 000");
      expect(formatCurrency(500)).toBe("$500");
    });
  });

  describe("formatDate & formatAddedAtDate", () => {
    it("formats readable ISO dates and returns raw string for invalid dates", () => {
      expect(formatDate(null)).toBeNull();
      expect(formatDate("")).toBeNull();
      expect(formatDate("1994-09-10T12:00:00Z")).toBe("Sep 10, 1994");
      expect(formatDate("not-a-date")).toBe("not-a-date");
    });

    it("formats dot-notated dates and returns null for invalid dates", () => {
      expect(formatAddedAtDate(null)).toBeNull();
      expect(formatAddedAtDate("invalid-date")).toBeNull();
      expect(formatAddedAtDate("2025-12-25T12:00:00Z")).toBe("12.25.2025");
      expect(formatAddedAtDate("2025-01-05T12:00:00Z")).toBe("01.05.2025");
    });
  });

  describe("isMatureRating", () => {
    it("identifies mature ratings case-insensitively and ignores whitespace", () => {
      expect(isMatureRating("R")).toBe(true);
      expect(isMatureRating("  tv-ma ")).toBe(true);
      expect(isMatureRating("NC-17")).toBe(true);
      expect(isMatureRating("18+")).toBe(true);
      expect(isMatureRating("18")).toBe(true);
      expect(isMatureRating("Adult")).toBe(true);
      expect(isMatureRating("x")).toBe(true);
    });

    it("returns false for non-mature or missing ratings", () => {
      expect(isMatureRating("PG-13")).toBe(false);
      expect(isMatureRating("PG")).toBe(false);
      expect(isMatureRating("TV-14")).toBe(false);
      expect(isMatureRating(null)).toBe(false);
      expect(isMatureRating("")).toBe(false);
    });
  });

  describe("formatVoteCount", () => {
    it("formats counts across raw, thousands, and millions", () => {
      expect(formatVoteCount(null)).toBe("0");
      expect(formatVoteCount(0)).toBe("0");
      expect(formatVoteCount(-5)).toBe("0");
      expect(formatVoteCount(950)).toBe("950");
      expect(formatVoteCount(1_000)).toBe("1.0k");
      expect(formatVoteCount(27_500)).toBe("27.5k");
      expect(formatVoteCount(1_250_000)).toBe("1.3M");
    });
  });

  describe("extractYouTubeVideoId & getYouTubeEmbedUrl", () => {
    const validId = "dQw4w9WgXcQ";

    it("extracts valid 11-character IDs from raw keys and all supported YouTube URL formats", () => {
      expect(extractYouTubeVideoId(validId)).toBe(validId);
      expect(extractYouTubeVideoId(`  ${validId}  `)).toBe(validId);
      expect(
        extractYouTubeVideoId(`https://www.youtube.com/watch?v=${validId}&t=42s`),
      ).toBe(validId);
      expect(
        extractYouTubeVideoId(`https://m.youtube.com/watch?v=${validId}`),
      ).toBe(validId);
      expect(extractYouTubeVideoId(`https://youtu.be/${validId}?si=123`)).toBe(
        validId,
      );
      expect(
        extractYouTubeVideoId(
          `https://www.youtube-nocookie.com/embed/${validId}`,
        ),
      ).toBe(validId);
      expect(
        extractYouTubeVideoId(`https://youtube.com/shorts/${validId}`),
      ).toBe(validId);
      expect(extractYouTubeVideoId(`https://youtube.com/live/${validId}`)).toBe(
        validId,
      );
      expect(extractYouTubeVideoId(`https://youtube.com/v/${validId}`)).toBe(
        validId,
      );
    });

    it("returns null for invalid hosts, malformed IDs, or empty values", () => {
      expect(extractYouTubeVideoId(null)).toBeNull();
      expect(extractYouTubeVideoId("   ")).toBeNull();
      expect(extractYouTubeVideoId("short")).toBeNull();
      expect(extractYouTubeVideoId("https://vimeo.com/12345678901")).toBeNull();
      expect(
        extractYouTubeVideoId("https://youtube.com/watch?v=too-short"),
      ).toBeNull();
      expect(
        extractYouTubeVideoId("https://youtube.com/channel/UC1234567890"),
      ).toBeNull();
    });

    it("builds a privacy-enhanced embed URL", () => {
      expect(getYouTubeEmbedUrl(validId)).toBe(
        `https://www.youtube-nocookie.com/embed/${validId}?autoplay=1&rel=0`,
      );
    });
  });
});
