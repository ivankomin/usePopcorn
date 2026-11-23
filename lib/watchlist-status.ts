import { Clock, CheckCircle2, Heart, type LucideIcon } from "lucide-react";
import type { WatchlistStatus } from "@/types/media";

export interface WatchlistStatusMeta {
  value: WatchlistStatus;
  label: string;
  pluralLabel: string;
  icon: LucideIcon;
  iconColor: string;
}

export const WATCHLIST_STATUS_OPTIONS: WatchlistStatusMeta[] = [
  {
    value: "plan_to_watch",
    label: "Plan to Watch",
    pluralLabel: "Plan to Watch",
    icon: Clock,
    iconColor: "text-neutral-400",
  },
  {
    value: "watched",
    label: "Watched",
    pluralLabel: "Watched",
    icon: CheckCircle2,
    iconColor: "text-[#8ce648]",
  },
  {
    value: "favorite",
    label: "Favorite",
    pluralLabel: "Favorites",
    icon: Heart,
    iconColor: "text-red-400",
  },
];

export const WATCHLIST_STATUS_MAP: Record<WatchlistStatus, WatchlistStatusMeta> = {
  plan_to_watch: WATCHLIST_STATUS_OPTIONS[0],
  watched: WATCHLIST_STATUS_OPTIONS[1],
  favorite: WATCHLIST_STATUS_OPTIONS[2],
};

export function getWatchlistStatusLabel(
  status: WatchlistStatus | "all",
  plural = false
): string {
  if (status === "all") return "All Saved Titles";
  const meta = WATCHLIST_STATUS_MAP[status];
  if (!meta) return "All Saved Titles";
  return plural ? meta.pluralLabel : meta.label;
}
