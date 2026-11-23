"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Download,
  Flame,
  Info,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { AdminNavTabs } from "./AdminNavTabs";
import { AdminPagination } from "./AdminPagination";
import {
  AdminFilterBar,
  type AdminFilterTab,
  type AdminSelectOption,
} from "./AdminFilterBar";
import { AdminFeedbackBanner } from "./AdminFeedbackBanner";
import { SystemLogRow } from "./SystemLogRow";
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

const LOG_CATEGORY_OPTIONS: AdminSelectOption<"all" | LogCategory>[] = [
  { value: "all", label: "All categories" },
  { value: "system", label: "System" },
  { value: "auth", label: "Auth & Sessions" },
  { value: "admin", label: "Admin Actions" },
  { value: "db", label: "Database" },
  { value: "sync", label: "TMDB Sync" },
];

export function SystemLogsContainer({
  initialLogs,
  initialTotal,
  initialLevelCounts,
  initialPage = 1,
  initialPageSize = 20,
}: SystemLogsContainerProps) {
  const pageSize = initialPageSize;
  const [logs, setLogs] = useState<SystemLogItem[]>(initialLogs);
  const [levelCounts, setLevelCounts] =
    useState<SystemLogLevelCounts>(initialLevelCounts);
  const [total, setTotal] = useState<number>(initialTotal);
  const [page, setPage] = useState<number>(initialPage);

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

  const levelTabs: AdminFilterTab<"all" | LogLevel>[] = [
    {
      value: "all",
      label: "All Logs",
      count: levelCounts.all,
      activeClassName: "text-white bg-neutral-800/70",
      inactiveClassName: "text-neutral-400 hover:text-white hover:bg-neutral-900",
      badgeClassName: "text-neutral-300",
    },
    {
      value: "info",
      label: "Info",
      count: levelCounts.info,
      icon: Info,
      activeClassName: "text-sky-300 bg-neutral-800/70",
      inactiveClassName:
        "text-neutral-400 hover:text-sky-300 hover:bg-neutral-900",
      badgeClassName: "text-sky-400",
    },
    {
      value: "warn",
      label: "Warn",
      count: levelCounts.warn,
      icon: AlertTriangle,
      activeClassName: "text-amber-300 bg-neutral-800/70",
      inactiveClassName:
        "text-neutral-400 hover:text-amber-300 hover:bg-neutral-900",
      badgeClassName: "text-amber-400",
    },
    {
      value: "error",
      label: "Error",
      count: levelCounts.error,
      icon: AlertCircle,
      activeClassName: "text-rose-300 bg-neutral-800/70",
      inactiveClassName:
        "text-neutral-400 hover:text-rose-300 hover:bg-neutral-900",
      badgeClassName: "text-rose-400 font-bold",
    },
    {
      value: "critical",
      label: "Critical",
      count: levelCounts.critical,
      icon: Flame,
      activeClassName: "text-red-300 bg-neutral-800/70",
      inactiveClassName:
        "text-neutral-400 hover:text-red-300 hover:bg-neutral-900",
      badgeClassName: "text-red-400 font-bold",
    },
  ];

  return (
    <div className="space-y-6">
      <AdminNavTabs />

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

      <AdminFilterBar
        tabs={levelTabs}
        activeTab={levelFilter}
        onTabChange={handleLevelChange}
        search={search}
        onSearchChange={setSearch}
        onSearchSubmit={handleSearchSubmit}
        searchPlaceholder="Search message or action key..."
        selectLabel="Category:"
        selectValue={categoryFilter}
        selectOptions={LOG_CATEGORY_OPTIONS}
        onSelectChange={handleCategoryChange}
      />

      <AdminFeedbackBanner
        feedback={
          errorMessage ? { type: "error", message: errorMessage } : null
        }
        onDismiss={() => setErrorMessage(null)}
        variant="bordered"
      />

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
          {logs.map((entry) => (
            <SystemLogRow
              key={entry.id}
              entry={entry}
              isExpanded={expandedLogIds.has(entry.id)}
              onToggleExpand={toggleExpanded}
            />
          ))}
        </div>
      )}

      <AdminPagination
        page={page}
        totalPages={totalPages}
        total={total}
        itemLabel="matching entries"
        isPending={isPending}
        onPageChange={(nextPage) => fetchLogs(nextPage)}
      />
    </div>
  );
}
