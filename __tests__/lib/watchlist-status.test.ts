import {
  WATCHLIST_STATUS_MAP,
  WATCHLIST_STATUS_OPTIONS,
  getWatchlistStatusLabel,
} from "@/lib/watchlist-status";
import type { WatchlistStatus } from "@/types/media";

describe("lib/watchlist-status", () => {
  it("exposes metadata for all 3 canonical watchlist statuses", () => {
    expect(WATCHLIST_STATUS_OPTIONS.map((o) => o.value)).toEqual([
      "plan_to_watch",
      "watched",
      "favorite",
    ]);
    expect(WATCHLIST_STATUS_MAP.favorite.pluralLabel).toBe("Favorites");
  });

  it("returns singular and plural labels for valid statuses and fallback for all/unknown", () => {
    expect(getWatchlistStatusLabel("all")).toBe("All Saved Titles");
    expect(getWatchlistStatusLabel("plan_to_watch")).toBe("Plan to Watch");
    expect(getWatchlistStatusLabel("plan_to_watch", true)).toBe("Plan to Watch");
    expect(getWatchlistStatusLabel("watched")).toBe("Watched");
    expect(getWatchlistStatusLabel("favorite")).toBe("Favorite");
    expect(getWatchlistStatusLabel("favorite", true)).toBe("Favorites");
    expect(getWatchlistStatusLabel("invalid" as WatchlistStatus)).toBe(
      "All Saved Titles",
    );
  });
});
