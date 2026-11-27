/** @jest-environment jsdom */
import type { ReactNode } from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import {
  CollectionsProvider,
  useCollections,
} from "@/components/CollectionsProvider";
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
  return <CollectionsProvider>{children}</CollectionsProvider>;
}

const initialCollectionRow = {
  id: "col-1",
  user_id: "user-1",
  name: "Sci-Fi Classics",
  description: "Top picks",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  collection_items: [{ media_id: "m1" }],
};

describe("CollectionsProvider", () => {
  let orderMock: jest.Mock;
  let insertSingleMock: jest.Mock;
  let updateSingleMock: jest.Mock;
  let deleteColEqUserMock: jest.Mock;
  let deleteItemEqMediaMock: jest.Mock;
  let upsertItemMock: jest.Mock;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    orderMock = jest.fn().mockResolvedValue({
      data: [initialCollectionRow],
      error: null,
    });
    insertSingleMock = jest.fn().mockResolvedValue({
      data: {
        id: "col-2",
        user_id: "user-1",
        name: "Noir",
        description: null,
        created_at: "2026-01-02T00:00:00Z",
        updated_at: "2026-01-02T00:00:00Z",
      },
      error: null,
    });
    updateSingleMock = jest.fn().mockResolvedValue({
      data: {
        ...initialCollectionRow,
        name: "Updated Sci-Fi",
      },
      error: null,
    });
    deleteColEqUserMock = jest.fn().mockResolvedValue({ error: null });
    deleteItemEqMediaMock = jest.fn().mockResolvedValue({ error: null });
    upsertItemMock = jest.fn().mockResolvedValue({ error: null });

    mockedCreateClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === "collections") {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({ order: orderMock })),
            })),
            insert: jest.fn(() => ({
              select: jest.fn(() => ({ single: insertSingleMock })),
            })),
            update: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  select: jest.fn(() => ({ single: updateSingleMock })),
                })),
              })),
            })),
            delete: jest.fn(() => ({
              eq: jest.fn(() => ({ eq: deleteColEqUserMock })),
            })),
          };
        }
        return {
          delete: jest.fn(() => ({
            eq: jest.fn(() => ({ eq: deleteItemEqMediaMock })),
          })),
          upsert: upsertItemMock,
        };
      }),
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("throws when useCollections is used outside CollectionsProvider", () => {
    expect(() => renderHook(() => useCollections())).toThrow(
      "useCollections must be used within a CollectionsProvider",
    );
  });

  it("loads user collections and computes media membership helpers", async () => {
    mockedUseAuth.mockReturnValue({ user: { id: "user-1" } });

    const { result } = renderHook(() => useCollections(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.collections).toHaveLength(1);
    expect(result.current.collections[0].itemCount).toBe(1);
    expect(result.current.isInCollection("col-1", "m1")).toBe(true);
    expect(result.current.isInCollection("col-1", "m2")).toBe(false);
    expect(result.current.getCollectionsForMedia("m1")).toHaveLength(1);
  });

  it("validates createCollection inputs and handles duplicate 23505 errors", async () => {
    mockedUseAuth.mockReturnValue({ user: { id: "user-1" } });

    const { result } = renderHook(() => useCollections(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      expect(await result.current.createCollection("   ")).toEqual({
        success: false,
        error: "List name is required.",
      });
      expect(await result.current.createCollection("a".repeat(81))).toEqual({
        success: false,
        error: "List name must be 80 characters or fewer.",
      });
      expect(
        await result.current.createCollection("Valid", "d".repeat(301)),
      ).toEqual({
        success: false,
        error: "Description must be 300 characters or fewer.",
      });
    });

    insertSingleMock.mockResolvedValueOnce({
      data: null,
      error: { code: "23505", message: "duplicate key" },
    });
    await act(async () => {
      expect(await result.current.createCollection("Sci-Fi Classics")).toEqual({
        success: false,
        error: "You already have a list with that name.",
      });
    });

    await act(async () => {
      const created = await result.current.createCollection("Noir");
      expect(created.success).toBe(true);
      expect(created.collection?.id).toBe("col-2");
    });
    expect(result.current.collections).toHaveLength(2);
  });

  it("redirects unauthenticated users on createCollection and toggleMediaInCollection", async () => {
    mockedUseAuth.mockReturnValue({ user: null });

    const { result } = renderHook(() => useCollections(), { wrapper });

    await act(async () => {
      const created = await result.current.createCollection("My List");
      expect(created.success).toBe(false);
      expect(await result.current.toggleMediaInCollection("col-1", "m1")).toBe(
        false,
      );
    });

    expect(mockedRedirectToLogin).toHaveBeenCalledTimes(2);
  });

  it("toggles items in a collection, updates, and rolls back failed deletes", async () => {
    mockedUseAuth.mockReturnValue({ user: { id: "user-1" } });

    const { result } = renderHook(() => useCollections(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Toggle adds new media
    await act(async () => {
      expect(await result.current.toggleMediaInCollection("col-1", "m2")).toBe(
        true,
      );
    });
    expect(result.current.isInCollection("col-1", "m2")).toBe(true);

    // Toggle removes existing media
    await act(async () => {
      expect(await result.current.toggleMediaInCollection("col-1", "m2")).toBe(
        true,
      );
    });
    expect(result.current.isInCollection("col-1", "m2")).toBe(false);

    // Update collection name
    await act(async () => {
      const updated = await result.current.updateCollection("col-1", {
        name: "Updated Sci-Fi",
      });
      expect(updated.success).toBe(true);
    });
    expect(result.current.collections[0].name).toBe("Updated Sci-Fi");

    // Delete failure rolls back
    deleteColEqUserMock.mockResolvedValueOnce({
      error: new Error("Delete failed"),
    });
    await act(async () => {
      const res = await result.current.deleteCollection("col-1");
      expect(res.success).toBe(false);
    });
    expect(result.current.collections).toHaveLength(1);
  });
});
