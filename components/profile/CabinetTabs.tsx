"use client";

import { LayoutGrid, Bookmark, Star, Settings } from "lucide-react";

export type CabinetTabId = "overview" | "watchlist" | "reviews" | "settings";

export interface CabinetTabsProps {
  activeTab: CabinetTabId;
  onTabChange: (tab: CabinetTabId) => void;
  watchlistCount?: number;
  reviewsCount?: number;
}

export function CabinetTabs({
  activeTab,
  onTabChange,
  watchlistCount = 0,
  reviewsCount = 0,
}: CabinetTabsProps) {
  const tabs: Array<{
    id: CabinetTabId;
    label: string;
    icon: typeof LayoutGrid;
    badge?: number;
  }> = [
    {
      id: "overview",
      label: "Overview",
      icon: LayoutGrid,
    },
    {
      id: "watchlist",
      label: "Watchlists & Collections",
      icon: Bookmark,
      badge: watchlistCount,
    },
    {
      id: "reviews",
      label: "Ratings & Reviews",
      icon: Star,
      badge: reviewsCount,
    },
    {
      id: "settings",
      label: "Settings & Security",
      icon: Settings,
    },
  ];

  return (
    <div className="w-full border-b border-neutral-800">
      <nav
        className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar py-2"
        aria-label="Profile navigation tabs"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              aria-current={isActive ? "page" : undefined}
              className={`relative flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-brand-surface text-brand-lime"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-900/60"
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  isActive ? "text-brand-lime" : "text-neutral-500"
                }`}
              />
              <span>{tab.label}</span>

              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                    isActive
                      ? "bg-brand-lime/20 text-brand-lime"
                      : "bg-neutral-800 text-neutral-400"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
