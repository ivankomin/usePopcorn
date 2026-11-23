"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import type { LogCategory, LogLevel, SystemLogItem } from "@/types/media";

const LEVEL_STYLES: Record<
  LogLevel,
  { badge: string; dot: string; label: string }
> = {
  info: {
    badge: "bg-sky-500/10 text-sky-300 border-sky-500/30",
    dot: "bg-sky-400",
    label: "INFO",
  },
  warn: {
    badge: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    dot: "bg-amber-400",
    label: "WARN",
  },
  error: {
    badge: "bg-rose-500/10 text-rose-300 border-rose-500/30",
    dot: "bg-rose-400",
    label: "ERROR",
  },
  critical: {
    badge: "bg-red-600/20 text-red-300 border-red-500/50",
    dot: "bg-red-500",
    label: "CRITICAL",
  },
};

const CATEGORY_LABELS: Record<LogCategory, string> = {
  system: "System",
  auth: "Auth",
  admin: "Admin",
  db: "DB",
  sync: "Sync",
};

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return iso;
  }
}

export interface SystemLogRowProps {
  entry: SystemLogItem;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
}

export function SystemLogRow({
  entry,
  isExpanded,
  onToggleExpand,
}: SystemLogRowProps) {
  const levelMeta = LEVEL_STYLES[entry.level] ?? LEVEL_STYLES.info;
  const hasMeta =
    entry.metadata &&
    typeof entry.metadata === "object" &&
    !Array.isArray(entry.metadata) &&
    Object.keys(entry.metadata).length > 0;
  const actorName = entry.actor?.username
    ? entry.actor.username
    : entry.actor_id
      ? entry.actor_id.slice(0, 8)
      : "system";

  return (
    <div className="p-4 hover:bg-neutral-900/40 transition-colors space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${levelMeta.badge}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${levelMeta.dot}`} />
            {levelMeta.label}
          </span>

          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-neutral-900 border border-neutral-700/80 text-neutral-300">
            {CATEGORY_LABELS[entry.category] ?? entry.category}
          </span>

          <code className="text-[11px] font-mono text-brand-lime/90 bg-neutral-900/80 px-2 py-0.5 rounded-md">
            {entry.action}
          </code>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-neutral-400 font-mono">
          <span>
            actor:{" "}
            <strong className="text-neutral-200 font-medium">
              {actorName}
            </strong>
          </span>
          <span title={entry.created_at}>{formatTimestamp(entry.created_at)}</span>
        </div>
      </div>

      <div className="flex items-start justify-between gap-3">
        <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed">
          {entry.message}
        </p>

        {hasMeta && (
          <button
            type="button"
            onClick={() => onToggleExpand(entry.id)}
            className="inline-flex items-center gap-1 shrink-0 text-[11px] font-mono text-neutral-400 hover:text-brand-lime transition-colors cursor-pointer"
          >
            <span>{isExpanded ? "Hide JSON" : "Details"}</span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>

      {hasMeta && isExpanded && (
        <pre className="mt-2 p-3 rounded-xl bg-black/60 border border-neutral-800 text-[11px] font-mono text-neutral-300 overflow-x-auto">
          {JSON.stringify(entry.metadata, null, 2)}
        </pre>
      )}
    </div>
  );
}
