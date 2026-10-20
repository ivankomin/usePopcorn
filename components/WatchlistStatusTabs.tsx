"use client";

import { useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Bookmark, Clock, CheckCircle2, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WatchlistStatus, WatchlistStatusCounts } from "@/types/media";

export interface WatchlistStatusTabsProps {
  statusCounts: WatchlistStatusCounts;
  currentStatus?: WatchlistStatus | "all";
}

interface TabConfig {
  value: WatchlistStatus | "all";
  label: string;
  icon: typeof Bookmark;
  count: number;
}

export default function WatchlistStatusTabs({
  statusCounts,
  currentStatus = "all",
}: WatchlistStatusTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const tabs: TabConfig[] = [
    {
      value: "all",
      label: "All Items",
      icon: Bookmark,
      count: statusCounts.all,
    },
    {
      value: "plan_to_watch",
      label: "Plan to Watch",
      icon: Clock,
      count: statusCounts.plan_to_watch,
    },
    {
      value: "watched",
      label: "Watched",
      icon: CheckCircle2,
      count: statusCounts.watched,
    },
    {
      value: "favorite",
      label: "Favorites",
      icon: Heart,
      count: statusCounts.favorite,
    },
  ];

  const handleSelectTab = (tabValue: WatchlistStatus | "all") => {
    if (tabValue === currentStatus) return;

    const params = new URLSearchParams(searchParams.toString());
    if (tabValue === "all") {
      params.delete("status");
    } else {
      params.set("status", tabValue);
    }
    // Reset to page 1 on tab switch
    params.delete("page");

    const query = params.toString();
    const targetUrl = query ? `${pathname}?${query}` : pathname;

    startTransition(() => {
      router.push(targetUrl);
    });
  };

  return (
    <div className="w-full flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none select-none">
      {tabs.map((tab) => {
        const isActive = currentStatus === tab.value;
        const Icon = tab.icon;

        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => handleSelectTab(tab.value)}
            disabled={isPending}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer shrink-0 border",
              isActive
                ? "bg-[#7b9bf9] text-black border-[#7b9bf9] font-semibold shadow-md "
                : "bg-[#181818] border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700",
              isPending && "opacity-80",
            )}
          >
            <Icon
              className={cn(
                "w-3.5 h-3.5 sm:w-4 sm:h-4",
                isActive
                  ? "text-black fill-black/20"
                  : "text-neutral-400 group-hover:text-white",
              )}
            />
            <span>{tab.label}</span>
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-[11px] font-mono",
                isActive
                  ? "bg-black/20 text-black font-bold"
                  : "bg-neutral-800 text-neutral-400",
              )}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
