"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { deleteUserAccountAction } from "@/app/actions/profile";
import { SettingsMessage, type SettingsMessageData } from "./SettingsMessage";

export function ProfileDangerZone() {
  const router = useRouter();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [confirmationText, setConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<SettingsMessageData | null>(null);

  const isConfirmed =
    currentPassword.length > 0 && confirmationText.trim() === "DELETE";

  const handleOpenConfirm = () => {
    setIsConfirmOpen(true);
    setMessage(null);
  };

  const handleCancel = () => {
    setIsConfirmOpen(false);
    setCurrentPassword("");
    setConfirmationText("");
    setMessage(null);
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (confirmationText.trim() !== "DELETE") {
      setMessage({
        type: "error",
        text: 'Please type "DELETE" to confirm permanent account deletion.',
      });
      return;
    }

    if (!currentPassword) {
      setMessage({
        type: "error",
        text: "Please enter your current password to verify your identity.",
      });
      return;
    }

    setIsDeleting(true);

    try {
      const result = await deleteUserAccountAction({
        currentPassword,
        confirmationText: confirmationText.trim(),
      });

      if (!result.success) {
        setMessage({
          type: "error",
          text: result.error || "Failed to delete account.",
        });
        setIsDeleting(false);
        return;
      }

      // Clear local client auth state so providers reset immediately
      try {
        const supabase = createClient();
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        // Session is already invalidated server-side
      }

      router.replace("/");
      router.refresh();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while deleting your account.";
      setMessage({ type: "error", text: msg });
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-brand-surface border border-rose-500/30 rounded-2xl p-6 sm:p-8 flex flex-col gap-6 shadow-xl">
      <h2 className="text-xl font-bold text-white flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
        <span>Danger Zone</span>
      </h2>
      <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
        Permanently close your account and erase all personal data, including
        your profile, email address, uploaded avatar, personal watchlist, and
        written review text. Anonymized numeric ratings are retained solely to
        preserve aggregate catalog statistics.
      </p>

      {!isConfirmOpen ? (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">Delete Account</p>
            <p className="text-xs text-neutral-400">
              This action is permanent and cannot be undone.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenConfirm}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md border-2 border-rose-500/60 text-rose-300 hover:bg-rose-600 hover:border-rose-600 hover:text-white font-semibold text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 cursor-pointer shrink-0"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Account</span>
          </button>
        </div>
      ) : (
        <form onSubmit={handleDeleteAccount} className="flex flex-col gap-5">
          <div className="flex flex-col gap-5 max-w-md">
            {/* Current Password Verification */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="delete-account-password"
                className="text-xs font-semibold text-neutral-300 uppercase tracking-wider"
              >
                Current Password
              </label>
              <input
                id="delete-account-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                disabled={isDeleting}
                placeholder="••••••••••••"
                autoComplete="current-password"
                className="bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500 transition-colors disabled:opacity-50"
              />
            </div>

            {/* Explicit Text Confirmation */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="delete-account-confirm"
                className="text-xs font-semibold text-neutral-300 uppercase tracking-wider"
              >
                Type <span className="text-rose-400 font-mono">DELETE</span> to
                confirm
              </label>
              <input
                id="delete-account-confirm"
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                required
                disabled={isDeleting}
                placeholder="DELETE"
                autoComplete="off"
                className="bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-rose-500 transition-colors disabled:opacity-50"
              />
            </div>
          </div>

          <SettingsMessage message={message} />

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isDeleting}
              className="px-5 py-2.5 rounded-md border border-neutral-700 text-neutral-300 hover:text-white hover:border-neutral-500 font-semibold text-xs sm:text-sm uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!isConfirmed || isDeleting}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-md border-2 border-rose-500 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Deleting Account...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Permanently Delete</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
