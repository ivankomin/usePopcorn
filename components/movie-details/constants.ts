import { Clock, CheckCircle2, Heart } from "lucide-react";
import type { WatchlistStatus } from "@/types/media";

export interface StatusOption {
  value: WatchlistStatus;
  label: string;
  icon: typeof Clock;
  iconColor: string;
}

export const STATUS_OPTIONS: StatusOption[] = [
  {
    value: "plan_to_watch",
    label: "Plan to Watch",
    icon: Clock,
    iconColor: "text-neutral-400",
  },
  {
    value: "watched",
    label: "Watched",
    icon: CheckCircle2,
    iconColor: "text-[#8ce648]",
  },
  {
    value: "favorite",
    label: "Favorite",
    icon: Heart,
    iconColor: "text-red-400",
  },
];
