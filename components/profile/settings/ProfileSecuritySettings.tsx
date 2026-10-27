"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import Button from "@/components/Button";
import { SettingsMessage, type SettingsMessageData } from "./SettingsMessage";
import {
  getPasswordValidationError,
  PASSWORD_REQUIREMENTS_HINT,
} from "@/lib/validation";

export interface ProfileSecuritySettingsProps {
  userEmail?: string | null;
}

export function ProfileSecuritySettings({
  userEmail,
}: ProfileSecuritySettingsProps) {
  const { user, email: currentEmail, updatePassword } = useProfile();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<SettingsMessageData | null>(null);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = currentEmail || user?.email || userEmail;
    if (!targetEmail) return;

    setPasswordMessage(null);

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
      await updatePassword({
        currentPassword,
        newPassword,
      });

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
    <form
      onSubmit={handleUpdatePassword}
      className="bg-brand-surface border border-neutral-800 rounded-2xl p-6 sm:p-8 flex flex-col gap-6 shadow-xl"
    >
      <div className="border-b border-neutral-800/80 pb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          Security Credentials
        </h2>
        <p className="text-xs text-neutral-400 mt-1">
          Update your account password. For your security, entering your current
          password is required.
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

      <SettingsMessage message={passwordMessage} />

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
  );
}
