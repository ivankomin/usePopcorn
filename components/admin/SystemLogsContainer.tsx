"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Download,
  Flame,
  Info,
  ListFilter,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import { AdminNavTabs } from "./AdminNavTabs";
import { getSystemLogsAction } from "@/app/actions/admin";
import type {
  LogCategory,
  LogLevel,
  SystemLogItem,
  SystemLogLevelCounts,
} from "@/types/media";

export interface SystemLogsContainerProps {
  initialLogs: SystemLogItem[];
  initialTotal: number;
  initialLevelCounts: SystemLogLevelCounts;
  initialPage?: number;
  initialPageSize?: number;
}

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

export function SystemLogsContainer({
  initialLogs,
  initialTotal,
  initialLevelCounts,
  initialPage = 1,
  initialPageSize = 20,
}: SystemLogsContainerProps) {
  const [logs, setLogs] = useState<SystemLogItem[]>(initialLogs);
  const [levelCounts, setLevelCounts] =
    useState<SystemLogLevelCounts>(initialLevelCounts);
  const [total, setTotal] = useState<number>(initialTotal);
  const [page, setPage] = useState<number>(initialPage);
  const [pageSize] = useState<number>(initialPageSize);

  const [levelFilter, setLevelFilter] = useState<"all" | LogLevel>("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | LogCategory>(
    "all",
  );
  const [search, setSearch] = useState("");
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const fetchLogs = (
    targetPage: number,
    targetLevel: "all" | LogLevel = levelFilter,
    targetCategory: "all" | LogCategory = categoryFilter,
    targetSearch: string = search,
  ) => {
    setErrorMessage(null);
    startTransition(async () => {
      const logsRes = await getSystemLogsAction({
        page: targetPage,
        pageSize,
        level: targetLevel,
        category: targetCategory,
        search: targetSearch,
      });

      if (logsRes.success && logsRes.data) {
        setLogs(logsRes.data.logs);
        setTotal(logsRes.data.total);
        setPage(logsRes.data.page);
        setLevelCounts(logsRes.data.levelCounts);
      } else {
        setErrorMessage(logsRes.error || "Failed to load system logs.");
      }
    });
  };

  const handleLevelChange = (newLevel: "all" | LogLevel) => {
    setLevelFilter(newLevel);
    fetchLogs(1, newLevel, categoryFilter, search);
  };

  const handleCategoryChange = (newCategory: "all" | LogCategory) => {
    setCategoryFilter(newCategory);
    fetchLogs(1, levelFilter, newCategory, search);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(1, levelFilter, categoryFilter, search);
  };

  const handleRefresh = () => {
    fetchLogs(page, levelFilter, categoryFilter, search);
  };

  const toggleExpanded = (id: string) => {
    setExpandedLogIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const buildExportUrl = () => {
    const params = new URLSearchParams();
    if (levelFilter !== "all") params.set("level", levelFilter);
    if (categoryFilter !== "all") params.set("category", categoryFilter);
    if (search.trim()) params.set("search", search.trim());
    const qs = params.toString();
    return qs ? `/api/admin/logs/export?${qs}` : "/api/admin/logs/export";
  };

  return (
    <div className="space-y-6">
      {/* Admin Navigation Tabs */}
      <AdminNavTabs />

      {/* Page Header & Export Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            System Logs
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-neutral-900 border border-neutral-700/80 text-neutral-200 hover:text-white hover:border-neutral-500 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isPending ? "animate-spin text-brand-lime" : ""}`}
            />
            <span>Refresh</span>
          </button>

          <a
            href={buildExportUrl()}
            download
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-brand-lime text-black hover:bg-brand-lime/90 transition-colors"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.3]" />
            <span>Download .log</span>
          </a>
        </div>
      </div>

      {/* Filters & Search Card */}
      <div className="bg-brand-surface border border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        {/* Level Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-neutral-800/80">
          <button
            type="button"
            onClick={() => handleLevelChange("all")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              levelFilter === "all"
                ? "text-white bg-neutral-800/70"
                : "text-neutral-400 hover:text-white hover:bg-neutral-900"
            }`}
          >
            <span>All Logs</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-neutral-900 text-neutral-300">
              {levelCounts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleLevelChange("info")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              levelFilter === "info"
                ? "text-sky-300 bg-neutral-800/70"
                : "text-neutral-400 hover:text-sky-300 hover:bg-neutral-900"
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>Info</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-neutral-900 text-sky-400">
              {levelCounts.info}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleLevelChange("warn")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              levelFilter === "warn"
                ? "text-amber-300 bg-neutral-800/70"
                : "text-neutral-400 hover:text-amber-300 hover:bg-neutral-900"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Warn</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-neutral-900 text-amber-400">
              {levelCounts.warn}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleLevelChange("error")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              levelFilter === "error"
                ? "text-rose-300 bg-neutral-800/70"
                : "text-neutral-400 hover:text-rose-300 hover:bg-neutral-900"
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Error</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-neutral-900 text-rose-400 font-bold">
              {levelCounts.error}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleLevelChange("critical")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              levelFilter === "critical"
                ? "text-red-300 bg-neutral-800/70"
                : "text-neutral-400 hover:text-red-300 hover:bg-neutral-900"
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Critical</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-neutral-900 text-red-400 font-bold">
              {levelCounts.critical}
            </span>
          </button>
        </div>

        {/* Search & Category Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <form
            onSubmit={handleSearchSubmit}
            className="relative w-full sm:w-80"
          >
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search message or action key..."
              className="w-full bg-neutral-900 border border-neutral-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-brand-lime transition-colors"
            />
          </form>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <ListFilter className="w-4 h-4 text-neutral-400" />
            <span className="text-xs text-neutral-400">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) =>
                handleCategoryChange(e.target.value as "all" | LogCategory)
              }
              className="bg-neutral-900 border border-neutral-700/80 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-lime transition-colors cursor-pointer"
            >
              <option value="all">All categories</option>
              <option value="system">System</option>
              <option value="auth">Auth &amp; Sessions</option>
              <option value="admin">Admin Actions</option>
              <option value="db">Database</option>
              <option value="sync">TMDB Sync</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl text-xs flex items-center justify-between gap-3 border bg-rose-950/20 border-rose-500/30 text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-neutral-300 hover:text-white font-mono cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Logs List */}
      {isPending ? (
        <div className="flex flex-col items-center justify-center py-16 text-neutral-400 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-brand-lime" />
          <span className="text-xs font-mono">Loading system logs...</span>
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-brand-surface border border-neutral-800 rounded-2xl p-12 text-center text-xs text-neutral-400 space-y-2">
          <p className="text-sm font-semibold text-white">No logs recorded</p>
        </div>
      ) : (
        <div className="bg-brand-surface border border-neutral-800 rounded-2xl overflow-hidden divide-y divide-neutral-800/80 shadow-xl">
          {logs.map((entry) => {
            const levelMeta = LEVEL_STYLES[entry.level] ?? LEVEL_STYLES.info;
            const hasMeta =
              entry.metadata &&
              typeof entry.metadata === "object" &&
              !Array.isArray(entry.metadata) &&
              Object.keys(entry.metadata).length > 0;
            const isExpanded = expandedLogIds.has(entry.id);
            const actorName = entry.actor?.username
              ? entry.actor.username
              : entry.actor_id
                ? entry.actor_id.slice(0, 8)
                : "system";

            return (
              <div
                key={entry.id}
                className="p-4 hover:bg-neutral-900/40 transition-colors space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${levelMeta.badge}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${levelMeta.dot}`}
                      />
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
                    <span title={entry.created_at}>
                      {formatTimestamp(entry.created_at)}
                    </span>
                  </div>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed">
                    {entry.message}
                  </p>

                  {hasMeta && (
                    <button
                      type="button"
                      onClick={() => toggleExpanded(entry.id)}
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
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-neutral-800 text-xs text-neutral-400">
          <span>
            Showing page <strong>{page}</strong> of{" "}
            <strong>{totalPages}</strong> ({total} matching entries)
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || isPending}
              onClick={() => fetchLogs(page - 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 hover:border-neutral-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <button
              type="button"
              disabled={page >= totalPages || isPending}
              onClick={() => fetchLogs(page + 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 hover:border-neutral-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
