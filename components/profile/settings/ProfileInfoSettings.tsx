"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import type { ProfileRow } from "@/types/media";
import { useProfile } from "@/hooks/useProfile";
import Button from "@/components/Button";

export interface ProfileInfoSettingsProps {
  profile?: ProfileRow | null;
  userEmail?: string | null;
}

export function ProfileInfoSettings({
  profile,
  userEmail,
}: ProfileInfoSettingsProps) {
  const {
    user,
    username: currentUsername,
    email: currentEmail,
    updateInfo,
  } = useProfile();

  const [username, setUsername] = useState(
    currentUsername || profile?.username || "",
  );
  const [email, setEmail] = useState(currentEmail || userEmail || "");
  const [isSavingInfo, setIsSavingInfo] = useState(false);
  const [infoMessage, setInfoMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

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
      const { emailChanged } = await updateInfo({
        username: trimmedUsername,
        email: trimmedEmail,
      });

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

  return (
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
  );
}
