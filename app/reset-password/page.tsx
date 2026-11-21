"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import Loader from "@/components/Loader";
import Button from "@/components/Button";
import { createClient } from "@/lib/supabase/client";
import { logAuthEventAction } from "@/app/actions/auth";
import {
  getPasswordValidationError,
  PASSWORD_MIN_LENGTH,
  PASSWORD_REQUIREMENTS_HINT,
} from "@/lib/validation";

type RecoverySessionState = "checking" | "ready" | "invalid";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [sessionState, setSessionState] =
    useState<RecoverySessionState>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isNavigating, startNavigation] = useTransition();
  const isSubmitting = isPending || isNavigating;

  useEffect(() => {
    let isMounted = true;

    async function verifyRecoverySession() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (!isMounted) return;

        if (!userError && user) {
          setSessionState("ready");
        } else {
          setSessionState("invalid");
        }
      } catch {
        if (isMounted) {
          setSessionState("invalid");
        }
      }
    }

    verifyRecoverySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (event === "PASSWORD_RECOVERY" || session?.user) {
        setSessionState("ready");
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      setSessionState("checking");
      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setShowConfirmPassword(false);
      setError(null);
      setIsPending(false);
    };
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password || !confirmPassword) {
      setError("Please enter and confirm your new password.");
      return;
    }

    const passwordError = getPasswordValidationError(password);
    if (passwordError) {
      setError(passwordError);
      setPassword("");
      setConfirmPassword("");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setPassword("");
      setConfirmPassword("");
      return;
    }

    setIsPending(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        setPassword("");
        setConfirmPassword("");
        return;
      }

      await logAuthEventAction({ event: "auth.password_updated" });

      // Sign out the temporary recovery session so the user signs in cleanly with their new password
      await supabase.auth.signOut();

      startNavigation(() => {
        router.replace("/login?reset=success");
        router.refresh();
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to update password. Please try again.";
      setError(message);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-brand-bg">
      <div className="w-full max-w-md bg-brand-surface border border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
        {sessionState === "checking" ? (
          <div className="py-12 flex items-center justify-center">
            <Loader size="md" text="Verifying reset link..." />
          </div>
        ) : sessionState === "invalid" ? (
          <div className="space-y-6">
            <div className="flex flex-col items-center text-center">
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Reset link expired
              </h1>
              <p className="text-sm text-neutral-400 mt-1">
                Your password recovery link is invalid or has already been used
              </p>
            </div>

            <div
              role="alert"
              className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3.5 flex items-start gap-3"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Please request a new password reset email to continue.
              </span>
            </div>

            <Button href="/forgot-password" fullWidth>
              Request New Reset Link
            </Button>

            <div className="pt-4 border-t border-neutral-800/80 text-center text-sm text-neutral-400">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-brand-lime hover:underline font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Sign In</span>
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex flex-col items-center text-center mb-8">
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Set a new password
              </h1>
              <p className="text-sm text-neutral-400 mt-1">
                Choose a strong password for your usePopcorn account
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div
                role="alert"
                className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3.5 flex items-start gap-3"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-2"
                >
                  New Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 pointer-events-none" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={PASSWORD_MIN_LENGTH}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-brand-input text-white text-sm placeholder:text-neutral-500 rounded-lg pl-10 pr-10 py-2.5 border border-neutral-700/60 focus:outline-none focus:border-brand-lime focus:ring-1 focus:ring-brand-lime transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    className="absolute right-3 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-neutral-500 mt-1">
                  {PASSWORD_REQUIREMENTS_HINT}
                </p>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-2"
                >
                  Confirm New Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 pointer-events-none" />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-brand-input text-white text-sm placeholder:text-neutral-500 rounded-lg pl-10 pr-10 py-2.5 border border-neutral-700/60 focus:outline-none focus:border-brand-lime focus:ring-1 focus:ring-brand-lime transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
                    className="absolute right-3 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                fullWidth
                disabled={isSubmitting}
                className="mt-4"
              >
                {isSubmitting ? (
                  <>
                    <Loader size="sm" />
                    <span>Updating password...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4 stroke-[2.2]" />
                    <span>Update Password</span>
                  </>
                )}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
