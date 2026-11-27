import { createAdminClient } from "@/lib/supabase/admin";
import {
  formatStructuredLogDocument,
  formatStructuredLogLine,
  logSystemEvent,
} from "@/lib/logger";
import type { SystemLogItem } from "@/types/media";

jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: jest.fn(),
}));

const mockedCreateAdminClient = createAdminClient as jest.MockedFunction<
  typeof createAdminClient
>;

function makeLogItem(overrides: Partial<SystemLogItem> = {}): SystemLogItem {
  return {
    id: "log-1",
    level: "info",
    category: "admin",
    action: "admin.media_created",
    message: "Added movie to catalog.",
    actor_id: "12345678-aaaa-bbbb-cccc-1234567890ab",
    metadata: {},
    created_at: "2026-11-27T12:00:00.000Z",
    actor: { id: "12345678-aaaa-bbbb-cccc-1234567890ab", username: "admin_user", role: "admin" },
    ...overrides,
  };
}

describe("lib/logger", () => {
  let infoSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    infoSpy = jest.spyOn(console, "info").mockImplementation(() => {});
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    infoSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  describe("logSystemEvent", () => {
    it("persists a structured log entry and routes console output by level", async () => {
      const insert = jest.fn().mockResolvedValue({ error: null });
      const from = jest.fn().mockReturnValue({ insert });
      mockedCreateAdminClient.mockReturnValue({ from } as never);

      await logSystemEvent({
        level: "info",
        category: "auth",
        action: "auth.login",
        message: "User signed in.",
        actorId: "user-1",
        metadata: { email: "user@example.com" },
      });

      expect(infoSpy).toHaveBeenCalledWith(
        "[INFO] [AUTH] [auth.login] User signed in.",
      );
      expect(from).toHaveBeenCalledWith("system_logs");
      expect(insert).toHaveBeenCalledWith({
        level: "info",
        category: "auth",
        action: "auth.login",
        message: "User signed in.",
        actor_id: "user-1",
        metadata: { email: "user@example.com" },
      });

      await logSystemEvent({
        level: "warn",
        category: "system",
        action: "system.warn",
        message: "Low disk space",
      });
      expect(warnSpy).toHaveBeenCalledWith(
        "[WARN] [SYSTEM] [system.warn] Low disk space",
      );

      await logSystemEvent({
        level: "critical",
        category: "db",
        action: "db.down",
        message: "Connection lost",
      });
      expect(errorSpy).toHaveBeenCalledWith(
        "[CRITICAL] [DB] [db.down] Connection lost",
        "",
      );
    });

    it("redacts sensitive keys recursively, drops undefined values, and caps array length & depth", async () => {
      const insert = jest.fn().mockResolvedValue({ error: null });
      mockedCreateAdminClient.mockReturnValue({
        from: jest.fn().mockReturnValue({ insert }),
      } as never);

      const bigArray = Array.from({ length: 65 }, (_, idx) => idx);

      await logSystemEvent({
        level: "info",
        category: "auth",
        action: "auth.audit",
        message: "Audit metadata test",
        metadata: {
          email: "safe@example.com",
          password: "plain-password",
          passphrase: "my-secret-phrase",
          api_key: "sk-123",
          "api-key": "sk-456",
          authorization: "Bearer xyz",
          cookie: "sid=abc",
          credentials: { nested: true },
          optionalMissing: undefined,
          nested: {
            refreshToken: "tok_999",
            clientSecret: "sec_888",
            okFlag: true,
          },
          items: bigArray,
          deep: {
            level1: {
              level2: {
                level3: {
                  level4: "too-deep",
                },
              },
            },
          },
        },
      });

      const insertedPayload = insert.mock.calls[0][0];
      expect(insertedPayload.metadata).toEqual({
        email: "safe@example.com",
        password: "[REDACTED]",
        passphrase: "[REDACTED]",
        api_key: "[REDACTED]",
        "api-key": "[REDACTED]",
        authorization: "[REDACTED]",
        cookie: "[REDACTED]",
        credentials: "[REDACTED]",
        nested: {
          refreshToken: "[REDACTED]",
          clientSecret: "[REDACTED]",
          okFlag: true,
        },
        items: bigArray.slice(0, 50),
        deep: {
          level1: {
            level2: {
              level3: "[object Object]",
            },
          },
        },
      });
    });

    it("truncates overly long action and message fields before inserting", async () => {
      const insert = jest.fn().mockResolvedValue({ error: null });
      mockedCreateAdminClient.mockReturnValue({
        from: jest.fn().mockReturnValue({ insert }),
      } as never);

      await logSystemEvent({
        level: "info",
        category: "system",
        action: "a".repeat(200),
        message: "m".repeat(1500),
      });

      const payload = insert.mock.calls[0][0];
      expect(payload.action).toHaveLength(120);
      expect(payload.message).toHaveLength(1000);
      expect(payload.actor_id).toBeNull();
      expect(payload.metadata).toEqual({});
    });

    it("never throws when Supabase returns an insert error or throws an exception", async () => {
      const insertError = jest.fn().mockResolvedValue({
        error: { message: "permission denied" },
      });
      mockedCreateAdminClient.mockReturnValue({
        from: jest.fn().mockReturnValue({ insert: insertError }),
      } as never);

      await expect(
        logSystemEvent({
          level: "error",
          category: "db",
          action: "db.fail",
          message: "Insert failed",
        }),
      ).resolves.toBeUndefined();

      expect(errorSpy).toHaveBeenCalledWith(
        "[Logger] Failed persisting system log:",
        "permission denied",
      );

      mockedCreateAdminClient.mockImplementation(() => {
        throw new Error("Missing service role key");
      });

      await expect(
        logSystemEvent({
          level: "info",
          category: "system",
          action: "system.boot",
          message: "Booting",
        }),
      ).resolves.toBeUndefined();

      expect(errorSpy).toHaveBeenCalledWith(
        "[Logger] Unexpected error writing system log:",
        "Missing service role key",
      );
    });
  });

  describe("formatStructuredLogLine", () => {
    it("formats timestamp, padded level/category, actor username, single-line message, and metadata", () => {
      const line = formatStructuredLogLine(
        makeLogItem({
          level: "warn",
          category: "auth",
          action: "auth.login_failed",
          message: "Failed login\r\nfor user\n  ",
          metadata: { attempts: 3 },
        }),
      );

      expect(line).toBe(
        '[2026-11-27T12:00:00.000Z] [WARN    ] [AUTH  ] [auth.login_failed] actor=admin_user | Failed login for user | {"attempts":3}',
      );
    });

    it("falls back to truncated actor_id and then system, and omits empty metadata", () => {
      const withIdOnly = formatStructuredLogLine(
        makeLogItem({
          actor: null,
          actor_id: "abcdef12-9999-0000-1111-222233334444",
          metadata: {},
        }),
      );
      expect(withIdOnly).toBe(
        "[2026-11-27T12:00:00.000Z] [INFO    ] [ADMIN ] [admin.media_created] actor=abcdef12 | Added movie to catalog.",
      );

      const systemLine = formatStructuredLogLine(
        makeLogItem({
          actor: null,
          actor_id: null,
          metadata: null,
        }),
      );
      expect(systemLine).toContain("actor=system | Added movie to catalog.");
      expect(systemLine).not.toContain("{");
    });
  });

  describe("formatStructuredLogDocument", () => {
    it("renders header and empty-state notice when there are no entries", () => {
      const doc = formatStructuredLogDocument([], { exportedBy: "root_admin" });
      expect(doc).toContain("# usePopcorn Log Report\n");
      expect(doc).toMatch(/# Generated At : \d{4}-\d{2}-\d{2}T/);
      expect(doc).toContain("# Exported By  : root_admin\n");
      expect(doc.endsWith("# No log entries matched the active filters.\n")).toBe(
        true,
      );
    });

    it("renders all formatted entries separated by newlines with trailing newline", () => {
      const entries = [
        makeLogItem({ id: "1", message: "First event" }),
        makeLogItem({ id: "2", level: "error", message: "Second event" }),
      ];
      const doc = formatStructuredLogDocument(entries, {
        exportedBy: "auditor@usepopcorn.app",
      });

      const lines = doc.trimEnd().split("\n");
      expect(lines).toHaveLength(5); // 3 header lines + 2 entries
      expect(lines[3]).toContain("First event");
      expect(lines[4]).toContain("[ERROR   ]");
      expect(lines[4]).toContain("Second event");
      expect(doc.endsWith("\n")).toBe(true);
    });
  });
});
