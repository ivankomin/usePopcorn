/** @jest-environment jsdom */
import { renderHook, act } from "@testing-library/react";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import {
  uploadUserAvatar,
  updateProfileDetails,
  changeUserPassword,
} from "@/lib/profile-api";

jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/lib/profile-api", () => ({
  uploadUserAvatar: jest.fn(),
  updateProfileDetails: jest.fn(),
  changeUserPassword: jest.fn(),
}));

const mockedUseAuth = useAuth as jest.Mock;
const mockedUploadUserAvatar = uploadUserAvatar as jest.Mock;
const mockedUpdateProfileDetails = updateProfileDetails as jest.Mock;
const mockedChangeUserPassword = changeUserPassword as jest.Mock;

describe("useProfile", () => {
  const refreshProfile = jest.fn();

  beforeEach(() => {
    refreshProfile.mockReset().mockResolvedValue(undefined);
  });

  it("derives profile values with admin role when profile is loaded", () => {
    mockedUseAuth.mockReturnValue({
      user: {
        id: "u1",
        email: "admin@example.com",
        user_metadata: { username: "metaName", avatar_url: "meta.png" },
      },
      profile: {
        id: "u1",
        username: "cinephile",
        avatar_url: "https://cdn.example.com/a.png",
        role: "admin",
      },
      isLoading: false,
      refreshProfile,
    });

    const { result } = renderHook(() => useProfile());

    expect(result.current.username).toBe("cinephile");
    expect(result.current.email).toBe("admin@example.com");
    expect(result.current.avatarUrl).toBe("https://cdn.example.com/a.png");
    expect(result.current.role).toBe("admin");
    expect(result.current.isAdmin).toBe(true);
  });

  it("falls back to user_metadata when profile row is null", () => {
    mockedUseAuth.mockReturnValue({
      user: {
        id: "u2",
        email: "user@example.com",
        user_metadata: { username: "fallbackUser", avatar_url: "fallback.png" },
      },
      profile: null,
      isLoading: false,
      refreshProfile,
    });

    const { result } = renderHook(() => useProfile());

    expect(result.current.username).toBe("fallbackUser");
    expect(result.current.avatarUrl).toBe("fallback.png");
    expect(result.current.role).toBe("user");
    expect(result.current.isAdmin).toBe(false);
  });

  it("throws when mutations are invoked without a signed-in user", async () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      profile: null,
      isLoading: false,
      refreshProfile,
    });

    const { result } = renderHook(() => useProfile());
    const file = new File(["img"], "avatar.png", { type: "image/png" });

    await expect(result.current.updateAvatar(file)).rejects.toThrow(
      "You must be signed in to upload an avatar.",
    );
    await expect(
      result.current.updateInfo({ username: "new", email: "new@example.com" }),
    ).rejects.toThrow("You must be signed in to update your profile.");
    await expect(
      result.current.updatePassword({
        currentPassword: "old",
        newPassword: "NewPassword1!",
      }),
    ).rejects.toThrow("User email is not available for password change.");
  });

  it("delegates avatar, info, and password updates and refreshes profile", async () => {
    mockedUseAuth.mockReturnValue({
      user: { id: "u1", email: "user@example.com", user_metadata: {} },
      profile: { id: "u1", username: "old", avatar_url: null, role: "user" },
      isLoading: false,
      refreshProfile,
    });

    mockedUploadUserAvatar.mockResolvedValue({ publicUrl: "https://cdn/a.jpg" });
    mockedUpdateProfileDetails.mockResolvedValue({
      usernameUpdated: true,
      emailChangePending: false,
    });
    mockedChangeUserPassword.mockResolvedValue(undefined);

    const { result } = renderHook(() => useProfile());
    const file = new File(["img"], "avatar.jpg", { type: "image/jpeg" });

    await act(async () => {
      const avatarRes = await result.current.updateAvatar(file);
      expect(avatarRes).toEqual({ publicUrl: "https://cdn/a.jpg" });
    });
    expect(mockedUploadUserAvatar).toHaveBeenCalledWith("u1", file);
    expect(refreshProfile).toHaveBeenCalledTimes(1);

    await act(async () => {
      const infoRes = await result.current.updateInfo({
        username: "new_name",
        email: "user@example.com",
      });
      expect(infoRes).toEqual({
        usernameUpdated: true,
        emailChangePending: false,
      });
    });
    expect(mockedUpdateProfileDetails).toHaveBeenCalledWith({
      userId: "u1",
      currentEmail: "user@example.com",
      newUsername: "new_name",
      newEmail: "user@example.com",
    });
    expect(refreshProfile).toHaveBeenCalledTimes(2);

    await act(async () => {
      await result.current.updatePassword({
        currentPassword: "OldPassword1!",
        newPassword: "NewPassword1!",
      });
    });
    expect(mockedChangeUserPassword).toHaveBeenCalledWith({
      email: "user@example.com",
      currentPassword: "OldPassword1!",
      newPassword: "NewPassword1!",
    });
  });
});
