import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About - usePopcorn",
  description: "Learn more about usePopcorn, our movie and TV series catalog.",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-black text-white px-4 sm:px-6 lg:px-10 py-10 sm:py-14">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            About usePopcorn
          </h1>
        </div>

        <section className="bg-[#181818] border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-4 text-sm sm:text-base text-neutral-300 leading-relaxed">
          <p>
            <strong className="text-white">usePopcorn</strong> is a movie and TV
            series discovery platform designed to help you browse titles, track
            what you want to watch, and share your ratings and reviews.
          </p>
          <p>
            You can filter the catalog by genre, release year, country, runtime,
            and rating, organize titles in your personal watchlist, and unlock
            personalized recommendations based on your taste profile.
          </p>
          <p className="text-neutral-400 text-sm pt-2">
            Ready to explore?{" "}
            <Link
              href="/catalog"
              className="text-brand-lime hover:underline font-medium"
            >
              Browse the catalog
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
