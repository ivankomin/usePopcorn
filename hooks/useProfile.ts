"use client";

import { useAuth } from "./useAuth";
import {
  uploadUserAvatar,
  updateProfileDetails,
  changeUserPassword,
  type UploadAvatarResult,
  type UpdateProfileDetailsResult,
} from "@/lib/profile-api";
import type { ProfileRow } from "@/types/media";
import type { User } from "@supabase/supabase-js";

export interface UseProfileReturn {
  user: User | null;
  profile: ProfileRow | null;
  username: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  isAdmin: boolean;
  isLoading: boolean;
  updateAvatar: (file: File) => Promise<UploadAvatarResult>;
  updateInfo: (params: {
    username: string;
    email: string;
  }) => Promise<UpdateProfileDetailsResult>;
  updatePassword: (params: {
    currentPassword: string;
    newPassword: string;
  }) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

/**
 * Custom hook providing real-time access to user profile data,
 * role/status badges, and encapsulated mutation actions.
 */
export function useProfile(): UseProfileReturn {
  const { user, profile, isLoading, refreshProfile } = useAuth();

  const username =
    profile?.username || user?.user_metadata?.username || "";
  const email = user?.email || "";
  const avatarUrl =
    profile?.avatar_url || user?.user_metadata?.avatar_url || null;
  const role = profile?.role || "user";
  const isAdmin = role === "admin";

  const updateAvatar = async (file: File): Promise<UploadAvatarResult> => {
    if (!user) {
      throw new Error("You must be signed in to upload an avatar.");
    }
    const result = await uploadUserAvatar(user.id, file);
    await refreshProfile();
    return result;
  };

  const updateInfo = async ({
    username: newUsername,
    email: newEmail,
  }: {
    username: string;
    email: string;
  }): Promise<UpdateProfileDetailsResult> => {
    if (!user) {
      throw new Error("You must be signed in to update your profile.");
    }
    const result = await updateProfileDetails({
      userId: user.id,
      currentEmail: user.email,
      newUsername,
      newEmail,
    });
    await refreshProfile();
    return result;
  };

  const updatePassword = async ({
    currentPassword,
    newPassword,
  }: {
    currentPassword: string;
    newPassword: string;
  }): Promise<void> => {
    const targetEmail = user?.email;
    if (!targetEmail) {
      throw new Error("User email is not available for password change.");
    }
    await changeUserPassword({
      email: targetEmail,
      currentPassword,
      newPassword,
    });
  };

  return {
    user,
    profile,
    username,
    email,
    avatarUrl,
    role,
    isAdmin,
    isLoading,
    updateAvatar,
    updateInfo,
    updatePassword,
    refreshProfile,
  };
}
