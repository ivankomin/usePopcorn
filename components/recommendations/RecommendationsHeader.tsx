"use client";

import Link from "next/link";
import { Film, Tv, LayoutGrid } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";

export interface RecommendationsHeaderProps {
  mediaType: "all" | "movie" | "tv";
}

export function RecommendationsHeader({
  mediaType,
}: RecommendationsHeaderProps) {
  const { t } = useI18n();

  const tabs: Array<{
    key: "all" | "movie" | "tv";
    label: string;
    href: string;
    icon: typeof LayoutGrid;
  }> = [
    {
      key: "all",
      label: t("recommendations.all"),
      href: "/recommendations",
      icon: LayoutGrid,
    },
    {
      key: "movie",
      label: t("recommendations.movies"),
      href: "/recommendations?mediaType=movie",
      icon: Film,
    },
    {
      key: "tv",
      label: t("recommendations.series"),
      href: "/recommendations?mediaType=tv",
      icon: Tv,
    },
  ];

  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 pb-2">
      <div className="space-y-1.5">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          {t("recommendations.heading")}
        </h1>
      </div>

      <div
        role="tablist"
        aria-label="Filter recommendations by media type"
        className="inline-flex items-center gap-1.5 bg-[#181818] border border-neutral-800 rounded-xl p-1 self-start sm:self-auto"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = mediaType === tab.key;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              role="tab"
              aria-selected={isActive}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                isActive
                  ? "bg-brand-lime text-black shadow-sm"
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
