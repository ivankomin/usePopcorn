import { headers } from "next/headers";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logSystemEvent } from "@/lib/logger";
import {
  logAuthEventAction,
  requestPasswordResetAction,
} from "@/app/actions/auth";

jest.mock("next/headers", () => ({
  headers: jest.fn(),
}));

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: jest.fn(),
}));

jest.mock("@/lib/logger", () => ({
  logSystemEvent: jest.fn().mockResolvedValue(undefined),
}));

const mockedHeaders = headers as jest.MockedFunction<typeof headers>;
const mockedCreateServerClient = createServerClient as jest.MockedFunction<
  typeof createServerClient
>;
const mockedCreateAdminClient = createAdminClient as jest.MockedFunction<
  typeof createAdminClient
>;
const mockedLogSystemEvent = logSystemEvent as jest.MockedFunction<
  typeof logSystemEvent
>;

describe("app/actions/auth", () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.BREVO_API_KEY = "test-brevo-key";
    process.env.BREVO_SENDER_EMAIL = "no-reply@usepopcorn.app";
    process.env.BREVO_SENDER_NAME = "usePopcorn";
    global.fetch = jest.fn();
  });

  afterAll(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  describe("logAuthEventAction", () => {
    it("records auth.login using the active user session and normalized email", async () => {
      mockedCreateServerClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: "u-1", email: "session@example.com" } },
          }),
        },
      } as never);

      await logAuthEventAction({
        event: "auth.login",
        email: "  USER@Example.COM ",
      });

      expect(mockedLogSystemEvent).toHaveBeenCalledWith({
        level: "info",
        category: "auth",
        action: "auth.login",
        message: "User session started for user@example.com.",
        actorId: "u-1",
        metadata: { email: "user@example.com" },
      });
    });

    it("records auth.login_failed with null actorId and failure reason", async () => {
      mockedCreateServerClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
        },
      } as never);

      await logAuthEventAction({
        event: "auth.login_failed",
        email: "bad@example.com",
        reason: "Invalid credentials",
      });

      expect(mockedLogSystemEvent).toHaveBeenCalledWith({
        level: "warn",
        category: "auth",
        action: "auth.login_failed",
        message: "Failed sign-in attempt for bad@example.com.",
        actorId: null,
        metadata: { email: "bad@example.com", reason: "Invalid credentials" },
      });
    });

    it("records auth.login_blocked, signup, logout, and password_updated events", async () => {
      mockedCreateServerClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: "u-2", email: "member@example.com" } },
          }),
        },
      } as never);

      await logAuthEventAction({
        event: "auth.login_blocked",
        reason: "Spam",
      });
      await logAuthEventAction({ event: "auth.signup" });
      await logAuthEventAction({ event: "auth.logout" });
      await logAuthEventAction({ event: "auth.password_updated" });

      expect(mockedLogSystemEvent).toHaveBeenCalledTimes(4);
      expect(mockedLogSystemEvent).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          level: "warn",
          action: "auth.login_blocked",
          actorId: "u-2",
          metadata: { email: "member@example.com", reason: "Spam" },
        }),
      );
      expect(mockedLogSystemEvent).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ action: "auth.signup", actorId: "u-2" }),
      );
      expect(mockedLogSystemEvent).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({ action: "auth.logout", actorId: "u-2" }),
      );
      expect(mockedLogSystemEvent).toHaveBeenNthCalledWith(
        4,
        expect.objectContaining({
          action: "auth.password_updated",
          actorId: "u-2",
        }),
      );
    });

    it("swallows unexpected errors so audit logging never breaks auth flows", async () => {
      mockedCreateServerClient.mockRejectedValue(new Error("Cookie store unavailable"));

      await expect(
        logAuthEventAction({ event: "auth.logout" }),
      ).resolves.toBeUndefined();
    });
  });

  describe("requestPasswordResetAction", () => {
    it("rejects invalid emails before touching Brevo or Supabase", async () => {
      const result = await requestPasswordResetAction("not-an-email");
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/valid email/i);
      expect(mockedCreateAdminClient).not.toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("returns a configuration error and logs critical event when Brevo env vars are missing", async () => {
      delete process.env.BREVO_API_KEY;

      const result = await requestPasswordResetAction("user@example.com");

      expect(result).toEqual({
        success: false,
        error:
          "Password recovery email service is not configured. Please contact support.",
      });
      expect(mockedLogSystemEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "critical",
          category: "system",
          action: "auth.password_reset_unconfigured",
        }),
      );
    });

    it("returns success without sending email when account does not exist (anti-enumeration)", async () => {
      mockedCreateAdminClient.mockReturnValue({
        auth: {
          admin: {
            generateLink: jest.fn().mockResolvedValue({
              data: null,
              error: { message: "User not found", code: "user_not_found" },
            }),
          },
        },
      } as never);

      const result = await requestPasswordResetAction("ghost@example.com");

      expect(result).toEqual({ success: true });
      expect(global.fetch).not.toHaveBeenCalled();
      expect(mockedLogSystemEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "info",
          action: "auth.password_reset_unknown_email",
        }),
      );
    });

    it("maps Supabase rate-limit errors to a friendly retry message", async () => {
      mockedCreateAdminClient.mockReturnValue({
        auth: {
          admin: {
            generateLink: jest.fn().mockResolvedValue({
              data: null,
              error: { message: "Rate limit exceeded", code: "over_request_rate_limit" },
            }),
          },
        },
      } as never);

      const result = await requestPasswordResetAction("user@example.com");

      expect(result).toEqual({
        success: false,
        error:
          "Too many reset attempts. Please wait a few minutes and try again.",
      });
      expect(mockedLogSystemEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "warn",
          action: "auth.password_reset_rate_limited",
        }),
      );
    });

    it("fails gracefully when generateLink omits hashed_token", async () => {
      mockedCreateAdminClient.mockReturnValue({
        auth: {
          admin: {
            generateLink: jest.fn().mockResolvedValue({
              data: { user: { id: "u-1" }, properties: {} },
              error: null,
            }),
          },
        },
      } as never);

      const result = await requestPasswordResetAction("user@example.com");

      expect(result).toEqual({
        success: false,
        error:
          "Failed to generate a password recovery token. Please try again.",
      });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("returns an error when Brevo rejects the HTTP request", async () => {
      process.env.NEXT_PUBLIC_SITE_URL = "https://popcorn.example.com/";
      mockedCreateAdminClient.mockReturnValue({
        auth: {
          admin: {
            generateLink: jest.fn().mockResolvedValue({
              data: {
                user: { id: "u-1" },
                properties: { hashed_token: "tok_abc123" },
              },
              error: null,
            }),
          },
        },
      } as never);

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 502,
        text: jest.fn().mockResolvedValue("Bad Gateway"),
      });

      const result = await requestPasswordResetAction("user@example.com");

      expect(result).toEqual({
        success: false,
        error:
          "Unable to send the password reset email right now. Please try again later.",
      });
      expect(mockedLogSystemEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "error",
          action: "auth.password_reset_email_failed",
        }),
      );
    });

    it("sends a Brevo recovery email using header-resolved origin and logs success", async () => {
      mockedHeaders.mockResolvedValue({
        get: (name: string) => {
          if (name === "x-forwarded-host") return "movies.example.com";
          if (name === "x-forwarded-proto") return "https";
          return null;
        },
      } as never);

      mockedCreateAdminClient.mockReturnValue({
        auth: {
          admin: {
            generateLink: jest.fn().mockResolvedValue({
              data: {
                user: { id: "u-42" },
                properties: { hashed_token: "hash/with+chars" },
              },
              error: null,
            }),
          },
        },
      } as never);

      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

      const result = await requestPasswordResetAction("  User@Example.com ");

      expect(result).toEqual({ success: true });
      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.brevo.com/v3/smtp/email",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "api-key": "test-brevo-key",
          }),
        }),
      );

      const fetchBody = JSON.parse(
        (global.fetch as jest.Mock).mock.calls[0][1].body,
      );
      expect(fetchBody.to).toEqual([{ email: "user@example.com" }]);
      expect(fetchBody.textContent).toContain(
        "https://movies.example.com/auth/callback?token_hash=hash%2Fwith%2Bchars&type=recovery&next=/reset-password",
      );
      expect(mockedLogSystemEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "info",
          action: "auth.password_reset_sent",
          actorId: "u-42",
        }),
      );
    });
  });
});
