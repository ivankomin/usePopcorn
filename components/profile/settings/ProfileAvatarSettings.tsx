"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Upload, User, Loader2 } from "lucide-react";
import type { ProfileRow } from "@/types/media";
import { useProfile } from "@/hooks/useProfile";
import Button from "@/components/Button";
import { SettingsMessage, type SettingsMessageData } from "./SettingsMessage";

export interface ProfileAvatarSettingsProps {
  profile?: ProfileRow | null;
}

export function ProfileAvatarSettings({ profile }: ProfileAvatarSettingsProps) {
  const { user, avatarUrl, updateAvatar } = useProfile();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    avatarUrl || profile?.avatar_url || null,
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState<SettingsMessageData | null>(null);

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

    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile || !user) return;

    setIsUploadingAvatar(true);
    setAvatarMessage(null);

    try {
      const { publicUrl } = await updateAvatar(avatarFile);
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

  return (
    <div className="bg-brand-surface border border-neutral-800 rounded-2xl p-6 sm:p-8 flex flex-col gap-6 shadow-xl">
      <div className="border-b border-neutral-800/80 pb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          Profile Avatar
        </h2>
        <p className="text-xs text-neutral-400 mt-1">
          Upload a custom avatar picture. Supported formats: JPG, PNG, WebP (max
          2 MB).
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
              Selected: {avatarFile.name} ({(avatarFile.size / 1024).toFixed(1)}{" "}
              KB)
            </span>
          )}

          <SettingsMessage message={avatarMessage} className="w-full px-3 py-2" />
        </div>
      </div>
    </div>
  );
}
