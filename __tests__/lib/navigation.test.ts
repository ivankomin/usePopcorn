import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { buildUrlWithParams, redirectToLogin } from "@/lib/navigation";

describe("lib/navigation", () => {
  describe("buildUrlWithParams", () => {
    it("returns the bare pathname when search params are empty", () => {
      expect(buildUrlWithParams("/catalog", new URLSearchParams())).toBe(
        "/catalog",
      );
    });

    it("appends serialized search params when present", () => {
      const params = new URLSearchParams({ mediaType: "movie", page: "2" });
      expect(buildUrlWithParams("/catalog", params)).toBe(
        "/catalog?mediaType=movie&page=2",
      );
    });
  });

  describe("redirectToLogin", () => {
    const originalWindow = globalThis.window;

    afterEach(() => {
      if (originalWindow === undefined) {
        // @ts-expect-error restoring undefined window in node test environment
        delete globalThis.window;
      } else {
        globalThis.window = originalWindow;
      }
    });

    it("falls back to root path when window is undefined", () => {
      // @ts-expect-error simulating SSR/node context without window
      delete globalThis.window;
      const push = jest.fn();
      redirectToLogin({ push } as unknown as AppRouterInstance);
      expect(push).toHaveBeenCalledWith("/login?next=%2F");
    });

    it("preserves encoded pathname and query string when window is defined", () => {
      globalThis.window = {
        location: {
          pathname: "/movie/abc-123",
          search: "?from=watchlist&tab=reviews",
        },
      } as unknown as Window & typeof globalThis;

      const push = jest.fn();
      redirectToLogin({ push } as unknown as AppRouterInstance);
      expect(push).toHaveBeenCalledWith(
        "/login?next=%2Fmovie%2Fabc-123%3Ffrom%3Dwatchlist%26tab%3Dreviews",
      );
    });
  });
});
