"use client";

import Image from "next/image";
import { Mail, Calendar } from "lucide-react";
import type { ProfileRow } from "@/types/media";
import { formatDate } from "@/lib/utils";
import { ProfileRoleBadge } from "./ProfileRoleBadge";

export interface ProfileHeaderProps {
  profile: ProfileRow | null;
  userEmail?: string | null;
  userCreatedAt?: string | null;
}

export function ProfileHeader({
  profile,
  userEmail,
  userCreatedAt,
}: ProfileHeaderProps) {
  const username =
    profile?.username || userEmail?.split("@")[0] || "Popcorn Enthusiast";
  const avatarUrl = profile?.avatar_url;
  const initial = username.charAt(0).toUpperCase();
  const joinedDate = formatDate(profile?.created_at || userCreatedAt);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-brand-surface border border-neutral-800 p-6 sm:p-8 shadow-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
        {/* Avatar frame */}
        <div className="relative shrink-0">
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-neutral-900 border-2 border-neutral-800 shadow-lg">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={username}
                fill
                sizes="(max-width: 640px) 96px, 112px"
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-neutral-800 text-brand-lime font-bold text-3xl select-none">
                {initial}
              </div>
            )}
          </div>
        </div>

        {/* User Text Info */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {username}
            </h1>
            <ProfileRoleBadge role={profile?.role} />
          </div>

          <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs sm:text-sm text-neutral-400">
            {userEmail && (
              <div className="flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-neutral-500" />
                <span>{userEmail}</span>
              </div>
            )}
            {joinedDate && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-neutral-500" />
                <span>Member since {joinedDate}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
