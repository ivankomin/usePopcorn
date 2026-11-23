import { Suspense } from "react";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { fetchSystemLogs } from "@/lib/admin-queries";
import { SystemLogsContainer } from "@/components/admin";
import type { LogCategory, LogLevel } from "@/types/media";
import AdminLogsLoading from "./loading";

export const metadata = {
  title: "System Logs | usePopcorn Admin",
  description:
    "Inspect structured system logs and export audit files on usePopcorn.",
};

export const instant = false;

interface AdminLogsPageProps {
  searchParams: Promise<{
    level?: string;
    category?: string;
    search?: string;
    page?: string;
  }>;
}

async function AdminLogsContent({ searchParams }: AdminLogsPageProps) {
  await connection();
  await requireAdmin("/admin/logs");

  const resolvedParams = await searchParams;
  const levelParam = (resolvedParams.level as "all" | LogLevel) || "all";
  const categoryParam =
    (resolvedParams.category as "all" | LogCategory) || "all";
  const searchParam = resolvedParams.search || "";
  const pageParam = parseInt(resolvedParams.page || "1", 10) || 1;

  let logsData = {
    logs: [] as Awaited<ReturnType<typeof fetchSystemLogs>>["logs"],
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 1,
    levelCounts: { all: 0, info: 0, warn: 0, error: 0, critical: 0 },
  };

  try {
    logsData = await fetchSystemLogs({
      level: levelParam,
      category: categoryParam,
      search: searchParam,
      page: pageParam,
      pageSize: 20,
    });
  } catch {
    // Render empty state gracefully if query fails
  }

  return (
    <div className="max-w-5xl mx-auto">
      <SystemLogsContainer
        initialLogs={logsData.logs}
        initialTotal={logsData.total}
        initialLevelCounts={logsData.levelCounts}
        initialPage={logsData.page}
        initialPageSize={logsData.pageSize}
      />
    </div>
  );
}

export default async function AdminLogsPage({
  searchParams,
}: AdminLogsPageProps) {
  await connection();
  return (
    <div className="min-h-screen bg-[#0f0f0f] py-8 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={<AdminLogsLoading />}>
        <AdminLogsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
