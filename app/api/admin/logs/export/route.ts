import { NextResponse, type NextRequest } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  formatStructuredLogDocument,
  logSystemEvent,
} from "@/lib/logger";
import type { LogCategory, LogLevel, SystemLogItem } from "@/types/media";

const VALID_LEVELS = new Set<LogLevel>(["info", "warn", "error", "critical"]);
const VALID_CATEGORIES = new Set<LogCategory>([
  "system",
  "auth",
  "admin",
  "db",
  "sync",
]);

/**
 * Admin-only endpoint that exports structured system logs as a `.log` file.
 * Supports optional query params: `level`, `category`, `search`.
 */
export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return NextResponse.json(
      { error: "Administrator privileges required" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const levelParam = (searchParams.get("level") || "all").toLowerCase();
  const categoryParam = (searchParams.get("category") || "all").toLowerCase();
  const searchParam = (searchParams.get("search") || "").trim();

  const adminClient = createAdminClient();
  let query = adminClient
    .from("system_logs")
    .select(
      `
      id,
      created_at,
      level,
      category,
      action,
      message,
      actor_id,
      metadata,
      actor:profiles!system_logs_actor_id_fkey(
        id,
        username,
        role
      )
    `
    )
    .order("created_at", { ascending: false })
    .limit(2000);

  if (VALID_LEVELS.has(levelParam as LogLevel)) {
    query = query.eq("level", levelParam);
  }

  if (VALID_CATEGORIES.has(categoryParam as LogCategory)) {
    query = query.eq("category", categoryParam);
  }

  if (searchParam) {
    const escaped = searchParam.replace(/[%_,]/g, "");
    if (escaped) {
      query = query.or(
        `message.ilike.%${escaped}%,action.ilike.%${escaped}%`
      );
    }
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: `Failed to export logs: ${error.message}` },
      { status: 500 }
    );
  }

  const entries = (data as unknown as SystemLogItem[]) || [];
  const documentText = formatStructuredLogDocument(entries, {
    exportedBy: profile.username || user.email || user.id,
  });

  await logSystemEvent({
    level: "info",
    category: "admin",
    action: "admin.logs_exported",
    message: `Exported ${entries.length} structured system log entries as .log.`,
    actorId: user.id,
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
