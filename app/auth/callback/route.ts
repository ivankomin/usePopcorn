import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
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
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(destination, requestUrl.origin));
    }
  } else if (
    tokenHash &&
    typeParam &&
    ALLOWED_OTP_TYPES.has(typeParam as EmailOtpType)
  ) {
    const { error } = await supabase.auth.verifyOtp({
      type: typeParam as EmailOtpType,
      token_hash: tokenHash,
    });
    if (!error) {
      return NextResponse.redirect(new URL(destination, requestUrl.origin));
    }
  }

  const isPasswordRecovery =
    destination.startsWith("/reset-password") || typeParam === "recovery";
  const fallbackPath = isPasswordRecovery
    ? "/forgot-password?error=recovery_link_expired"
    : "/login?error=auth_callback_failed";

  return NextResponse.redirect(new URL(fallbackPath, requestUrl.origin));
}
