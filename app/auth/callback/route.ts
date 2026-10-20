import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

//Handles the OAuth / email verification callback URL (/auth/callback?code=...). 
// !! unused for now.
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const destination = next.startsWith("/") ? next : "/";
      return NextResponse.redirect(new URL(destination, requestUrl.origin));
    }
  }

  // Redirect to login page with an error flag if verification failed
  return NextResponse.redirect(
    new URL("/login?error=auth_callback_failed", requestUrl.origin)
  );
}
