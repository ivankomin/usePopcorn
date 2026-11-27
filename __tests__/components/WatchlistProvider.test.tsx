/** @jest-environment jsdom */
import type { ReactNode } from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import {
  WatchlistProvider,
  useWatchlist,
} from "@/components/WatchlistProvider";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { redirectToLogin } from "@/lib/navigation";

const mockRouter = { push: jest.fn(), refresh: jest.fn() };

jest.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/lib/navigation", () => ({
  redirectToLogin: jest.fn(),
}));

const mockedUseAuth = useAuth as jest.Mock;
const mockedCreateClient = createClient as jest.Mock;
const mockedRedirectToLogin = redirectToLogin as jest.Mock;

function wrapper({ children }: { children: ReactNode }) {
  return <WatchlistProvider>{children}</WatchlistProvider>;
}

describe("WatchlistProvider", () => {
  let selectEqMock: jest.Mock;
  let upsertMock: jest.Mock;
  let updateEqMediaMock: jest.Mock;
  let deleteEqMediaMock: jest.Mock;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    selectEqMock = jest.fn().mockResolvedValue({
      data: [{ media_id: "m1", status: "plan_to_watch" }],
      error: null,
    });
    upsertMock = jest.fn().mockResolvedValue({ error: null });
    updateEqMediaMock = jest.fn().mockResolvedValue({ error: null });
    deleteEqMediaMock = jest.fn().mockResolvedValue({ error: null });

    mockedCreateClient.mockReturnValue({
      from: jest.fn(() => ({
        select: jest.fn(() => ({ eq: selectEqMock })),
        upsert: upsertMock,
        update: jest.fn(() => ({
          eq: jest.fn(() => ({ eq: updateEqMediaMock })),
        })),
        delete: jest.fn(() => ({
          eq: jest.fn(() => ({ eq: deleteEqMediaMock })),
        })),
      })),
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("throws when useWatchlist is called outside WatchlistProvider", () => {
    expect(() => renderHook(() => useWatchlist())).toThrow(
      "useWatchlist must be used within a WatchlistProvider",
    );
  });

  it("loads initial watchlist items for authenticated user", async () => {
    mockedUseAuth.mockReturnValue({ user: { id: "user-1" } });

    const { result } = renderHook(() => useWatchlist(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isInWatchlist("m1")).toBe(true);
    expect(result.current.getWatchlistStatus("m1")).toBe("plan_to_watch");
    expect(result.current.isInWatchlist("m2")).toBe(false);
  });

  it("redirects unauthenticated users on addToWatchlist and toggleWatchlist", async () => {
    mockedUseAuth.mockReturnValue({ user: null });

    const { result } = renderHook(() => useWatchlist(), { wrapper });

    await act(async () => {
      expect(await result.current.addToWatchlist("m2")).toBe(false);
      expect(await result.current.toggleWatchlist("m2")).toBe(false);
      expect(await result.current.updateWatchlistStatus("m2", "watched")).toBe(
        false,
      );
      expect(await result.current.removeFromWatchlist("m2")).toBe(false);
    });

    expect(mockedRedirectToLogin).toHaveBeenCalledTimes(2);
    expect(mockedRedirectToLogin).toHaveBeenCalledWith(mockRouter);
  });

  it("optimistically adds, updates, and removes items, rolling back on error", async () => {
    mockedUseAuth.mockReturnValue({ user: { id: "user-1" } });

    const { result } = renderHook(() => useWatchlist(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Add success
    await act(async () => {
      const ok = await result.current.addToWatchlist("m2", "favorite");
      expect(ok).toBe(true);
    });
    expect(result.current.isInWatchlist("m2")).toBe(true);
    expect(result.current.getWatchlistStatus("m2")).toBe("favorite");

    // Update rollback on error
    updateEqMediaMock.mockResolvedValueOnce({ error: new Error("DB error") });
    await act(async () => {
      const ok = await result.current.updateWatchlistStatus("m2", "watched");
      expect(ok).toBe(false);
    });
    expect(result.current.getWatchlistStatus("m2")).toBe("favorite");

    // Toggle removes existing item
    await act(async () => {
      const ok = await result.current.toggleWatchlist("m2");
      expect(ok).toBe(true);
    });
    expect(result.current.isInWatchlist("m2")).toBe(false);

    // Remove rollback on error
    deleteEqMediaMock.mockResolvedValueOnce({ error: new Error("Delete fail") });
    await act(async () => {
      const ok = await result.current.removeFromWatchlist("m1");
      expect(ok).toBe(false);
    });
    expect(result.current.isInWatchlist("m1")).toBe(true);
    expect(result.current.getWatchlistStatus("m1")).toBe("plan_to_watch");
  });
});
