"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  UserPlus,
  AlertCircle,
} from "lucide-react";
import Loader from "@/components/Loader";
import Button from "@/components/Button";
import { useAuth } from "@/hooks/useAuth";

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next") || "/";

  const { signUp } = useAuth();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    if (!trimmedUsername || !trimmedEmail || !password || !confirmPassword) {
      setError("Please fill in all required fields.");
      return;
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(trimmedUsername)) {
      setError(
        "Username must be 3-20 characters long and contain only letters, numbers, or underscores.",
      );
      setUsername("");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
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
      const result = await signUp(trimmedEmail, password, trimmedUsername);

      if (result.error) {
        setError(result.error);
        setIsPending(false);
        const lower = result.error.toLowerCase();
        if (lower.includes("username")) {
          setUsername("");
        } else if (lower.includes("email")) {
          setEmail("");
        } else if (lower.includes("password")) {
          setPassword("");
          setConfirmPassword("");
        }
        return;
      }

      // If auto-confirmed/logged-in immediately
      const destination = nextParam.startsWith("/") ? nextParam : "/";
      router.push(destination);
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(message);
      setIsPending(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-brand-surface border border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col items-center text-center mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Create an account
        </h1>
        <p className="text-sm text-neutral-400 mt-1">
          Join usePopcorn to track watchlists and review movies
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
            htmlFor="username"
            className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-2"
          >
            Username
          </label>
          <div className="relative flex items-center">
            <User className="w-4 h-4 text-neutral-400 absolute left-3.5 pointer-events-none" />
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="moviefan42"
              className="w-full bg-brand-input text-white text-sm placeholder:text-neutral-500 rounded-lg pl-10 pr-4 py-2.5 border border-neutral-700/60 focus:outline-none focus:border-brand-lime focus:ring-1 focus:ring-brand-lime transition-colors"
            />
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">
            3-20 characters, letters, numbers, or underscores
          </p>
        </div>

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
          <label
            htmlFor="password"
            className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-2"
          >
            Password
          </label>
          <div className="relative flex items-center">
            <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 pointer-events-none" />
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
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
          <p className="text-[11px] text-neutral-500 mt-1">
            At least 6 characters
          </p>
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-2"
          >
            Confirm Password
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

        <Button type="submit" fullWidth disabled={isPending} className="mt-4">
          {isPending ? (
            <>
              <Loader size="sm" />
              <span>Creating account...</span>
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4 stroke-[2.5]" />
              <span>Create Account</span>
            </>
          )}
        </Button>
      </form>

      {/* Switch to Sign In */}
      <div className="mt-8 pt-6 border-t border-neutral-800/80 text-center text-sm text-neutral-400">
        Already have an account?{" "}
        <Link
          href={
            nextParam && nextParam !== "/"
              ? `/login?next=${encodeURIComponent(nextParam)}`
              : "/login"
          }
          className="text-brand-lime hover:underline font-medium"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-brand-bg">
      <Suspense
        fallback={
          <div className="w-full max-w-md bg-brand-surface border border-neutral-800 rounded-2xl p-8 flex items-center justify-center min-h-115">
            <Loader size="md" text="Loading..." />
          </div>
        }
      >
        <SignUpForm />
      </Suspense>
    </div>
  );
}
