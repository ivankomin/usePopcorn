"use client";

import { useI18n } from "@/hooks/useI18n";
import type { Locale } from "@/lib/i18n";

const FLAGS: Record<Locale, string> = {
  en: "🇬🇧",
  uk: "🇺🇦",
};

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  const nextLocale: Locale = locale === "en" ? "uk" : "en";

  return (
    <button
      type="button"
      onClick={() => setLocale(nextLocale)}
      aria-label={t("nav.switchLanguage")}
      title={t("nav.switchLanguage")}
      className="inline-flex items-center justify-center w-9 h-9 rounded-md text-lg leading-none transition-colors cursor-pointer select-none"
    >
      <span aria-hidden="true">{FLAGS[locale]}</span>
    </button>
  );
}
