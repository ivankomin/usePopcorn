"use client";

import { useState, useEffect, useTransition, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import Loader from "@/components/Loader";
import Button from "@/components/Button";
import { useAuth } from "@/hooks/useAuth";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams.get("next");
  const nextParam = rawNext || "/profile";
  const urlError = searchParams.get("error");
  const resetStatus = searchParams.get("reset");

  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isNavigating, startNavigation] = useTransition();
  const isSubmitting = isPending || isNavigating;

  // Reset preserved form state when Next.js <Activity> hides this route on navigation
  useEffect(() => {
    return () => {
      setEmail("");
      setPassword("");
      setShowPassword(false);
      setError(null);
      setIsPending(false);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setIsPending(true);
    try {
      const result = await signIn(trimmedEmail, password);
      if (result.error) {
        setError(result.error);
        // Reset ONLY the incorrect field (password), preserving the email
        setPassword("");
        return;
      }

      // Smooth client navigation while cookies and auth state are already synchronized
      const destination = nextParam.startsWith("/") ? nextParam : "/profile";
      startNavigation(() => {
        router.push(destination);
        router.refresh();
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to sign in. Please try again.";
      setError(message);
      // Reset ONLY the password field
      setPassword("");
    } finally {
      setIsPending(false);
    }
  };

  const errorMessage =
    error ||
    (urlError === "account_blocked"
      ? "Your account has been blocked by an administrator for violating platform rules."
      : urlError === "auth_callback_failed"
        ? "Authentication verification failed or expired. Please sign in again."
        : null);

  const successMessage =
    !errorMessage && resetStatus === "success"
      ? "Your password has been updated. Please sign in with your new password."
      : null;

  return (
    <div className="w-full max-w-md bg-brand-surface border border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col items-center text-center mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Welcome back
        </h1>
        <p className="text-sm text-neutral-400 mt-1">
          Sign in to access your personal watchlists and reviews
        </p>
      </div>

      {/* Success Alert */}
      {successMessage && (
        <div
          role="status"
          className="mb-6 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-lg p-3.5 flex items-start gap-3"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

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

      {/* Form */}
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

        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="password"
              className="block text-xs font-semibold uppercase tracking-wider text-neutral-300"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-brand-lime hover:underline transition-colors"
            >
              Forgot?
            </Link>
          </div>
          <div className="relative flex items-center">
            <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 pointer-events-none" />
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-brand-input text-white text-sm placeholder:text-neutral-500 rounded-lg pl-10 pr-10 py-2.5 border border-neutral-700/60 focus:outline-none focus:border-brand-lime focus:ring-1 focus:ring-brand-lime transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              {showPassword ? (
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
          className="mt-2"
        >
          {isSubmitting ? (
            <>
              <Loader size="sm" />
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4 stroke-[2.5]" />
              <span>Sign In</span>
            </>
          )}
        </Button>
      </form>

      {/* Switch to Sign Up */}
      <div className="mt-8 pt-6 border-t border-neutral-800/80 text-center text-sm text-neutral-400">
        Don&apos;t have an account?{" "}
        <Link
          href={
            rawNext && rawNext !== "/"
              ? `/signup?next=${encodeURIComponent(rawNext)}`
              : "/signup"
          }
          className="text-brand-lime hover:underline font-medium"
        >
          Sign up
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-brand-bg">
      <Suspense
        fallback={
          <div className="w-full max-w-md bg-brand-surface border border-neutral-800 rounded-2xl p-8 flex items-center justify-center min-h-100">
            <Loader size="md" text="Loading..." />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
