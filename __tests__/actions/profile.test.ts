import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logSystemEvent } from "@/lib/logger";
import {
  deleteUserAccountAction,
  updateUserEmailAction,
} from "@/app/actions/profile";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: jest.fn(),
}));

jest.mock("@/lib/logger", () => ({
  logSystemEvent: jest.fn().mockResolvedValue(undefined),
}));

const mockedCreateServerClient = createServerClient as jest.MockedFunction<
  typeof createServerClient
>;
const mockedCreateAdminClient = createAdminClient as jest.MockedFunction<
  typeof createAdminClient
>;
const mockedLogSystemEvent = logSystemEvent as jest.MockedFunction<
  typeof logSystemEvent
>;

describe("app/actions/profile", () => {
  describe("updateUserEmailAction", () => {
    it("rejects unauthenticated callers", async () => {
      mockedCreateServerClient.mockResolvedValue({
        auth: {
          getUser: jest
            .fn()
            .mockResolvedValue({ data: { user: null }, error: null }),
        },
      } as never);

      const result = await updateUserEmailAction("new@example.com");
      expect(result).toEqual({
        success: false,
        error: "Unauthorized. Please sign in again.",
      });
      expect(mockedCreateAdminClient).not.toHaveBeenCalled();
    });

    it("short-circuits with success when the normalized email is unchanged", async () => {
      mockedCreateServerClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: "u-1", email: "user@example.com" } },
            error: null,
          }),
        },
      } as never);

      const result = await updateUserEmailAction("  USER@Example.com ");
      expect(result).toEqual({ success: true });
      expect(mockedCreateAdminClient).not.toHaveBeenCalled();
    });

    it("maps duplicate email errors to a user-friendly message", async () => {
      mockedCreateServerClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: "u-1", email: "old@example.com" } },
            error: null,
          }),
        },
      } as never);
      mockedCreateAdminClient.mockReturnValue({
        auth: {
          admin: {
            updateUserById: jest.fn().mockResolvedValue({
              error: { code: "email_exists", message: "Email already exists" },
            }),
          },
        },
      } as never);

      const result = await updateUserEmailAction("taken@example.com");
      expect(result).toEqual({
        success: false,
        error: "This email address is already in use by another account.",
      });
    });

    it("updates email with email_confirm: true and logs an audit event on success", async () => {
      const updateUserById = jest.fn().mockResolvedValue({ error: null });
      mockedCreateServerClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: "u-1", email: "old@example.com" } },
            error: null,
          }),
        },
      } as never);
      mockedCreateAdminClient.mockReturnValue({
        auth: { admin: { updateUserById } },
      } as never);

      const result = await updateUserEmailAction("  New@Example.com ");

      expect(result).toEqual({ success: true });
      expect(updateUserById).toHaveBeenCalledWith("u-1", {
        email: "new@example.com",
        email_confirm: true,
      });
      expect(mockedLogSystemEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "profile.email_updated",
          actorId: "u-1",
          metadata: {
            previousEmail: "old@example.com",
            newEmail: "new@example.com",
          },
        }),
      );
    });
  });

  describe("deleteUserAccountAction", () => {
    it("validates confirmation text and current password before querying auth", async () => {
      expect(
        await deleteUserAccountAction({
          confirmationText: "delete",
          currentPassword: "Secret1!",
        }),
      ).toEqual({
        success: false,
        error: 'Please type "DELETE" to confirm permanent account deletion.',
      });

      expect(
        await deleteUserAccountAction({
          confirmationText: "DELETE",
          currentPassword: "",
        }),
      ).toEqual({
        success: false,
        error: "Please enter your current password to verify your identity.",
      });
      expect(mockedCreateServerClient).not.toHaveBeenCalled();
    });

    it("rejects unauthenticated users and failed password re-authentication", async () => {
      mockedCreateServerClient.mockResolvedValue({
        auth: {
          getUser: jest
            .fn()
            .mockResolvedValue({ data: { user: null }, error: null }),
        },
      } as never);

      expect(
        await deleteUserAccountAction({
          confirmationText: "DELETE",
          currentPassword: "Password1!",
        }),
      ).toEqual({
        success: false,
        error: "Unauthorized. Please sign in again.",
      });

      const signInWithPassword = jest
        .fn()
        .mockResolvedValue({ error: { message: "Invalid login" } });
      mockedCreateServerClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: "u-1", email: "user@example.com" } },
            error: null,
          }),
          signInWithPassword,
        },
      } as never);

      expect(
        await deleteUserAccountAction({
          confirmationText: "DELETE",
          currentPassword: "WrongPassword!",
        }),
      ).toEqual({
        success: false,
        error:
          "Current password is incorrect. Identity verification failed.",
      });
      expect(signInWithPassword).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "WrongPassword!",
      });
    });

    it("prevents deleting the last remaining administrator account", async () => {
      mockedCreateServerClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: "admin-1", email: "admin@example.com" } },
            error: null,
          }),
          signInWithPassword: jest.fn().mockResolvedValue({ error: null }),
        },
      } as never);

      const profilesSelect = jest
        .fn()
        .mockReturnValueOnce({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: { role: "admin" }, error: null }),
          }),
        })
        .mockReturnValueOnce({
          eq: jest.fn().mockResolvedValue({ count: 1, error: null }),
        });

      const deleteUser = jest.fn();
      mockedCreateAdminClient.mockReturnValue({
        from: jest.fn(() => ({ select: profilesSelect })),
        auth: { admin: { deleteUser } },
      } as never);

      const result = await deleteUserAccountAction({
        confirmationText: "DELETE",
        currentPassword: "AdminPassword1!",
      });

      expect(result).toEqual({
        success: false,
        error:
          "Cannot delete the last remaining administrator account. Assign another administrator first.",
      });
      expect(deleteUser).not.toHaveBeenCalled();
    });

    it("deletes text-only reviews, anonymizes rated reviews, cleans up avatars, deletes user, and signs out", async () => {
      const signOut = jest.fn().mockResolvedValue({ error: null });
      mockedCreateServerClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: "u-99", email: "member@example.com" } },
            error: null,
          }),
          signInWithPassword: jest.fn().mockResolvedValue({ error: null }),
          signOut,
        },
      } as never);

      const reviewsDeleteIs = jest
        .fn()
        .mockResolvedValue({ count: 2, error: null });
      const reviewsUpdateNot = jest
        .fn()
        .mockResolvedValue({ count: 4, error: null });
      const reviewsUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({ not: reviewsUpdateNot }),
      });

      const avatarList = jest.fn().mockResolvedValue({
        data: [{ name: "avatar-1.png" }, { name: "avatar-2.webp" }],
        error: null,
      });
      const avatarRemove = jest.fn().mockResolvedValue({ error: null });
      const deleteUser = jest.fn().mockResolvedValue({ error: null });

      mockedCreateAdminClient.mockReturnValue({
        from: jest.fn((table: string) => {
          if (table === "profiles") {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  maybeSingle: jest
                    .fn()
                    .mockResolvedValue({ data: { role: "user" }, error: null }),
                }),
              }),
            };
          }
          if (table === "reviews") {
            return {
              delete: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({ is: reviewsDeleteIs }),
              }),
              update: reviewsUpdate,
            };
          }
          throw new Error(`Unexpected table: ${table}`);
        }),
        storage: {
          from: jest.fn().mockReturnValue({
            list: avatarList,
            remove: avatarRemove,
          }),
        },
        auth: { admin: { deleteUser } },
      } as never);

      const result = await deleteUserAccountAction({
        confirmationText: "  DELETE ",
        currentPassword: "MyPassword1!",
      });

      expect(result).toEqual({ success: true });
      expect(reviewsDeleteIs).toHaveBeenCalledWith("rating", null);
      expect(reviewsUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: null, content: null }),
        { count: "exact" },
      );
      expect(reviewsUpdateNot).toHaveBeenCalledWith("rating", "is", null);
      expect(avatarRemove).toHaveBeenCalledWith([
        "u-99/avatar-1.png",
        "u-99/avatar-2.webp",
      ]);
      expect(deleteUser).toHaveBeenCalledWith("u-99");
      expect(signOut).toHaveBeenCalled();
      expect(mockedLogSystemEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "account.deleted",
          actorId: null,
          metadata: {
            anonymizedRatingsCount: 4,
            deletedTextReviewsCount: 2,
            deletedAvatarFiles: 2,
          },
        }),
      );
    });
  });
});
