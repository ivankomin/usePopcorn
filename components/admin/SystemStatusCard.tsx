"use client";

import { useState } from "react";
import { Activity, Lock, Unlock, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import Button from "@/components/Button";
import { setSystemStateAction } from "@/app/actions/admin";

export interface SystemStatusCardProps {
  status: "Free" | "Updating";
  message?: string | null;
  updatedAt?: string | null;
  onStatusChange?: (newStatus: "Free" | "Updating") => void;
}

export function SystemStatusCard({
  status: currentStatus,
  message,
  updatedAt,
  onStatusChange,
}: SystemStatusCardProps) {
  const [status, setStatus] = useState<"Free" | "Updating">(currentStatus);
  const [isUpdating, setIsUpdating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const isFree = status === "Free";

  const handleToggleState = async () => {
    setIsUpdating(true);
    setFeedback(null);
    const targetStatus: "Free" | "Updating" = isFree ? "Updating" : "Free";
    const statusNote =
      targetStatus === "Updating"
        ? "Background synchronization active. Manual ingestion locked."
        : "System operational. Ingestion unlocked.";

    const res = await setSystemStateAction(targetStatus, statusNote);
    setIsUpdating(false);

    if (res.success) {
      setStatus(targetStatus);
      onStatusChange?.(targetStatus);
      setFeedback(`System status switched to ${targetStatus}`);
    } else {
      setFeedback(`Error: ${res.error}`);
    }
  };

  return (
    <div className="bg-brand-surface border border-neutral-800 rounded-2xl p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-neutral-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-neutral-900 border border-neutral-700/60">
            <Activity className="w-5 h-5 text-brand-lime" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              System Synchronization State
            </h2>
          </div>
        </div>

        {/* Status Pill Indicator */}
        <div className="flex items-center gap-2">
          {isFree ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-emerald-400 text-xs font-medium font-mono">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Status: Free</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-amber-400 text-xs font-medium font-mono">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Status: Updating</span>
            </div>
          )}
        </div>
      </div>

      {/* Description & Action */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs">
        <div className="space-y-1">
          <p className="text-neutral-300">
            {isFree ? (
              <span className="text-emerald-300">
                System is available for manual movie ingestion and catalog adjustments.
              </span>
            ) : (
              <span className="text-amber-300 font-medium">
                System is updating. Ingestion is locked (&quot;Try again later&quot; constraint active).
              </span>
            )}
          </p>
          {message && <p className="text-neutral-400 font-mono text-[11px]">{message}</p>}
          {updatedAt && (
            <p className="text-neutral-500 text-[11px]">
              Last updated: {new Date(updatedAt).toLocaleString()}
            </p>
          )}
        </div>

        <div className="shrink-0 flex items-center gap-3">
          <Button
            type="button"
            size="sm"
            onClick={handleToggleState}
            disabled={isUpdating}
            className="text-xs font-medium"
          >
            {isUpdating ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
            ) : isFree ? (
              <Lock className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
            ) : (
              <Unlock className="w-3.5 h-3.5 mr-1.5 text-brand-lime" />
            )}
            {isFree ? "Simulate Sync Lock (Set Updating)" : "Unlock System (Set Free)"}
          </Button>
        </div>
      </div>

      {feedback && (
        <p className="mt-3 text-xs text-brand-lime font-mono">
          {feedback}
        </p>
      )}
    </div>
  );
}
