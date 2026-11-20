"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Mail,
  ArrowLeft,
  Send,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import Loader from "@/components/Loader";
import Button from "@/components/Button";
import { requestPasswordResetAction } from "@/app/actions/auth";
import { validateEmail } from "@/lib/validation";

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  // Reset preserved form state when Next.js <Activity> hides this route
  useEffect(() => {
    return () => {
      setEmail("");
      setSubmittedEmail(null);
      setError(null);
      setIsPending(false);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    const emailError = validateEmail(trimmedEmail);
    if (emailError) {
      setError(emailError);
      return;
    }

    setIsPending(true);
    try {
      const result = await requestPasswordResetAction(trimmedEmail);

      if (!result.success) {
        setError(
          result.error ||
            "Failed to generate password reset link. Please try again.",
        );
        return;
      }

      setSubmittedEmail(trimmedEmail);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to process password reset request. Please try again.";
      setError(message);
    } finally {
      setIsPending(false);
    }
  };

  const errorMessage =
    error ||
    (urlError === "recovery_link_expired"
      ? "This password reset link is invalid or has expired. Please request a new one."
      : null);

  return (
    <div className="w-full max-w-md bg-brand-surface border border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col items-center text-center mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Reset your password
        </h1>
        <p className="text-sm text-neutral-400 mt-1">
          {submittedEmail
            ? "Check your inbox for the password recovery link"
            : "Enter your account email and we'll send you a reset link"}
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div
          role="alert"
          className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3.5 flex items-start gap-3"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {submittedEmail ? (
        <div className="space-y-5">
          <div
            role="status"
            className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm rounded-lg p-4 flex items-start gap-3"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-white">Reset link sent</p>
              <p className="text-neutral-300 leading-relaxed">
                If an account exists for{" "}
                <span className="font-medium text-white">
                  {submittedEmail}
                </span>
                , we&apos;ve sent a password reset link. Check your spam folder
                if you don&apos;t see it within a minute.
              </p>
            </div>
          </div>

          <Button
            type="button"
            fullWidth
            onClick={() => {
              setSubmittedEmail(null);
              setError(null);
            }}
          >
            <Send className="w-4 h-4 stroke-[2.2]" />
            <span>Use a Different Email</span>
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-2"
            >
              Email Address
            </label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 pointer-events-none" />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-brand-input text-white text-sm placeholder:text-neutral-500 rounded-lg pl-10 pr-4 py-2.5 border border-neutral-700/60 focus:outline-none focus:border-brand-lime focus:ring-1 focus:ring-brand-lime transition-colors"
              />
            </div>
          </div>

          <Button
            type="submit"
            fullWidth
            disabled={isPending}
            className="mt-2"
          >
            {isPending ? (
              <>
                <Loader size="sm" />
                <span>Generating reset link...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 stroke-[2.2]" />
                <span>Send Reset Link</span>
              </>
            )}
          </Button>
        </form>
      )}

      {/* Back to Sign In */}
      <div className="mt-8 pt-6 border-t border-neutral-800/80 text-center text-sm text-neutral-400">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-brand-lime hover:underline font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Sign In</span>
        </Link>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-brand-bg">
      <Suspense
        fallback={
          <div className="w-full max-w-md bg-brand-surface border border-neutral-800 rounded-2xl p-8 flex items-center justify-center min-h-80">
            <Loader size="md" text="Loading..." />
          </div>
        }
      >
        <ForgotPasswordForm />
      </Suspense>
    </div>
  );
}
