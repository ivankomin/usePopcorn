import { Mail, Lock, LogIn } from "lucide-react";

export default function Login() {
  return (
    <div className="bg-main-bg flex min-h-screen items-center justify-center">
      <div className="bg-light-bg w-full max-w-md rounded-3xl p-10 shadow-2xl">
        {/* Header / Logo Section */}
        <div className="mb-10 text-center">
          <div className="mb-4 flex justify-center">
            <span className="text-4xl">🍿</span>
            <span className="ml-2 text-3xl font-black tracking-tighter text-white uppercase">
              USE
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white">Welcome back</h2>
          <p className="mt-2 text-sm text-neutral-500">
            Log in to manage your watchlist and ratings
          </p>
        </div>

        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          {/* Email Input */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold tracking-widest text-neutral-400 uppercase">
              Email Address
            </label>
            <div className="relative">
              <Mail
                className="absolute top-1/2 left-4 -translate-y-1/2 text-neutral-500"
                size={18}
              />
              <input
                type="email"
                placeholder="walter.white@gmail.com"
                className="w-full rounded-xl border border-neutral-700 bg-[#141414] py-3 pr-4 pl-12 text-white transition-colors outline-none placeholder:text-neutral-600 focus:border-accent"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold tracking-widest text-neutral-400 uppercase">
                Password
              </label>
              <a href="#" className="text-accent text-xs font-bold hover:underline">
                Forgot?
              </a>
            </div>
            <div className="relative">
              <Lock
                className="absolute top-1/2 left-4 -translate-y-1/2 text-neutral-500"
                size={18}
              />
              <input
                type="password"
                placeholder="••••••••"
                className="w-full rounded-xl border border-neutral-700 bg-[#141414] py-3 pr-4 pl-12 text-white transition-colors outline-none placeholder:text-neutral-600 focus:border-accent"
              />
            </div>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            className="bg-accent text-light-bg flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-3.5 text-base font-bold transition-all hover:brightness-110 active:scale-[0.98]"
          >
            <LogIn size={20} strokeWidth={2.5} />
            Sign In
          </button>
        </form>

        {/* Footer Link */}
        <p className="mt-8 text-center text-sm text-neutral-500">
          Don't have an account?{" "}
          <a href="#" className="text-accent font-bold hover:underline">
            Create one
          </a>
        </p>
      </div>
    </div>
  );
}