import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildSystemLogsQuery,
  fetchManagedUsers,
  fetchModeratedReviews,
  fetchSystemLogs,
  normalizePagination,
} from "@/lib/admin-queries";
import type { LogCategory, LogLevel } from "@/types/media";

jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: jest.fn(),
}));

const mockedCreateAdminClient = createAdminClient as jest.MockedFunction<
  typeof createAdminClient
>;

function createFluentQueryMock<TResult>(result: TResult) {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const query: Record<string, jest.Mock> = {};
  const chainMethods = ["select", "eq", "ilike", "or", "order", "range"];

  for (const method of chainMethods) {
    query[method] = jest.fn((...args: unknown[]) => {
      calls.push({ method, args });
      if (method === "range") {
        return Promise.resolve(result);
      }
      return query;
    });
  }

  return { query, calls };
}

describe("lib/admin-queries", () => {
  describe("normalizePagination", () => {
    it("computes defaults and range indices accurately", () => {
      expect(normalizePagination()).toEqual({
        page: 1,
        pageSize: 15,
        from: 0,
        to: 14,
      });
      expect(normalizePagination(3, 20)).toEqual({
        page: 3,
        pageSize: 20,
        from: 40,
        to: 59,
      });
    });

    it("clamps negative, oversized, decimal, and non-finite inputs", () => {
      expect(normalizePagination(-5, 0)).toEqual({
        page: 1,
        pageSize: 1,
        from: 0,
        to: 0,
      });
      expect(normalizePagination(2.9, 500, 50)).toEqual({
        page: 2,
        pageSize: 50,
        from: 50,
        to: 99,
      });
      expect(normalizePagination(Number.NaN, Number.POSITIVE_INFINITY)).toEqual(
        {
          page: 1,
          pageSize: 15,
          from: 0,
          to: 14,
        },
      );
    });
  });

  describe("buildSystemLogsQuery", () => {
    it("applies valid level/category filters, sanitizes search syntax, and forwards withCount", () => {
      const { query, calls } = createFluentQueryMock({ data: [], error: null });
      const adminClient = {
        from: jest.fn().mockReturnValue(query),
      };

      buildSystemLogsQuery(
        adminClient as never,
        {
          level: "error",
          category: "auth",
          search: '  login_%(),."\\failed  ',
        },
        { withCount: true },
      );

      expect(adminClient.from).toHaveBeenCalledWith("system_logs");
      expect(calls[0].method).toBe("select");
      expect(calls[0].args[1]).toEqual({ count: "exact" });
      expect(calls).toContainEqual({
        method: "order",
        args: ["created_at", { ascending: false }],
      });
      expect(calls).toContainEqual({ method: "eq", args: ["level", "error"] });
      expect(calls).toContainEqual({
        method: "eq",
        args: ["category", "auth"],
      });
      expect(calls).toContainEqual({
        method: "or",
        args: ["message.ilike.%loginfailed%,action.ilike.%loginfailed%"],
      });
    });

    it("ignores 'all', unknown enum values, and punctuation-only search strings", () => {
      const { query, calls } = createFluentQueryMock({ data: [], error: null });
      const adminClient = {
        from: jest.fn().mockReturnValue(query),
      };

      buildSystemLogsQuery(adminClient as never, {
        level: "bogus" as LogLevel,
        category: "invalid" as LogCategory,
        search: "%%%,,,()",
      });

      expect(calls.map((c) => c.method)).toEqual(["select", "order"]);
    });
  });

  describe("fetchModeratedReviews", () => {
    it("aggregates status counts, applies status/search/sort, and paginates", async () => {
      const { query: listQuery, calls } = createFluentQueryMock({
        data: [{ id: "rev-1", status: "flagged", rating: 2 }],
        count: 16,
        error: null,
      });

      let reviewTableCall = 0;
      const from = jest.fn(() => {
        reviewTableCall += 1;
        if (reviewTableCall === 1) {
          return { select: jest.fn().mockResolvedValue({ count: 20 }) };
        }
        if (reviewTableCall === 2) {
          return {
            select: jest
              .fn()
              .mockReturnValue({ eq: jest.fn().mockResolvedValue({ count: 12 }) }),
          };
        }
        if (reviewTableCall === 3) {
          return {
            select: jest
              .fn()
              .mockReturnValue({ eq: jest.fn().mockResolvedValue({ count: 3 }) }),
          };
        }
        if (reviewTableCall === 4) {
          return {
            select: jest
              .fn()
              .mockReturnValue({ eq: jest.fn().mockResolvedValue({ count: 5 }) }),
          };
        }
        return listQuery;
      });

      mockedCreateAdminClient.mockReturnValue({ from } as never);

      const res = await fetchModeratedReviews({
        status: "flagged",
        search: "  spam ",
        sortBy: "rating_asc",
        page: 2,
        pageSize: 10,
      });

      expect(res).toEqual({
        reviews: [{ id: "rev-1", status: "flagged", rating: 2 }],
        total: 16,
        page: 2,
        pageSize: 10,
        totalPages: 2,
        statusCounts: { all: 20, approved: 12, pending: 3, flagged: 5 },
      });
      expect(calls).toContainEqual({ method: "eq", args: ["status", "flagged"] });
      expect(calls).toContainEqual({
        method: "ilike",
        args: ["content", "%spam%"],
      });
      expect(calls).toContainEqual({
        method: "order",
        args: ["rating", { ascending: true, nullsFirst: false }],
      });
      expect(calls).toContainEqual({ method: "range", args: [10, 19] });
    });

    it("throws when the moderated reviews query fails", async () => {
      const { query: failingQuery } = createFluentQueryMock({
        data: null,
        count: null,
        error: { message: "Query failed" },
      });

      let callNum = 0;
      mockedCreateAdminClient.mockReturnValue({
        from: jest.fn(() => {
          callNum += 1;
          if (callNum === 1) {
            return { select: jest.fn().mockResolvedValue({ count: 0 }) };
          }
          if (callNum <= 4) {
            return {
              select: jest
                .fn()
                .mockReturnValue({ eq: jest.fn().mockResolvedValue({ count: 0 }) }),
            };
          }
          return failingQuery;
        }),
      } as never);

      await expect(fetchModeratedReviews()).rejects.toThrow("Query failed");
    });
  });

  describe("fetchManagedUsers", () => {
    const profilesFixture = [
      {
        id: "u-admin",
        username: "alice_admin",
        avatar_url: null,
        role: "admin",
        is_blocked: false,
        blocked_reason: null,
        blocked_at: null,
        created_at: "2025-01-01T00:00:00Z",
      },
      {
        id: "u-blocked",
        username: "bob_banned",
        avatar_url: null,
        role: "user",
        is_blocked: false, // blocked via auth banned_until
        blocked_reason: null,
        blocked_at: null,
        created_at: "2026-01-01T00:00:00Z",
      },
      {
        id: "u-active",
        username: "charlie",
        avatar_url: null,
        role: "user",
        is_blocked: false,
        blocked_reason: null,
        blocked_at: null,
        created_at: "2026-06-01T00:00:00Z",
      },
    ];

    function setupManagedUsersMock() {
      mockedCreateAdminClient.mockReturnValue({
        from: jest.fn((table: string) => {
          if (table === "profiles") {
            return {
              select: jest
                .fn()
                .mockResolvedValue({ data: profilesFixture, error: null }),
            };
          }
          if (table === "reviews") {
            return {
              select: jest.fn().mockResolvedValue({
                data: [
                  { user_id: "u-active" },
                  { user_id: "u-active" },
                  { user_id: "u-admin" },
                  { user_id: null },
                ],
              }),
            };
          }
          if (table === "watchlists") {
            return {
              select: jest.fn().mockResolvedValue({
                data: [{ user_id: "u-active" }],
              }),
            };
          }
          throw new Error(`Unexpected table: ${table}`);
        }),
        auth: {
          admin: {
            listUsers: jest.fn().mockResolvedValue({
              data: {
                users: [
                  {
                    id: "u-admin",
                    email: "alice@example.com",
                    last_sign_in_at: "2026-11-01T00:00:00Z",
                    banned_until: null,
                  },
                  {
                    id: "u-blocked",
                    email: "bob@example.com",
                    last_sign_in_at: null,
                    banned_until: "2099-01-01T00:00:00Z",
                  },
                  {
                    id: "u-active",
                    email: "charlie@example.com",
                    last_sign_in_at: "2026-11-20T00:00:00Z",
                    banned_until: "2020-01-01T00:00:00Z", // expired ban
                  },
                ],
              },
              error: null,
            }),
          },
        },
      } as never);
    }

    it("enriches profiles with auth metadata, detects active auth bans, counts activity, and sorts", async () => {
      setupManagedUsersMock();

      const res = await fetchManagedUsers({ sortBy: "reviews_desc" });

      expect(res.counts).toEqual({
        all: 3,
        active: 2,
        blocked: 1,
        admin: 1,
      });
      expect(res.users.map((u) => u.id)).toEqual([
        "u-active",
        "u-admin",
        "u-blocked",
      ]);
      expect(res.users[0]).toMatchObject({
        email: "charlie@example.com",
        is_blocked: false,
        reviews_count: 2,
        watchlist_count: 1,
      });
      expect(res.users[2].is_blocked).toBe(true);
    });

    it("filters by status and search term and clamps out-of-range page numbers", async () => {
      setupManagedUsersMock();

      const blockedOnly = await fetchManagedUsers({
        status: "blocked",
        search: "BOB@",
        page: 99,
      });
      expect(blockedOnly.total).toBe(1);
      expect(blockedOnly.page).toBe(1);
      expect(blockedOnly.users[0].username).toBe("bob_banned");

      const adminsOldest = await fetchManagedUsers({
        status: "admin",
        sortBy: "username_asc",
      });
      expect(adminsOldest.users.map((u) => u.id)).toEqual(["u-admin"]);
    });

    it("throws when auth.admin.listUsers or profiles query fails", async () => {
      mockedCreateAdminClient.mockReturnValue({
        from: jest.fn(() => ({
          select: jest.fn().mockResolvedValue({
            data: null,
            error: { message: "Profiles unavailable" },
          }),
        })),
        auth: {
          admin: {
            listUsers: jest
              .fn()
              .mockResolvedValue({ data: { users: [] }, error: null }),
          },
        },
      } as never);

      await expect(fetchManagedUsers()).rejects.toThrow("Profiles unavailable");
    });
  });

  describe("fetchSystemLogs", () => {
    it("aggregates all 5 level counts, paginates logs, and throws on query error", async () => {
      const { query: listQuery } = createFluentQueryMock({
        data: [{ id: "l-1", level: "error", action: "db.fail" }],
        count: 1,
        error: null,
      });

      let callNum = 0;
      mockedCreateAdminClient.mockReturnValue({
        from: jest.fn(() => {
          callNum += 1;
          if (callNum === 1) {
            return { select: jest.fn().mockResolvedValue({ count: 50 }) };
          }
          if (callNum <= 5) {
            const counts = [0, 0, 30, 10, 7, 3];
            const c = counts[callNum];
            return {
              select: jest
                .fn()
                .mockReturnValue({ eq: jest.fn().mockResolvedValue({ count: c }) }),
            };
          }
          return listQuery;
        }),
      } as never);

      const res = await fetchSystemLogs({
        level: "error",
        category: "db",
        page: 1,
        pageSize: 20,
      });

      expect(res.levelCounts).toEqual({
        all: 50,
        info: 30,
        warn: 10,
        error: 7,
        critical: 3,
      });
      expect(res.logs).toHaveLength(1);
      expect(res.totalPages).toBe(1);
    });
  });
});
