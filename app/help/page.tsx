import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Help - usePopcorn",
  description: "Frequently asked questions and quick help for usePopcorn.",
};

const FAQS = [
  {
    question: "How do I build my watchlist?",
    answer:
      "Sign in to your account and click the plus (+) button on any movie or series card, or open its details page to set a status such as Plan to Watch, Watching, Watched, or Favorite.",
  },
  {
    question: "How do ratings and reviews work?",
    answer:
      "Signed-in users can rate any title on a 1–10 scale (5-star half-step picker) and optionally leave a written review on the title's details page.",
  },
  {
    question: "How do I unlock For You recommendations?",
    answer:
      "Once you sign in and interact with at least 3 titles through ratings or your watchlist, your Taste Profile unlocks personalized recommendations tailored to your favorite genres, eras, and formats.",
  },
  {
    question: "Where can I manage my profile?",
    answer:
      "Click your avatar in the top-right navigation bar to open your Profile Cabinet, where you can review your stats, edit your username or avatar, and view your past reviews.",
  },
];

export default function HelpPage() {
  return (
    <main className="min-h-screen bg-black text-white px-4 sm:px-6 lg:px-10 py-10 sm:py-14">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Help &amp; FAQ
          </h1>
        </div>

        <div className="space-y-4">
          {FAQS.map((faq) => (
            <section
              key={faq.question}
              className="bg-[#181818] border border-neutral-800 rounded-2xl p-6 space-y-2"
            >
              <h2 className="text-base sm:text-lg font-bold text-white">
                {faq.question}
              </h2>
              <p className="text-sm text-neutral-300 leading-relaxed">
                {faq.answer}
              </p>
            </section>
          ))}
        </div>

        <p className="text-sm text-neutral-400">
          Still need assistance?{" "}
          <Link
            href="/contact"
            className="text-brand-lime hover:underline font-medium"
          >
            Contact us
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
