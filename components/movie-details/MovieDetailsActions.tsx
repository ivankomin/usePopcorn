"use client";

import { useState, useRef } from "react";
import { PlusCircle, Check, Trash2, Share2, ChevronDown } from "lucide-react";
import type { WatchlistStatus } from "@/types/media";
import { useOutsideClick } from "@/hooks/useOutsideClick";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import type { TranslationKey } from "@/lib/i18n";
import { STATUS_OPTIONS } from "./constants";

const STATUS_LABEL_KEYS: Record<WatchlistStatus, TranslationKey> = {
  plan_to_watch: "movieDetails.planToWatch",
  watched: "movieDetails.watched",
  favorite: "movieDetails.favorite",
};

export interface MovieDetailsActionsProps {
  inWatchlist: boolean;
  status: WatchlistStatus;
  isPending: boolean;
  onAddToWatchlist: () => void;
  onStatusSelect: (status: WatchlistStatus) => void;
  onRemoveFromWatchlist: () => void;
}

export function MovieDetailsActions({
  inWatchlist,
  status,
  isPending,
  onAddToWatchlist,
  onStatusSelect,
  onRemoveFromWatchlist,
}: MovieDetailsActionsProps) {
  const { t } = useI18n();
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const statusMenuRef = useRef<HTMLDivElement>(null);
  useOutsideClick(
    statusMenuRef,
    () => setIsStatusMenuOpen(false),
    isStatusMenuOpen,
  );

  const handleShare = async () => {
    try {
      if (typeof window !== "undefined") {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Fallback
    }
  };

  const currentStatusConfig =
    STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];
  const CurrentStatusIcon = currentStatusConfig.icon;

  if (inWatchlist) {
    return (
      <div className="flex flex-col gap-2.5 w-full mt-1">
        {/* Watchlist State Header: Badge & Actions */}
        <div className="flex items-center justify-between w-full px-1 py-1">
          <div className="flex items-center gap-2 select-none">
            <span className="w-5 h-5 rounded-full bg-[#8ce648] flex items-center justify-center shrink-0">
              <Check className="w-3.5 h-3.5 text-black stroke-3" />
            </span>
            <span className="text-[#8ce648] font-medium text-sm">
              {t("movieDetails.inWatchlist")}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onRemoveFromWatchlist}
              disabled={isPending}
              title={t("movieDetails.removeFromWatchlist")}
              aria-label={t("movieDetails.removeFromWatchlist")}
              className="p-1 text-red-500 hover:text-red-400 hover:scale-110 active:scale-95 transition-all cursor-pointer select-none"
            >
              <Trash2 className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={handleShare}
              title={copied ? t("movieDetails.copied") : t("movieDetails.share")}
              aria-label={t("movieDetails.share")}
              className="relative p-1 text-white hover:text-neutral-300 hover:scale-110 active:scale-95 transition-all cursor-pointer select-none"
            >
              <Share2 className="w-5 h-5" />
              {copied && (
                <span className="absolute -top-8 -right-2 px-2 py-1 rounded bg-neutral-900 border border-neutral-700 text-[10px] text-white font-bold shadow-lg animate-in fade-in">
                  {t("movieDetails.copied")}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Standalone Watchlist Status Selector */}
        <div className="relative w-full" ref={statusMenuRef}>
          <button
            type="button"
            onClick={() => setIsStatusMenuOpen((prev) => !prev)}
            className="w-full h-10 px-3.5 rounded-xl bg-[#181818] border border-neutral-700/80 hover:border-neutral-500 hover:bg-neutral-800/60 text-white flex items-center justify-between text-xs font-medium transition-all cursor-pointer select-none group"
            aria-expanded={isStatusMenuOpen}
            aria-haspopup="true"
            title={t("movieDetails.watchlistStatus")}
          >
            <div className="flex items-center gap-2">
              <span className="text-neutral-400 font-normal">
                {t("movieDetails.statusLabel")}
              </span>
              <div className="flex items-center gap-1.5 font-semibold text-white">
                <CurrentStatusIcon
                  className={cn("w-3.5 h-3.5", currentStatusConfig.iconColor)}
                />
                <span>{t(STATUS_LABEL_KEYS[currentStatusConfig.value])}</span>
              </div>
            </div>
            <ChevronDown
              className={cn(
                "w-4 h-4 text-neutral-400 group-hover:text-white transition-transform duration-200",
                isStatusMenuOpen && "rotate-180",
              )}
            />
          </button>

          {/* Status Selection Popover */}
          {isStatusMenuOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-full rounded-xl bg-[#1c1c1c] border border-neutral-700/90 shadow-2xl p-1.5 z-30 flex flex-col gap-1 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100">
              <div className="px-2.5 py-1 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider border-b border-neutral-800 pb-1.5">
                {t("movieDetails.watchlistStatus")}
              </div>
              {STATUS_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = status === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setIsStatusMenuOpen(false);
                      onStatusSelect(opt.value);
                    }}
                    className={cn(
                      "flex items-center justify-between w-full px-2.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer select-none",
                      isSelected
                        ? " font-semibold"
                        : "text-neutral-300 hover:bg-neutral-800 hover:text-white",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={cn("w-4 h-4", opt.iconColor)} />
                      <span>{t(STATUS_LABEL_KEYS[opt.value])}</span>
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-[#8ce648]" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 w-full mt-1">
      <button
        type="button"
        onClick={onAddToWatchlist}
        disabled={isPending}
        className="flex-1 h-11 px-4 rounded-xl bg-transparent border border-neutral-700/80 hover:border-neutral-500 hover:bg-neutral-800/60 text-white font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer select-none"
      >
        <PlusCircle className="w-4 h-4 text-neutral-300" />
        <span>{t("movieDetails.addToWatchlist")}</span>
      </button>

      <button
        type="button"
        onClick={handleShare}
        title={copied ? t("movieDetails.copied") : t("movieDetails.share")}
        aria-label={t("movieDetails.share")}
        className="relative w-11 h-11 shrink-0 rounded-xl bg-transparent border border-neutral-700/80 hover:border-neutral-500 hover:bg-neutral-800/60 text-neutral-300 hover:text-white flex items-center justify-center transition-all cursor-pointer select-none"
      >
        <Share2 className="w-4 h-4" />
        {copied && (
          <span className="absolute -top-8 px-2 py-1 rounded bg-neutral-900 border border-neutral-700 text-[10px] text-white font-bold shadow-lg animate-in fade-in">
            {t("movieDetails.copied")}
          </span>
        )}
      </button>
    </div>
  );
}
