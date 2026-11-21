import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { logSystemEvent } from "@/lib/logger";
import { NextResponse, type NextRequest } from "next/server";

const ALLOWED_OTP_TYPES = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

/**
 * Handles Supabase Auth callbacks for email verification, OAuth PKCE codes
 * (/auth/callback?code=...&next=...) and OTP token hashes
 * (/auth/callback?token_hash=...&type=recovery&next=/reset-password).
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const typeParam = requestUrl.searchParams.get("type");
  const rawNext = requestUrl.searchParams.get("next") ?? "/";
  const destination =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  const supabase = await createClient();

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      await logSystemEvent({
        level: "info",
        category: "auth",
        action: "auth.callback_verified",
        message: `Auth PKCE callback verified (redirecting to ${destination}).`,
        actorId: data?.user?.id ?? null,
        metadata: { flow: "pkce", destination },
      });
      return NextResponse.redirect(new URL(destination, requestUrl.origin));
    }
    await logSystemEvent({
      level: "warn",
      category: "auth",
      action: "auth.callback_failed",
      message: `Auth PKCE callback failed: ${error.message}`,
      metadata: { flow: "pkce", destination },
    });
  } else if (
    tokenHash &&
    typeParam &&
    ALLOWED_OTP_TYPES.has(typeParam as EmailOtpType)
  ) {
    const { data, error } = await supabase.auth.verifyOtp({
      type: typeParam as EmailOtpType,
      token_hash: tokenHash,
    });
    if (!error) {
      await logSystemEvent({
        level: "info",
        category: "auth",
        action: "auth.callback_verified",
        message: `Verified ${typeParam} OTP callback (redirecting to ${destination}).`,
        actorId: data?.user?.id ?? null,
        metadata: { flow: "otp", otpType: typeParam, destination },
      });
      return NextResponse.redirect(new URL(destination, requestUrl.origin));
    }
    await logSystemEvent({
      level: "warn",
      category: "auth",
      action: "auth.callback_failed",
      message: `OTP callback verification failed (${typeParam}): ${error.message}`,
      metadata: { flow: "otp", otpType: typeParam, destination },
    });
  }

  const isPasswordRecovery =
    destination.startsWith("/reset-password") || typeParam === "recovery";
  const fallbackPath = isPasswordRecovery
    ? "/forgot-password?error=recovery_link_expired"
    : "/login?error=auth_callback_failed";

  return NextResponse.redirect(new URL(fallbackPath, requestUrl.origin));
}
