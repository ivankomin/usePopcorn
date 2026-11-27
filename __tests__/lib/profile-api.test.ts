import { updateUserEmailAction } from "@/app/actions/profile";
import {
  changeUserPassword,
  updateProfileDetails,
  uploadUserAvatar,
} from "@/lib/profile-api";

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/app/actions/profile", () => ({
  updateUserEmailAction: jest.fn(),
}));

const mockedUpdateUserEmailAction = updateUserEmailAction as jest.MockedFunction<
  typeof updateUserEmailAction
>;

describe("lib/profile-api", () => {
  describe("uploadUserAvatar", () => {
    it("uploads avatar, syncs profiles and auth metadata, and returns publicUrl", async () => {
      const upload = jest.fn().mockResolvedValue({
        data: { path: "u-1/avatar-123.png" },
        error: null,
      });
      const getPublicUrl = jest.fn().mockReturnValue({
        data: { publicUrl: "https://cdn.example.com/u-1/avatar-123.png" },
      });
      const eq = jest.fn().mockResolvedValue({ error: null });
      const updateProfile = jest.fn().mockReturnValue({ eq });
      const updateUser = jest.fn().mockResolvedValue({ error: null });

      const mockClient = {
        storage: { from: jest.fn().mockReturnValue({ upload, getPublicUrl }) },
        from: jest.fn().mockReturnValue({ update: updateProfile }),
        auth: { updateUser },
      };

      const file = new File(["img"], "photo.png", { type: "image/png" });
      const result = await uploadUserAvatar("u-1", file, mockClient as never);

      expect(result).toEqual({
        publicUrl: "https://cdn.example.com/u-1/avatar-123.png",
      });
      expect(upload).toHaveBeenCalledWith(
        expect.stringMatching(/^u-1\/avatar-\d+\.png$/),
        file,
        { upsert: true, contentType: "image/png" },
      );
      expect(eq).toHaveBeenCalledWith("id", "u-1");
      expect(updateUser).toHaveBeenCalledWith({
        data: { avatar_url: "https://cdn.example.com/u-1/avatar-123.png" },
      });
    });

    it("throws on storage upload or profile update failures", async () => {
      const storageFailClient = {
        storage: {
          from: jest.fn().mockReturnValue({
            upload: jest
              .fn()
              .mockResolvedValue({ data: null, error: { message: "Bucket full" } }),
          }),
        },
      };

      await expect(
        uploadUserAvatar(
          "u-1",
          new File(["x"], "a.jpg", { type: "image/jpeg" }),
          storageFailClient as never,
        ),
      ).rejects.toThrow("Bucket full");

      const profileFailClient = {
        storage: {
          from: jest.fn().mockReturnValue({
            upload: jest
              .fn()
              .mockResolvedValue({ data: { path: "u-1/a.jpg" }, error: null }),
            getPublicUrl: jest.fn().mockReturnValue({
              data: { publicUrl: "https://cdn.example.com/u-1/a.jpg" },
            }),
          }),
        },
        from: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest
              .fn()
              .mockResolvedValue({ error: { message: "RLS denied" } }),
          }),
        }),
      };

      await expect(
        uploadUserAvatar(
          "u-1",
          new File(["x"], "a.jpg", { type: "image/jpeg" }),
          profileFailClient as never,
        ),
      ).rejects.toThrow("RLS denied");
    });
  });

  describe("updateProfileDetails", () => {
    it("skips email server action when email is unchanged and updates username", async () => {
      const updateUser = jest.fn().mockResolvedValue({ error: null });
      const refreshSession = jest.fn();
      const mockClient = {
        from: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        }),
        auth: { updateUser, refreshSession },
      };

      const res = await updateProfileDetails(
        {
          userId: "u-1",
          currentEmail: "User@Example.com",
          newEmail: "user@example.com",
          newUsername: "cinephile",
        },
        mockClient as never,
      );

      expect(res).toEqual({ emailChanged: false });
      expect(mockedUpdateUserEmailAction).not.toHaveBeenCalled();
      expect(refreshSession).not.toHaveBeenCalled();
      expect(updateUser).toHaveBeenCalledWith({
        data: { username: "cinephile" },
      });
    });

    it("calls updateUserEmailAction + refreshSession on email change and maps 23505 username conflict", async () => {
      mockedUpdateUserEmailAction.mockResolvedValueOnce({ success: true });

      const refreshSession = jest.fn().mockResolvedValue({});
      const updateUser = jest.fn().mockResolvedValue({ error: null });
      const mockClient = {
        from: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        }),
        auth: { refreshSession, updateUser },
      };

      const res = await updateProfileDetails(
        {
          userId: "u-1",
          currentEmail: "old@example.com",
          newEmail: "new@example.com",
          newUsername: "fresh_name",
        },
        mockClient as never,
      );
      expect(res).toEqual({ emailChanged: true });
      expect(mockedUpdateUserEmailAction).toHaveBeenCalledWith("new@example.com");
      expect(refreshSession).toHaveBeenCalled();

      const conflictClient = {
        from: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              error: { code: "23505", message: "duplicate key" },
            }),
          }),
        }),
        auth: { refreshSession, updateUser },
      };

      await expect(
        updateProfileDetails(
          {
            userId: "u-1",
            currentEmail: "same@example.com",
            newEmail: "same@example.com",
            newUsername: "taken_name",
          },
          conflictClient as never,
        ),
      ).rejects.toThrow("This username is already taken. Please choose another.");
    });

    it("throws when updateUserEmailAction fails", async () => {
      mockedUpdateUserEmailAction.mockResolvedValueOnce({
        success: false,
        error: "Email already in use",
      });

      await expect(
        updateProfileDetails(
          {
            userId: "u-1",
            currentEmail: "old@example.com",
            newEmail: "taken@example.com",
            newUsername: "name",
          },
          {} as never,
        ),
      ).rejects.toThrow("Email already in use");
    });
  });

  describe("changeUserPassword", () => {
    it("throws if current password re-authentication fails", async () => {
      const updateUser = jest.fn();
      const mockClient = {
        auth: {
          signInWithPassword: jest
            .fn()
            .mockResolvedValue({ error: { message: "Invalid credentials" } }),
          updateUser,
        },
      };

      await expect(
        changeUserPassword(
          {
            email: "user@example.com",
            currentPassword: "wrong",
            newPassword: "NewPassword1!",
          },
          mockClient as never,
        ),
      ).rejects.toThrow(
        "Current password is incorrect. Identity verification failed.",
      );
      expect(updateUser).not.toHaveBeenCalled();
    });

    it("updates password after successful re-authentication and surfaces update errors", async () => {
      const updateUser = jest
        .fn()
        .mockResolvedValueOnce({ error: null })
        .mockResolvedValueOnce({ error: { message: "Password too weak" } });

      const mockClient = {
        auth: {
          signInWithPassword: jest.fn().mockResolvedValue({ error: null }),
          updateUser,
        },
      };

      await expect(
        changeUserPassword(
          {
            email: "user@example.com",
            currentPassword: "OldPassword1!",
            newPassword: "NewPassword1!",
          },
          mockClient as never,
        ),
      ).resolves.toBeUndefined();
      expect(updateUser).toHaveBeenCalledWith({ password: "NewPassword1!" });

      await expect(
        changeUserPassword(
          {
            email: "user@example.com",
            currentPassword: "OldPassword1!",
            newPassword: "weak",
          },
          mockClient as never,
        ),
      ).rejects.toThrow("Password too weak");
    });
  });
});
