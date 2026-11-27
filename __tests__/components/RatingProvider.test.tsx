/** @jest-environment jsdom */
import type { ReactNode } from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { RatingProvider, useRatings } from "@/components/RatingProvider";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { redirectToLogin } from "@/lib/navigation";
import type { ReviewRow } from "@/types/media";

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
  return <RatingProvider>{children}</RatingProvider>;
}

const existingReview: ReviewRow = {
  id: "rev-1",
  user_id: "user-1",
  media_id: "m1",
  rating: 8,
  content: "Great cinematography",
  status: "approved",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("RatingProvider", () => {
  let selectEqMock: jest.Mock;
  let upsertSingleMock: jest.Mock;
  let upsertMock: jest.Mock;
  let deleteEqMediaMock: jest.Mock;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockRouter.push.mockReset();
    mockRouter.refresh.mockReset();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    selectEqMock = jest.fn().mockResolvedValue({
      data: [existingReview],
      error: null,
    });
    upsertSingleMock = jest.fn().mockResolvedValue({
      data: { ...existingReview, rating: 9 },
      error: null,
    });
    upsertMock = jest.fn(() => ({
      select: jest.fn(() => ({ single: upsertSingleMock })),
    }));
    deleteEqMediaMock = jest.fn().mockResolvedValue({ error: null });

    mockedCreateClient.mockReturnValue({
      from: jest.fn(() => ({
        select: jest.fn(() => ({ eq: selectEqMock })),
        upsert: upsertMock,
        delete: jest.fn(() => ({
          eq: jest.fn(() => ({ eq: deleteEqMediaMock })),
        })),
      })),
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("throws when useRatings is used outside RatingProvider", () => {
    expect(() => renderHook(() => useRatings())).toThrow(
      "useRatings must be used within a RatingProvider",
    );
  });

  it("loads user ratings and reviews on mount", async () => {
    mockedUseAuth.mockReturnValue({ user: { id: "user-1" } });

    const { result } = renderHook(() => useRatings(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.getUserRating("m1")).toBe(8);
    expect(result.current.getUserReview("m1")).toEqual(existingReview);
    expect(result.current.getUserRating("missing")).toBeNull();
  });

  it("redirects unauthenticated users when rating or submitting a review", async () => {
    mockedUseAuth.mockReturnValue({ user: null });

    const { result } = renderHook(() => useRatings(), { wrapper });

    await act(async () => {
      expect(await result.current.rateMedia("m1", 9)).toBe(false);
      expect(await result.current.submitReview("m1", { rating: 9 })).toBeNull();
      expect(await result.current.deleteReview("m1")).toBe(false);
    });

    expect(mockedRedirectToLogin).toHaveBeenCalledTimes(2);
  });

  it("rates media while preserving existing review content and rolls back on failure", async () => {
    mockedUseAuth.mockReturnValue({ user: { id: "user-1" } });

    const { result } = renderHook(() => useRatings(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      expect(await result.current.rateMedia("m1", 9)).toBe(true);
    });
    expect(upsertMock).toHaveBeenCalledWith(
      {
        user_id: "user-1",
        media_id: "m1",
        rating: 9,
        content: "Great cinematography",
      },
      { onConflict: "user_id,media_id" },
    );
    expect(result.current.getUserRating("m1")).toBe(9);

    upsertSingleMock.mockResolvedValueOnce({
      data: null,
      error: new Error("Upsert error"),
    });
    await act(async () => {
      expect(await result.current.rateMedia("m1", 3)).toBe(false);
    });
    expect(result.current.getUserRating("m1")).toBe(9);
  });

  it("rejects empty submitReview, saves valid review, and deletes with rollback on error", async () => {
    mockedUseAuth.mockReturnValue({ user: { id: "user-1" } });

    const { result } = renderHook(() => useRatings(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Empty rating and blank content for a new movie returns null without calling Supabase
    await act(async () => {
      const res = await result.current.submitReview("m2", {
        rating: null,
        content: "   ",
      });
      expect(res).toBeNull();
    });
    expect(upsertMock).not.toHaveBeenCalled();

    // Valid submitReview
    const savedRow: ReviewRow = {
      ...existingReview,
      id: "rev-2",
      media_id: "m2",
      rating: 10,
      content: "Masterpiece",
    };
    upsertSingleMock.mockResolvedValueOnce({ data: savedRow, error: null });

    await act(async () => {
      const saved = await result.current.submitReview("m2", {
        rating: 10,
        content: "Masterpiece",
      });
      expect(saved).toEqual(savedRow);
    });
    expect(result.current.getUserRating("m2")).toBe(10);
    expect(mockRouter.refresh).toHaveBeenCalledTimes(1);

    // Delete failure reverts state
    deleteEqMediaMock.mockResolvedValueOnce({ error: new Error("Denied") });
    await act(async () => {
      expect(await result.current.deleteReview("m2")).toBe(false);
    });
    expect(result.current.getUserRating("m2")).toBe(10);

    // Delete success clears state and refreshes
    await act(async () => {
      expect(await result.current.deleteReview("m2")).toBe(true);
    });
    expect(result.current.getUserRating("m2")).toBeNull();
    expect(result.current.getUserReview("m2")).toBeNull();
    expect(mockRouter.refresh).toHaveBeenCalledTimes(2);
  });
});
