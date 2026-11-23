import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database.types";
import type { LogCategory, LogLevel, SystemLogItem } from "@/types/media";

export interface SystemLogInput {
  level: LogLevel;
  category: LogCategory;
  action: string;
  message: string;
  actorId?: string | null;
  metadata?: Record<string, unknown>;
}

const SENSITIVE_KEY_PATTERN =
  /pass(word|phrase)?|secret|token|api[-_]?key|authorization|cookie|credential/i;

function sanitizeValue(value: unknown, depth = 0): Json {
  if (value === null || value === undefined) return null;
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (depth >= 4) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => sanitizeValue(item, depth + 1));
  }
  if (typeof value === "object") {
    const out: { [key: string]: Json | undefined } = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        out[key] = "[REDACTED]";
      } else if (val !== undefined) {
        out[key] = sanitizeValue(val, depth + 1);
      }
    }
    return out;
  }
  return String(value);
}

/**
 * Writes a structured system event into `public.system_logs` via the service-role client
 * and mirrors it to stdout/stderr. Never throws, so logging issues cannot break app flows.
 */
export async function logSystemEvent(input: SystemLogInput): Promise<void> {
  const safeMetadata: Json = input.metadata
    ? sanitizeValue(input.metadata)
    : {};

  const prefix = `[${input.level.toUpperCase()}] [${input.category.toUpperCase()}] [${input.action}]`;
  if (input.level === "error" || input.level === "critical") {
    console.error(`${prefix} ${input.message}`, input.metadata ?? "");
  } else if (input.level === "warn") {
    console.warn(`${prefix} ${input.message}`);
  } else {
    console.info(`${prefix} ${input.message}`);
  }

  try {
    const adminClient = createAdminClient();
    const { error } = await adminClient.from("system_logs").insert({
      level: input.level,
      category: input.category,
      action: input.action.slice(0, 120),
      message: input.message.slice(0, 1000),
      actor_id: input.actorId ?? null,
      metadata: safeMetadata,
    });

    if (error) {
      console.error("[Logger] Failed persisting system log:", error.message);
    }
  } catch (err: unknown) {
    console.error(
      "[Logger] Unexpected error writing system log:",
      err instanceof Error ? err.message : err
    );
  }
}

/**
 * Formats a single system log record into a standardized plain-text log line.
 */
export function formatStructuredLogLine(entry: SystemLogItem): string {
  const timestamp = entry.created_at;
  const level = entry.level.toUpperCase().padEnd(8, " ");
  const category = entry.category.toUpperCase().padEnd(6, " ");
  const actorLabel = entry.actor?.username
    ? entry.actor.username
    : entry.actor_id
      ? entry.actor_id.slice(0, 8)
      : "system";
  const singleLineMessage = entry.message.replace(/\r?\n/g, " ").trim();

  const hasMetadata =
    entry.metadata &&
    typeof entry.metadata === "object" &&
    !Array.isArray(entry.metadata) &&
    Object.keys(entry.metadata).length > 0;

  const metaSuffix = hasMetadata
    ? ` | ${JSON.stringify(entry.metadata)}`
    : "";

  return `[${timestamp}] [${level}] [${category}] [${entry.action}] actor=${actorLabel} | ${singleLineMessage}${metaSuffix}`;
}

/**
 * Formats a list of system logs into a structured `.log` document with a header.
 */
export function formatStructuredLogDocument(
  entries: SystemLogItem[],
  options: {
    exportedBy: string;
  }
): string {
  const headerLines = [
    "# usePopcorn Log Report",
    `# Generated At : ${new Date().toISOString()}`,
    `# Exported By  : ${options.exportedBy}`,
    "",
  ];

  if (entries.length === 0) {
    return `${headerLines.join("\n")}# No log entries matched the active filters.\n`;
  }

  const bodyLines = entries.map(formatStructuredLogLine);
  return `${headerLines.join("\n")}${bodyLines.join("\n")}\n`;
}
