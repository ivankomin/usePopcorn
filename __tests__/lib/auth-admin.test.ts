import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { requireAdmin, verifyAdminSession } from "@/lib/auth/admin";

jest.mock("next/navigation", () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

const mockedRedirect = redirect as jest.MockedFunction<typeof redirect>;
const mockedCreateServerClient = createServerClient as jest.MockedFunction<
  typeof createServerClient
>;

function mockAuthAndProfile(options: {
  user?: { id: string; email: string } | null;
  authError?: { message: string } | null;
  profile?: { role: string; username: string | null; is_blocked: boolean } | null;
}) {
  mockedCreateServerClient.mockResolvedValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: options.user ?? null },
        error: options.authError ?? null,
      }),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({
            data: options.profile ?? null,
            error: null,
          }),
        }),
      }),
    }),
  } as never);
}

describe("lib/auth/admin", () => {
  describe("verifyAdminSession", () => {
    it("denies unauthenticated callers and auth errors", async () => {
      mockAuthAndProfile({ user: null });
      expect(await verifyAdminSession()).toEqual({
        isAdmin: false,
        user: null,
        username: null,
        error: "Authentication required",
      });

      mockAuthAndProfile({
        user: { id: "u-1", email: "a@b.com" },
        authError: { message: "JWT expired" },
      });
      expect(await verifyAdminSession()).toEqual({
        isAdmin: false,
        user: null,
        username: null,
        error: "Authentication required",
      });
    });

    it("denies non-admin users and blocked administrators", async () => {
      const regularUser = { id: "u-1", email: "user@example.com" };
      mockAuthAndProfile({
        user: regularUser,
        profile: { role: "user", username: "viewer", is_blocked: false },
      });

      expect(await verifyAdminSession()).toEqual({
        isAdmin: false,
        user: regularUser,
        username: "viewer",
        error: "Administrator privileges required",
      });

      const blockedAdmin = { id: "a-1", email: "admin@example.com" };
      mockAuthAndProfile({
        user: blockedAdmin,
        profile: { role: "admin", username: "blocked_admin", is_blocked: true },
      });

      expect(await verifyAdminSession()).toEqual({
        isAdmin: false,
        user: blockedAdmin,
        username: "blocked_admin",
        error: "Administrator privileges required",
      });
    });

    it("approves an active administrator session", async () => {
      const adminUser = { id: "a-2", email: "root@example.com" };
      mockAuthAndProfile({
        user: adminUser,
        profile: { role: "admin", username: "root_admin", is_blocked: false },
      });

      expect(await verifyAdminSession()).toEqual({
        isAdmin: true,
        user: adminUser,
        username: "root_admin",
        error: null,
      });
    });
  });

  describe("requireAdmin", () => {
    it("redirects unauthenticated callers to /login with encoded next path", async () => {
      mockAuthAndProfile({ user: null });

      await expect(requireAdmin("/admin/logs?level=error")).rejects.toThrow(
        "NEXT_REDIRECT:/login?next=%2Fadmin%2Flogs%3Flevel%3Derror",
      );
      expect(mockedRedirect).toHaveBeenCalledWith(
        "/login?next=%2Fadmin%2Flogs%3Flevel%3Derror",
      );
    });

    it("redirects authenticated non-admins to /profile", async () => {
      mockAuthAndProfile({
        user: { id: "u-1", email: "user@example.com" },
        profile: { role: "user", username: "member", is_blocked: false },
      });

      await expect(requireAdmin("/admin")).rejects.toThrow(
        "NEXT_REDIRECT:/profile",
      );
      expect(mockedRedirect).toHaveBeenCalledWith("/profile");
    });

    it("returns user and username for an authorized administrator", async () => {
      const adminUser = { id: "a-2", email: "root@example.com" };
      mockAuthAndProfile({
        user: adminUser,
        profile: { role: "admin", username: "root_admin", is_blocked: false },
      });

      expect(await requireAdmin("/admin")).toEqual({
        user: adminUser,
        username: "root_admin",
      });
      expect(mockedRedirect).not.toHaveBeenCalled();
    });
  });
});
