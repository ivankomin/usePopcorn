"use client";

import Link from "next/link";
import { useI18n } from "@/hooks/useI18n";

export default function Footer() {
  const { t } = useI18n();

  return (
    <footer className="w-full bg-brand-surface py-6 z-40 mt-auto">
      <div className="max-w-[1600px] mx-auto px-6 sm:px-10 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center">
          <Link
            href="/"
            className="text-xl font-medium tracking-tight text-[#e5e5e5] hover:text-white transition-colors"
          >
            usePopcorn
          </Link>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8">
          <Link
            href="/about"
            className="text-xs uppercase tracking-wider text-brand-muted hover:text-white transition-colors"
          >
            {t("footer.about")}
          </Link>
          <Link
            href="/help"
            className="text-xs uppercase tracking-wider text-brand-muted hover:text-white transition-colors"
          >
            {t("footer.help")}
          </Link>
          <Link
            href="/privacy"
            className="text-xs uppercase tracking-wider text-brand-muted hover:text-white transition-colors"
          >
            {t("footer.privacy")}
          </Link>
          <Link
            href="/contact"
            className="text-xs uppercase tracking-wider text-brand-muted hover:text-white transition-colors"
          >
            {t("footer.contact")}
          </Link>
        </div>
        <div className="text-xs uppercase tracking-wider text-brand-muted">
          {t("footer.copyright")}
        </div>
      </div>
    </footer>
  );
}
