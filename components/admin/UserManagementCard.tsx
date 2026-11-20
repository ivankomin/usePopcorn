"use client";

import { useState } from "react";
import Image from "next/image";
import {
  User,
  Mail,
  Calendar,
  Clock,
  MessageSquare,
  Bookmark,
  CheckCircle2,
  Ban,
  ShieldCheck,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { ProfileRoleBadge } from "@/components/profile/ProfileRoleBadge";
import type { ManagedUserItem } from "@/types/media";

export interface UserManagementCardProps {
  user: ManagedUserItem;
  currentAdminId: string;
  onToggleBlock: (
    userId: string,
    shouldBlock: boolean,
    reason?: string,
  ) => Promise<void>;
}

export function UserManagementCard({
  user,
  currentAdminId,
  onToggleBlock,
}: UserManagementCardProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConfirmingBlock, setIsConfirmingBlock] = useState(false);
  const [reason, setReason] = useState("");

  const isSelf = user.id === currentAdminId;
  const isAdmin = user.role === "admin";
  const canModerate = !isSelf && !isAdmin;

  const handleConfirmBlock = async () => {
    setIsProcessing(true);
    try {
      await onToggleBlock(user.id, true, reason.trim() || undefined);
      setIsConfirmingBlock(false);
      setReason("");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnblock = async () => {
    setIsProcessing(true);
    try {
      await onToggleBlock(user.id, false);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-brand-surface border border-neutral-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col gap-4 transition-all">
      {/* Top Row: User Identity & Account Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-neutral-800/80">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-full overflow-hidden bg-neutral-800 border border-neutral-700 relative shrink-0 flex items-center justify-center">
            {user.avatar_url ? (
              <Image
                src={user.avatar_url}
                alt={user.username}
                fill
                sizes="44px"
                className="object-cover"
                unoptimized
              />
            ) : (
              <User className="w-5 h-5 text-neutral-400" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-white text-sm sm:text-base truncate">
                {user.username}
              </span>
              <ProfileRoleBadge role={user.role} />
              {isSelf && (
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700">
                  You
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-neutral-400">
              {user.email && (
                <span className="inline-flex items-center gap-1.5 truncate">
                  <Mail className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 font-mono">
                <Calendar className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                <span>
                  Joined {new Date(user.created_at).toLocaleDateString()}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2 shrink-0">
          {user.is_blocked ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold font-mono text-rose-400 border border-rose-500/40 bg-rose-500/10">
              <Ban className="w-3.5 h-3.5" />
              Blocked
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold font-mono text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Active
            </span>
          )}
        </div>
      </div>

      {/* Activity Summary & Block Reason */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-300">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900/80 border border-neutral-800">
            <MessageSquare className="w-3.5 h-3.5 text-brand-lime" />
            <span className="font-mono font-semibold text-white">
              {user.reviews_count}
            </span>
            <span className="text-neutral-400">
              {user.reviews_count === 1 ? "review" : "reviews"}
            </span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900/80 border border-neutral-800">
            <Bookmark className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-mono font-semibold text-white">
              {user.watchlist_count}
            </span>
            <span className="text-neutral-400">watchlist</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900/80 border border-neutral-800 text-neutral-400">
            <Clock className="w-3.5 h-3.5 text-neutral-500" />
            <span>
              Last sign-in:{" "}
              <span className="text-neutral-300 font-mono">
                {user.last_sign_in_at
                  ? new Date(user.last_sign_in_at).toLocaleDateString()
                  : "Never"}
              </span>
            </span>
          </div>
        </div>

        {user.is_blocked && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-950/25 border border-rose-500/30 text-xs text-rose-200">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold text-rose-300">
                Blocked{user.blocked_at ? ` on ${new Date(user.blocked_at).toLocaleString()}` : ""}
              </p>
              <p className="text-rose-200/90">
                Reason: {user.blocked_reason || "Violation of platform rules"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Actions Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-neutral-800/80">
        {!canModerate ? (
          <div className="inline-flex items-center gap-1.5 text-xs text-neutral-500">
            <ShieldCheck className="w-3.5 h-3.5 text-neutral-500" />
            <span>
              {isSelf
                ? "Current administrator session"
                : "Administrator accounts are protected from blocking"}
            </span>
          </div>
        ) : isProcessing ? (
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 px-2 py-1 font-mono">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-lime" />
            <span>Updating user status...</span>
          </div>
        ) : isConfirmingBlock ? (
          <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={250}
              placeholder="Reason for blocking (optional, e.g., Spam / abusive reviews)"
              className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-400 transition-colors"
            />
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleConfirmBlock}
                className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Confirm Block
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsConfirmingBlock(false);
                  setReason("");
                }}
                className="px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : user.is_blocked ? (
          <button
            type="button"
            onClick={handleUnblock}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Unblock User</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsConfirmingBlock(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-rose-900/40 text-neutral-300 hover:text-rose-300 border border-neutral-700/60 hover:border-rose-500/40 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Ban className="w-3.5 h-3.5" />
            <span>Block User</span>
          </button>
        )}
      </div>
    </div>
  );
}
