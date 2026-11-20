"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateEmail } from "@/lib/validation";

export interface PasswordResetRequestResult {
  success: boolean;
  error?: string;
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
    console.error(
      `[Password Recovery] Brevo API error (${response.status}):`,
      body
    );
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
    console.error(
      "[Password Recovery] BREVO_API_KEY or BREVO_SENDER_EMAIL is not configured."
    );
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
        return { success: true };
      }
      if (lower.includes("rate limit") || lower.includes("too many")) {
        return {
          success: false,
          error:
            "Too many reset attempts. Please wait a few minutes and try again.",
        };
      }
      return { success: false, error: error.message };
    }

    const hashedToken = data?.properties?.hashed_token;
    if (!hashedToken) {
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

    return { success: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to process password reset request. Please try again.";
    return { success: false, error: message };
  }
}
