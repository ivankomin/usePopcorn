"use client";

import Link from "next/link";
import { useI18n } from "@/hooks/useI18n";
import type { TranslationKey } from "@/lib/i18n";

export function AboutPageContent() {
  const { t } = useI18n();

  return (
    <main className="min-h-screen bg-black text-white px-4 sm:px-6 lg:px-10 py-10 sm:py-14">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            {t("pages.about.title")}
          </h1>
        </div>

        <section className="bg-[#181818] border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-4 text-sm sm:text-base text-neutral-300 leading-relaxed">
          <p>
            <strong className="text-white">usePopcorn</strong>{" "}
            {t("pages.about.introAfterBrand")}
          </p>
          <p>{t("pages.about.body")}</p>
          <p className="text-neutral-400 text-sm pt-2">
            {t("pages.about.ctaPrompt")}{" "}
            <Link
              href="/catalog"
              className="text-brand-lime hover:underline font-medium"
            >
              {t("pages.about.ctaLink")}
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}

const FAQ_KEYS: Array<{ question: TranslationKey; answer: TranslationKey }> = [
  {
    question: "pages.help.faq1Question",
    answer: "pages.help.faq1Answer",
  },
  {
    question: "pages.help.faq2Question",
    answer: "pages.help.faq2Answer",
  },
  {
    question: "pages.help.faq3Question",
    answer: "pages.help.faq3Answer",
  },
  {
    question: "pages.help.faq4Question",
    answer: "pages.help.faq4Answer",
  },
];

export function HelpPageContent() {
  const { t } = useI18n();

  return (
    <main className="min-h-screen bg-black text-white px-4 sm:px-6 lg:px-10 py-10 sm:py-14">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            {t("pages.help.title")}
          </h1>
        </div>

        <div className="space-y-4">
          {FAQ_KEYS.map((faq) => (
            <section
              key={faq.question}
              className="bg-[#181818] border border-neutral-800 rounded-2xl p-6 space-y-2"
            >
              <h2 className="text-base sm:text-lg font-bold text-white">
                {t(faq.question)}
              </h2>
              <p className="text-sm text-neutral-300 leading-relaxed">
                {t(faq.answer)}
              </p>
            </section>
          ))}
        </div>

        <p className="text-sm text-neutral-400">
          {t("pages.help.stillNeedHelp")}{" "}
          <Link
            href="/contact"
            className="text-brand-lime hover:underline font-medium"
          >
            {t("pages.help.contactLink")}
          </Link>
          .
        </p>
      </div>
    </main>
  );
}

const PRIVACY_SECTIONS: Array<{
  title: TranslationKey;
  body: TranslationKey;
}> = [
  {
    title: "pages.privacy.section1Title",
    body: "pages.privacy.section1Body",
  },
  {
    title: "pages.privacy.section2Title",
    body: "pages.privacy.section2Body",
  },
  {
    title: "pages.privacy.section3Title",
    body: "pages.privacy.section3Body",
  },
  {
    title: "pages.privacy.section4Title",
    body: "pages.privacy.section4Body",
  },
];

export function PrivacyPageContent() {
  const { t } = useI18n();

  return (
    <main className="min-h-screen bg-black text-white px-4 sm:px-6 lg:px-10 py-10 sm:py-14">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            {t("pages.privacy.title")}
          </h1>
          <p className="text-xs text-neutral-500">
            {t("pages.privacy.lastUpdated")}
          </p>
        </div>

        <section className="bg-[#181818] border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-5 text-sm text-neutral-300 leading-relaxed">
          {PRIVACY_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-1.5">
              <h2 className="text-base font-bold text-white">
                {t(section.title)}
              </h2>
              <p>{t(section.body)}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}

export function ContactPageContent() {
  const { t } = useI18n();

  return (
    <main className="min-h-screen bg-black text-white px-4 sm:px-6 lg:px-10 py-10 sm:py-14">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            {t("pages.contact.title")}
          </h1>
        </div>

        <section className="bg-[#181818] border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-5 text-sm sm:text-base text-neutral-300 leading-relaxed">
          <p>{t("pages.contact.intro")}</p>

          <div className="space-y-3 pt-2 border-t border-neutral-800">
            <div>
              <p className="text-xs uppercase tracking-wider text-neutral-500 font-semibold">
                {t("pages.contact.generalSupport")}
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
                {t("pages.contact.catalogBugReports")}
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
