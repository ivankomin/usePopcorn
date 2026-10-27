"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Upload, User, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import type { ProfileRow } from "@/types/media";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/Button";
import {
  getPasswordValidationError,
  PASSWORD_REQUIREMENTS_HINT,
  PASSWORD_MIN_LENGTH,
} from "@/lib/validation";

export interface ProfileSettingsProps {
  profile: ProfileRow | null;
  userEmail?: string | null;
}

export function ProfileSettings({ profile, userEmail }: ProfileSettingsProps) {
  const { user, refreshProfile } = useAuth();
  const supabase = createClient();

  // 1. Avatar State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    profile?.avatar_url || null,
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // 2. Personal Info & Contact Details State
  const [username, setUsername] = useState(profile?.username || "");
  const [email, setEmail] = useState(userEmail || user?.email || "");
  const [isSavingInfo, setIsSavingInfo] = useState(false);
  const [infoMessage, setInfoMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // 3. Password / Credentials State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // ==========================================
  // AVATAR HANDLERS
  // ==========================================
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setAvatarMessage({
        type: "error",
        text: "File size exceeds 2 MB. Please choose a smaller image.",
      });
      return;
    }

    // Validate MIME type
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setAvatarMessage({
        type: "error",
        text: "Unsupported format. Only JPG, PNG, and WebP are allowed.",
      });
      return;
    }

    setAvatarFile(file);
    setAvatarMessage(null);

    // Create local object URL for preview
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile || !user) return;

    setIsUploadingAvatar(true);
    setAvatarMessage(null);

    try {
      const fileExt = avatarFile.name.split(".").pop() || "jpg";
      const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`;

      // 1. Upload to Supabase Storage bucket 'avatars'
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, avatarFile, {
          upsert: true,
          contentType: avatarFile.type,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // 2. Get Public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(uploadData.path);

      const publicUrl = urlData.publicUrl;

      // 3. Update public.profiles
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (profileError) {
        throw new Error(profileError.message);
      }

      // 4. Update auth user metadata
      await supabase.auth.updateUser({
        data: { avatar_url: publicUrl },
      });

      // 5. Refresh context state
      await refreshProfile();

      setAvatarFile(null);
      setAvatarPreview(publicUrl);
      setAvatarMessage({
        type: "success",
        text: "Avatar updated successfully!",
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to upload avatar.";
      setAvatarMessage({
        type: "error",
        text: msg,
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // ==========================================
  // PERSONAL INFO & CONTACT HANDLERS
  // ==========================================
  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSavingInfo(true);
    setInfoMessage(null);

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim().toLowerCase();

    // Validate username: 3-30 chars, alphanumeric + underscores
    if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
      setInfoMessage({
        type: "error",
        text: "Username must be between 3 and 30 characters.",
      });
      setIsSavingInfo(false);
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      setInfoMessage({
        type: "error",
        text: "Username may only contain letters, numbers, and underscores.",
      });
      setIsSavingInfo(false);
      return;
    }

    try {
      let emailChanged = false;

      // 1. Update Email if changed
      if (trimmedEmail !== (user.email || "").toLowerCase()) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: trimmedEmail,
        });

        if (emailError) {
          throw new Error(emailError.message);
        }
        emailChanged = true;
      }

      // 2. Update Username in public.profiles
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          username: trimmedUsername,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (profileError) {
        if (profileError.code === "23505") {
          throw new Error(
            "This username is already taken. Please choose another.",
          );
        }
        throw new Error(profileError.message);
      }

      // 3. Update auth metadata
      await supabase.auth.updateUser({
        data: { username: trimmedUsername },
      });

      // 4. Refresh global state
      await refreshProfile();

      if (emailChanged) {
        setInfoMessage({
          type: "info",
          text: "Profile updated! A confirmation link has been sent to your new email address to complete the change.",
        });
      } else {
        setInfoMessage({
          type: "success",
          text: "Profile information updated successfully!",
        });
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to update profile info.";
      setInfoMessage({
        type: "error",
        text: msg,
      });
    } finally {
      setIsSavingInfo(false);
    }
  };

  // ==========================================
  // PASSWORD / CREDENTIALS UPDATE (WITH RE-AUTHENTICATION)
  // ==========================================
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) return;

    setPasswordMessage(null);

    // Validation
    if (!currentPassword) {
      setPasswordMessage({
        type: "error",
        text: "Please enter your current password to verify your identity.",
      });
      return;
    }

    const passwordError = getPasswordValidationError(newPassword);
    if (passwordError) {
      setPasswordMessage({
        type: "error",
        text: passwordError,
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({
        type: "error",
        text: "New passwords do not match. Please re-enter.",
      });
      return;
    }

    setIsUpdatingPassword(true);

    try {
      // 1. Mandatory Re-authentication check
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (reauthError) {
        setPasswordMessage({
          type: "error",
          text: "Current password is incorrect. Identity verification failed.",
        });
        setIsUpdatingPassword(false);
        return;
      }

      // 2. Perform password update (Supabase Auth applies bcrypt hashing)
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw new Error(updateError.message);
      }

      // 3. Clear sensitive fields and show success
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage({
        type: "success",
        text: "Your security credentials have been updated successfully!",
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to update password.";
      setPasswordMessage({
        type: "error",
        text: msg,
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      {/* SECTION 1: AVATAR MANAGEMENT */}
      <div className="bg-brand-surface border border-neutral-800 rounded-2xl p-6 sm:p-8 flex flex-col gap-6 shadow-xl">
        <div className="border-b border-neutral-800/80 pb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Profile Avatar
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Upload a custom avatar picture. Supported formats: JPG, PNG, WebP
            (max 2 MB).
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Avatar Preview */}
          <div className="relative group shrink-0">
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-neutral-900 border-2 border-neutral-700 shadow-md">
              {avatarPreview ? (
                <Image
                  src={avatarPreview}
                  alt="Avatar Preview"
                  fill
                  sizes="112px"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-neutral-800 text-neutral-400">
                  <User className="w-10 h-10" />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex flex-col items-center justify-center text-white text-xs font-medium cursor-pointer"
            >
              <Upload className="w-5 h-5 mb-1" />
              <span>Browse</span>
            </button>
          </div>

          {/* Upload Controls */}
          <div className="flex flex-col items-start gap-3 w-full">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose Image
              </Button>

              {avatarFile && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleUploadAvatar}
                  disabled={isUploadingAvatar}
                  isLoading={isUploadingAvatar}
                >
                  {isUploadingAvatar ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Save Avatar</span>
                    </>
                  )}
                </Button>
              )}
            </div>

            {avatarFile && (
              <span className="text-xs text-brand-lime">
                Selected: {avatarFile.name} (
                {(avatarFile.size / 1024).toFixed(1)} KB)
              </span>
            )}

            {avatarMessage && (
              <div
                className={`flex items-center gap-2 text-xs px-3 py-2 rounded-xl w-full ${
                  avatarMessage.type === "success"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                    : "bg-red-500/10 text-red-400 border border-red-500/30"
                }`}
              >
                {avatarMessage.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{avatarMessage.text}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: PERSONAL INFO & CONTACT DETAILS */}
      <form
        onSubmit={handleSaveInfo}
        className="bg-brand-surface border border-neutral-800 rounded-2xl p-6 sm:p-8 flex flex-col gap-6 shadow-xl"
      >
        <div className="border-b border-neutral-800/80 pb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Contact & Personal Details
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Update your public username and primary account contact email.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Username */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="profile-username"
              className="text-xs font-semibold text-neutral-300 uppercase tracking-wider"
            >
              Username
            </label>
            <div className="relative">
              <input
                id="profile-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                maxLength={30}
                placeholder="Your username"
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-lime transition-colors"
              />
            </div>
            <span className="text-[11px] text-neutral-500">
              3–30 characters, alphanumeric & underscores only.
            </span>
          </div>

          {/* Email */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="profile-email"
              className="text-xs font-semibold text-neutral-300 uppercase tracking-wider"
            >
              Contact Email
            </label>
            <div className="relative">
              <input
                id="profile-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your.email@example.com"
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-lime transition-colors"
              />
            </div>
            <span className="text-[11px] text-neutral-500">
              Used for security alerts and sign-in authentication.
            </span>
          </div>
        </div>

        {infoMessage && (
          <div
            className={`flex items-start gap-2 text-xs px-3.5 py-2.5 rounded-xl ${
              infoMessage.type === "success"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                : infoMessage.type === "info"
                  ? "bg-blue-500/10 text-blue-300 border border-blue-500/30"
                  : "bg-red-500/10 text-red-400 border border-red-500/30"
            }`}
          >
            {infoMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span>{infoMessage.text}</span>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            size="md"
            disabled={isSavingInfo}
            isLoading={isSavingInfo}
          >
            {isSavingInfo ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Contact Details</span>
            )}
          </Button>
        </div>
      </form>

      {/* SECTION 3: SECURITY CREDENTIALS (PASSWORD CHANGE WITH RE-AUTH) */}
      <form
        onSubmit={handleUpdatePassword}
        className="bg-brand-surface border border-neutral-800 rounded-2xl p-6 sm:p-8 flex flex-col gap-6 shadow-xl"
      >
        <div className="border-b border-neutral-800/80 pb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Security Credentials
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Update your account password. For your security, entering your
            current password is required.
          </p>
        </div>

        <div className="flex flex-col gap-5 max-w-md">
          {/* Current Password */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="current-password"
              className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5"
            >
              Current Password
            </label>
            <input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              placeholder="••••••••••••"
              className="bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-lime transition-colors"
            />
          </div>

          {/* New Password */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="new-password"
              className="text-xs font-semibold text-neutral-300 uppercase tracking-wider"
            >
              New Password
            </label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              placeholder="••••••••••••"
              className="bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-lime transition-colors"
            />
            <span className="text-[11px] text-neutral-500">
              {PASSWORD_REQUIREMENTS_HINT}
            </span>
          </div>

          {/* Confirm New Password */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="confirm-password"
              className="text-xs font-semibold text-neutral-300 uppercase tracking-wider"
            >
              Confirm New Password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              placeholder="••••••••••••"
              className="bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-lime transition-colors"
            />
            <span className="text-[11px] text-neutral-500">
              Must match the new password above.
            </span>
          </div>
        </div>

        {passwordMessage && (
          <div
            className={`flex items-center gap-2 text-xs px-3.5 py-2.5 rounded-xl ${
              passwordMessage.type === "success"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                : "bg-red-500/10 text-red-400 border border-red-500/30"
            }`}
          >
            {passwordMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{passwordMessage.text}</span>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            size="md"
            disabled={isUpdatingPassword}
            isLoading={isUpdatingPassword}
          >
            {isUpdatingPassword ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying & Updating...</span>
              </>
            ) : (
              <span>Update Password</span>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
