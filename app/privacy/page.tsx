import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - usePopcorn",
  description: "Basic privacy overview for usePopcorn.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-black text-white px-4 sm:px-6 lg:px-10 py-10 sm:py-14">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-xs text-neutral-500">Last updated: 2026</p>
        </div>

        <section className="bg-[#181818] border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-5 text-sm text-neutral-300 leading-relaxed">
          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-white">
              Information We Store
            </h2>
            <p>
              When you create an account, we store your email address, chosen
              username, optional avatar, watchlist entries, ratings, and
              reviews.
            </p>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-white">
              How We Use Your Data
            </h2>
            <p>
              Your activity is used strictly to operate your account, display
              your public reviews, maintain your personal watchlist, and compute
              your personalized recommendations. We do not sell your personal
              information to third parties.
            </p>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-white">
              Cookies &amp; Sessions
            </h2>
            <p>
              We use essential authentication cookies to keep you signed in and
              protect your account session.
            </p>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-white">Your Control</h2>
            <p>
              You can update your profile details, edit or remove your reviews,
              modify your watchlist, or permanently delete your account at any
              time from your Profile Settings. When an account is deleted, all
              personal data (credentials, profile details, avatar, watchlist,
              and written review text) is removed immediately, while anonymized
              numeric ratings are retained solely to preserve aggregate catalog
              scores.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
