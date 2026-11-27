/** @jest-environment jsdom */
import { renderHook, act } from "@testing-library/react";
import { useCatalogFilters } from "@/hooks/useCatalogFilters";
import { FILTER_OPTIONS } from "@/components/filters";

const mockPush = jest.fn();
let mockPathname = "/catalog";
let mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
}));

describe("useCatalogFilters", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockPathname = "/catalog";
    mockSearchParams = new URLSearchParams();
    sessionStorage.clear();
    jest.useRealTimers();
  });

  it("derives movie defaults on /catalog and syncs sessionStorage", () => {
    const { result } = renderHook(() => useCatalogFilters());

    expect(result.current.isMovie).toBe(true);
    expect(result.current.isTV).toBe(false);
    expect(result.current.selectedGenres).toEqual([]);
    expect(result.current.minYear).toBe(1900);
    expect(result.current.maxYear).toBe(2026);
    expect(result.current.minRating).toBe(0);
    expect(result.current.maxRating).toBe(10);
    expect(result.current.hasActiveFilters).toBe(false);
    expect(result.current.ageRatingOptions).toEqual(
      FILTER_OPTIONS.ageRatingMovie,
    );
    expect(sessionStorage.getItem("last_catalog_url")).toBe("/catalog");
    expect(sessionStorage.getItem("last_movie_catalog_url")).toBe("/catalog");
  });

  it("parses active filters from searchParams and updates TV catalog storage", () => {
    mockSearchParams = new URLSearchParams(
      "mediaType=tv&genres=Drama,Sci-Fi&seasons=2-3%20Seasons&minYear=2015&maxYear=2024&minRating=7.5&maxRating=9.5&page=3",
    );

    const { result } = renderHook(() =>
      useCatalogFilters({ genres: ["Drama", "Sci-Fi", "Comedy"] }),
    );

    expect(result.current.isTV).toBe(true);
    expect(result.current.selectedGenres).toEqual(["Drama", "Sci-Fi"]);
    expect(result.current.seasons).toBe("2-3 Seasons");
    expect(result.current.minYear).toBe(2015);
    expect(result.current.maxYear).toBe(2024);
    expect(result.current.minRating).toBe(7.5);
    expect(result.current.maxRating).toBe(9.5);
    expect(result.current.hasActiveFilters).toBe(true);
    expect(result.current.genreOptions).toEqual(["Drama", "Sci-Fi", "Comedy"]);
    expect(result.current.ageRatingOptions).toEqual(FILTER_OPTIONS.ageRatingTV);
    expect(sessionStorage.getItem("last_tv_catalog_url")).toContain(
      "mediaType=tv",
    );
  });

  it("updates URL query params and strips page/genreId when filters change", () => {
    mockSearchParams = new URLSearchParams("genreId=28&page=4");

    const { result } = renderHook(() => useCatalogFilters());

    act(() => {
      result.current.handleGenresChange(["Action", "Thriller"]);
    });

    expect(mockPush).toHaveBeenCalledWith("/catalog?genres=Action%2CThriller");

    mockPush.mockClear();
    act(() => {
      result.current.handleRuntimeChange(FILTER_OPTIONS.runtime[1]);
    });
    expect(mockPush).toHaveBeenCalledTimes(1);
    const pushedRuntime = mockPush.mock.calls[0][0] as string;
    expect(pushedRuntime).toContain("runtime=");
    expect(pushedRuntime).not.toContain("page=");
  });

  it("clears incompatible filters when switching media types", () => {
    mockSearchParams = new URLSearchParams(
      "mediaType=movie&runtime=Short&budget=Indie&seasons=1&page=2",
    );

    const { result } = renderHook(() => useCatalogFilters());

    act(() => {
      result.current.handleMediaTypeChange("tv");
    });

    const targetUrl = mockPush.mock.calls[0][0] as string;
    expect(targetUrl).toContain("mediaType=tv");
    expect(targetUrl).not.toContain("runtime=");
    expect(targetUrl).not.toContain("budget=");
    expect(targetUrl).not.toContain("page=");

    mockPush.mockClear();
    act(() => {
      result.current.handleMediaTypeChange("movie");
    });
    const movieUrl = mockPush.mock.calls[0][0] as string;
    expect(movieUrl).toContain("mediaType=movie");
    expect(movieUrl).not.toContain("seasons=");
  });

  it("omits mediaType=all on /watchlist when switching back to all", () => {
    mockPathname = "/watchlist";
    mockSearchParams = new URLSearchParams("mediaType=tv&page=2");

    const { result } = renderHook(() => useCatalogFilters());

    act(() => {
      result.current.handleMediaTypeChange("all");
    });

    expect(mockPush).toHaveBeenCalledWith("/watchlist");
  });

  it("debounces rating range slider changes before pushing to the router", () => {
    jest.useFakeTimers();

    const { result } = renderHook(() => useCatalogFilters());

    act(() => {
      result.current.setMinRating(6.5);
      result.current.setMaxRating(9.0);
    });

    expect(mockPush).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(mockPush).toHaveBeenCalledWith(
      "/catalog?minRating=6.5&maxRating=9.0",
    );
  });

  it("toggles and closes dropdown state", () => {
    const { result } = renderHook(() => useCatalogFilters());

    act(() => result.current.toggleDropdown("genre"));
    expect(result.current.openDropdown).toBe("genre");

    act(() => result.current.toggleDropdown("genre"));
    expect(result.current.openDropdown).toBeNull();

    act(() => result.current.toggleDropdown("country"));
    expect(result.current.openDropdown).toBe("country");

    act(() => result.current.closeDropdown());
    expect(result.current.openDropdown).toBeNull();
  });
});
