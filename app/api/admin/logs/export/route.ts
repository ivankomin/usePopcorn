import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAdminSession } from "@/lib/auth/admin";
import { buildSystemLogsQuery } from "@/lib/admin-queries";
import {
  formatStructuredLogDocument,
  logSystemEvent,
} from "@/lib/logger";
import type { LogCategory, LogLevel, SystemLogItem } from "@/types/media";

/**
 * Admin-only endpoint that exports structured system logs as a `.log` file.
 * Supports optional query params: `level`, `category`, `search`.
 */
export async function GET(request: NextRequest) {
  const auth = await verifyAdminSession();

  if (!auth.user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  if (!auth.isAdmin) {
    return NextResponse.json(
      { error: "Administrator privileges required" },
      { status: 403 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const levelParam = (searchParams.get("level") || "all").toLowerCase() as
    | "all"
    | LogLevel;
  const categoryParam = (
    searchParams.get("category") || "all"
  ).toLowerCase() as "all" | LogCategory;
  const searchParam = (searchParams.get("search") || "").trim();

  const adminClient = createAdminClient();
  const query = buildSystemLogsQuery(adminClient, {
    level: levelParam,
    category: categoryParam,
    search: searchParam,
  }).limit(2000);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: `Failed to export logs: ${error.message}` },
      { status: 500 }
    );
  }

  const entries = (data as unknown as SystemLogItem[]) || [];
  const documentText = formatStructuredLogDocument(entries, {
    exportedBy: auth.username || auth.user.email || auth.user.id,
  });

  await logSystemEvent({
    level: "info",
    category: "admin",
    action: "admin.logs_exported",
    message: `Exported ${entries.length} structured system log entries as .log.`,
    actorId: auth.user.id,
    metadata: {
      count: entries.length,
      levelFilter: levelParam,
      categoryFilter: categoryParam,
      hasSearch: Boolean(searchParam),
    },
  });

  const dateStamp = new Date().toISOString().slice(0, 10);
  const fileName = `usepopcorn-logs-${dateStamp}.log`;

  return new Response(documentText, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
