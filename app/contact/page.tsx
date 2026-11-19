import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us - usePopcorn",
  description: "Get in touch with the usePopcorn team.",
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-black text-white px-4 sm:px-6 lg:px-10 py-10 sm:py-14">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Contact Us
          </h1>
        </div>

        <section className="bg-[#181818] border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-5 text-sm sm:text-base text-neutral-300 leading-relaxed">
          <p>
            Have a question, feedback, or noticed an issue with a movie or TV
            series listing? Reach out to us and we&apos;ll get back to you as
            soon as we can.
          </p>

          <div className="space-y-3 pt-2 border-t border-neutral-800">
            <div>
              <p className="text-xs uppercase tracking-wider text-neutral-500 font-semibold">
                General Support
              </p>
              <a
                href="mailto:support@usepopcorn.app"
                className="text-brand-lime hover:underline font-medium"
              >
                support@usepopcorn.app
              </a>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-neutral-500 font-semibold">
                Catalog &amp; Bug Reports
              </p>
              <a
                href="mailto:feedback@usepopcorn.app"
                className="text-brand-lime hover:underline font-medium"
              >
                feedback@usepopcorn.app
              </a>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
