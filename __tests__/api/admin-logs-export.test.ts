import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAdminSession } from "@/lib/auth/admin";
import { buildSystemLogsQuery } from "@/lib/admin-queries";
import { logSystemEvent } from "@/lib/logger";
import { GET } from "@/app/api/admin/logs/export/route";

jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: jest.fn(),
}));

jest.mock("@/lib/auth/admin", () => ({
  verifyAdminSession: jest.fn(),
}));

jest.mock("@/lib/admin-queries", () => ({
  buildSystemLogsQuery: jest.fn(),
}));

jest.mock("@/lib/logger", () => {
  const actual = jest.requireActual("@/lib/logger");
  return {
    ...actual,
    logSystemEvent: jest.fn().mockResolvedValue(undefined),
  };
});

const mockedCreateAdminClient = createAdminClient as jest.MockedFunction<
  typeof createAdminClient
>;
const mockedVerifyAdminSession = verifyAdminSession as jest.MockedFunction<
  typeof verifyAdminSession
>;
const mockedBuildSystemLogsQuery = buildSystemLogsQuery as jest.MockedFunction<
  typeof buildSystemLogsQuery
>;
const mockedLogSystemEvent = logSystemEvent as jest.MockedFunction<
  typeof logSystemEvent
>;

function makeNextRequest(url: string): NextRequest {
  return {
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

describe("GET /api/admin/logs/export", () => {
  it("returns 401 when the caller is not authenticated", async () => {
    mockedVerifyAdminSession.mockResolvedValue({
      isAdmin: false,
      user: null,
      username: null,
      error: "Authentication required",
    });

    const response = await GET(
      makeNextRequest("http://localhost:3000/api/admin/logs/export"),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Authentication required" });
    expect(mockedBuildSystemLogsQuery).not.toHaveBeenCalled();
  });

  it("returns 403 when an authenticated non-admin requests logs export", async () => {
    mockedVerifyAdminSession.mockResolvedValue({
      isAdmin: false,
      user: { id: "user-1", email: "user@example.com" } as never,
      username: "regular_user",
      error: "Administrator privileges required",
    });

    const response = await GET(
      makeNextRequest("http://localhost:3000/api/admin/logs/export"),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "Administrator privileges required",
    });
  });

  it("returns 500 when fetching system logs fails", async () => {
    mockedVerifyAdminSession.mockResolvedValue({
      isAdmin: true,
      user: { id: "admin-1", email: "admin@example.com" } as never,
      username: "root_admin",
      error: null,
    });
    mockedCreateAdminClient.mockReturnValue({} as never);
    mockedBuildSystemLogsQuery.mockReturnValue({
      limit: jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: "DB offline" } }),
    } as never);

    const response = await GET(
      makeNextRequest("http://localhost:3000/api/admin/logs/export"),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Failed to export logs: DB offline",
    });
  });

  it("exports filtered structured logs as a downloadable .log file and records an audit event", async () => {
    const fakeAdminClient = { tag: "admin-client" };
    mockedVerifyAdminSession.mockResolvedValue({
      isAdmin: true,
      user: { id: "admin-1", email: "admin@example.com" } as never,
      username: "root_admin",
      error: null,
    });
    mockedCreateAdminClient.mockReturnValue(fakeAdminClient as never);

    const limit = jest.fn().mockResolvedValue({
      data: [
        {
          id: "log-1",
          created_at: "2026-11-27T10:00:00.000Z",
          level: "error",
          category: "auth",
          action: "auth.login_failed",
          message: "Bad password",
          actor_id: null,
          metadata: { ip: "127.0.0.1" },
          actor: null,
        },
      ],
      error: null,
    });
    mockedBuildSystemLogsQuery.mockReturnValue({ limit } as never);

    const response = await GET(
      makeNextRequest(
        "http://localhost:3000/api/admin/logs/export?level=ERROR&category=AUTH&search=%20password%20",
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "text/plain; charset=utf-8",
    );
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Content-Disposition")).toMatch(
      /^attachment; filename="usepopcorn-logs-\d{4}-\d{2}-\d{2}\.log"$/,
    );

    expect(mockedBuildSystemLogsQuery).toHaveBeenCalledWith(fakeAdminClient, {
      level: "error",
      category: "auth",
      search: "password",
    });
    expect(limit).toHaveBeenCalledWith(2000);

    const bodyText = await response.text();
    expect(bodyText).toContain("# usePopcorn Log Report");
    expect(bodyText).toContain("# Exported By  : root_admin");
    expect(bodyText).toContain("[auth.login_failed] actor=system | Bad password");

    expect(mockedLogSystemEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "admin.logs_exported",
        actorId: "admin-1",
        metadata: {
          count: 1,
          levelFilter: "error",
          categoryFilter: "auth",
          hasSearch: true,
        },
      }),
    );
  });
});
