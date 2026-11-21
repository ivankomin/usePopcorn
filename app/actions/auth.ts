"use server";

import { headers } from "next/headers";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logSystemEvent } from "@/lib/logger";
import { validateEmail } from "@/lib/validation";

export interface PasswordResetRequestResult {
  success: boolean;
  error?: string;
}

export type ClientAuthEventType =
  | "auth.login"
  | "auth.login_failed"
  | "auth.login_blocked"
  | "auth.signup"
  | "auth.logout"
  | "auth.password_updated";

/**
 * Records user session lifecycle events (sign-in, sign-up, sign-out, failed/blocked
 * login attempts, password resets) into `public.system_logs` via the server.
 */
export async function logAuthEventAction(params: {
  event: ClientAuthEventType;
  email?: string;
  reason?: string;
}): Promise<void> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const actorId = user?.id ?? null;
    const normalizedEmail = params.email?.trim().toLowerCase() || user?.email || undefined;

    switch (params.event) {
      case "auth.login":
        await logSystemEvent({
          level: "info",
          category: "auth",
          action: "auth.login",
          message: `User session started${normalizedEmail ? ` for ${normalizedEmail}` : ""}.`,
          actorId,
          metadata: normalizedEmail ? { email: normalizedEmail } : {},
        });
        break;
      case "auth.login_failed":
        await logSystemEvent({
          level: "warn",
          category: "auth",
          action: "auth.login_failed",
          message: `Failed sign-in attempt${normalizedEmail ? ` for ${normalizedEmail}` : ""}.`,
          actorId: null,
          metadata: {
            ...(normalizedEmail ? { email: normalizedEmail } : {}),
            ...(params.reason ? { reason: params.reason } : {}),
          },
        });
        break;
      case "auth.login_blocked":
        await logSystemEvent({
          level: "warn",
          category: "auth",
          action: "auth.login_blocked",
          message: `Blocked account attempted sign-in${normalizedEmail ? ` (${normalizedEmail})` : ""}.`,
          actorId,
          metadata: {
            ...(normalizedEmail ? { email: normalizedEmail } : {}),
            ...(params.reason ? { reason: params.reason } : {}),
          },
        });
        break;
      case "auth.signup":
        await logSystemEvent({
          level: "info",
          category: "auth",
          action: "auth.signup",
          message: `New user account registered${normalizedEmail ? ` (${normalizedEmail})` : ""}.`,
          actorId,
          metadata: normalizedEmail ? { email: normalizedEmail } : {},
        });
        break;
      case "auth.logout":
        await logSystemEvent({
          level: "info",
          category: "auth",
          action: "auth.logout",
          message: `User signed out${normalizedEmail ? ` (${normalizedEmail})` : ""}.`,
          actorId,
          metadata: normalizedEmail ? { email: normalizedEmail } : {},
        });
        break;
      case "auth.password_updated":
        await logSystemEvent({
          level: "info",
          category: "auth",
          action: "auth.password_updated",
          message: `User completed password reset${normalizedEmail ? ` (${normalizedEmail})` : ""}.`,
          actorId,
          metadata: normalizedEmail ? { email: normalizedEmail } : {},
        });
        break;
    }
  } catch {
    // Non-blocking audit logging
  }
}

const BREVO_SMTP_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

async function resolveAppOrigin(): Promise<string> {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configuredSiteUrl) {
    return configuredSiteUrl.replace(/\/+$/, "");
  }

  const reqHeaders = await headers();
  const originHeader = reqHeaders.get("origin");
  if (originHeader && /^https?:\/\//i.test(originHeader)) {
    return originHeader.replace(/\/+$/, "");
  }

  const host =
    reqHeaders.get("x-forwarded-host") || reqHeaders.get("host") || "";
  if (host) {
    const forwardedProto = reqHeaders.get("x-forwarded-proto");
    const proto =
      forwardedProto ||
      (host.startsWith("localhost") || host.startsWith("127.0.0.1")
        ? "http"
        : "https");
    return `${proto}://${host}`.replace(/\/+$/, "");
  }

  return "http://localhost:3000";
}

function buildResetEmailHtml(resetUrl: string): string {
  const safeUrl = resetUrl.replace(/"/g, "&quot;");
  return `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background-color:#000000;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#000000;padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;background-color:#191919;border:1px solid #262626;border-radius:16px;padding:32px;">
            <tr>
              <td style="text-align:center;padding-bottom:24px;">
                <span style="font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#ffffff;">use<span style="color:#b9f84d;">Popcorn</span></span>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:12px;">
                <h1 style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">Reset your password</h1>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:24px;font-size:14px;line-height:1.6;color:#a3a3a3;">
                We received a request to reset the password for your usePopcorn account. Click the button below to choose a new password.
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-bottom:24px;">
                <a href="${safeUrl}" style="display:inline-block;background-color:#b9f84d;color:#000000;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;text-decoration:none;padding:12px 28px;border-radius:8px;">
                  Reset Password
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:16px;font-size:12px;line-height:1.6;color:#737373;word-break:break-all;">
                If the button doesn&apos;t work, copy and paste this link into your browser:<br />
                <a href="${safeUrl}" style="color:#b9f84d;text-decoration:underline;">${safeUrl}</a>
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid #262626;padding-top:16px;font-size:12px;line-height:1.5;color:#737373;">
                If you didn&apos;t request a password reset, you can safely ignore this email. This link expires after a single use.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function sendRecoveryEmailViaBrevo(params: {
  apiKey: string;
  senderEmail: string;
  senderName: string;
  recipientEmail: string;
  resetUrl: string;
}): Promise<{ ok: boolean; error?: string }> {
  const response = await fetch(BREVO_SMTP_ENDPOINT, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": params.apiKey,
    },
    body: JSON.stringify({
      sender: {
        name: params.senderName,
        email: params.senderEmail,
      },
      to: [{ email: params.recipientEmail }],
      subject: "Reset your usePopcorn password",
      htmlContent: buildResetEmailHtml(params.resetUrl),
      textContent: [
        "Reset your usePopcorn password",
        "",
        "We received a request to reset the password for your usePopcorn account.",
        "Open the link below to set a new password:",
        params.resetUrl,
        "",
        "If you didn't request a password reset, you can safely ignore this email.",
      ].join("\n"),
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    await logSystemEvent({
      level: "error",
      category: "auth",
      action: "auth.password_reset_email_failed",
      message: `Brevo API rejected password recovery email (HTTP ${response.status}).`,
      metadata: {
        status: response.status,
        recipient: params.recipientEmail,
        responsePreview: body.slice(0, 400),
      },
    });
    return {
      ok: false,
      error:
        "Unable to send the password reset email right now. Please try again later.",
    };
  }

  return { ok: true };
}

/**
 * Generates a Supabase password recovery link server-side via the Admin API
 * and delivers it via Brevo's transactional email API.
 */
export async function requestPasswordResetAction(
  email: string
): Promise<PasswordResetRequestResult> {
  const trimmedEmail = (email || "").trim().toLowerCase();
  const emailError = validateEmail(trimmedEmail);
  if (emailError) {
    return { success: false, error: emailError };
  }

  const brevoApiKey = process.env.BREVO_API_KEY?.trim();
  const brevoSenderEmail = process.env.BREVO_SENDER_EMAIL?.trim();
  const brevoSenderName =
    process.env.BREVO_SENDER_NAME?.trim() || "usePopcorn";

  if (!brevoApiKey || !brevoSenderEmail) {
    await logSystemEvent({
      level: "critical",
      category: "system",
      action: "auth.password_reset_unconfigured",
      message: "BREVO_API_KEY or BREVO_SENDER_EMAIL is not configured.",
    });
    return {
      success: false,
      error:
        "Password recovery email service is not configured. Please contact support.",
    };
  }

  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email: trimmedEmail,
    });

    if (error) {
      const lower = error.message.toLowerCase();
      // Do not reveal whether an account exists for the entered email
      if (lower.includes("user not found") || error.code === "user_not_found") {
        await logSystemEvent({
          level: "info",
          category: "auth",
          action: "auth.password_reset_unknown_email",
          message: `Password reset requested for unregistered email (${trimmedEmail}).`,
          metadata: { email: trimmedEmail },
        });
        return { success: true };
      }
      if (lower.includes("rate limit") || lower.includes("too many")) {
        await logSystemEvent({
          level: "warn",
          category: "auth",
          action: "auth.password_reset_rate_limited",
          message: `Password reset rate limited for ${trimmedEmail}.`,
          metadata: { email: trimmedEmail },
        });
        return {
          success: false,
          error:
            "Too many reset attempts. Please wait a few minutes and try again.",
        };
      }
      await logSystemEvent({
        level: "error",
        category: "auth",
        action: "auth.password_reset_token_failed",
        message: `Supabase generateLink failed for ${trimmedEmail}: ${error.message}`,
        metadata: { email: trimmedEmail, code: error.code ?? null },
      });
      return { success: false, error: error.message };
    }

    const hashedToken = data?.properties?.hashed_token;
    if (!hashedToken) {
      await logSystemEvent({
        level: "error",
        category: "auth",
        action: "auth.password_reset_token_missing",
        message: `Supabase generateLink returned no hashed_token for ${trimmedEmail}.`,
        metadata: { email: trimmedEmail },
      });
      return {
        success: false,
        error: "Failed to generate a password recovery token. Please try again.",
      };
    }

    const callbackPath = `/auth/callback?token_hash=${encodeURIComponent(hashedToken)}&type=recovery&next=/reset-password`;
    const origin = await resolveAppOrigin();
    const absoluteResetUrl = `${origin}${callbackPath}`;

    const emailResult = await sendRecoveryEmailViaBrevo({
      apiKey: brevoApiKey,
      senderEmail: brevoSenderEmail,
      senderName: brevoSenderName,
      recipientEmail: trimmedEmail,
      resetUrl: absoluteResetUrl,
    });

    if (!emailResult.ok) {
      return { success: false, error: emailResult.error };
    }

    await logSystemEvent({
      level: "info",
      category: "auth",
      action: "auth.password_reset_sent",
      message: `Sent password recovery email to ${trimmedEmail}.`,
      actorId: data?.user?.id ?? null,
      metadata: { email: trimmedEmail },
    });

    return { success: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to process password reset request. Please try again.";
    await logSystemEvent({
      level: "error",
      category: "auth",
      action: "auth.password_reset_exception",
      message: `Unexpected error during password reset for ${trimmedEmail}: ${message}`,
      metadata: { email: trimmedEmail },
    });
    return { success: false, error: message };
  }
}
