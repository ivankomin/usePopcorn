"use client";

import { useEffect } from "react";
import { X, ExternalLink, Play } from "lucide-react";
import { getYouTubeEmbedUrl } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";

export interface TrailerModalProps {
  isOpen: boolean;
  title: string;
  videoId: string;
  onClose: () => void;
}

export function TrailerModal({
  isOpen,
  title,
  videoId,
  onClose,
}: TrailerModalProps) {
  const { t } = useI18n();
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const embedUrl = getYouTubeEmbedUrl(videoId);
  const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${title} Trailer`}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl bg-[#181818] border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl shadow-black/90 flex flex-col"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-neutral-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-7 h-7 rounded-lg bg-brand-lime/15 text-brand-lime flex items-center justify-center shrink-0">
              <Play className="w-3.5 h-3.5 fill-current" />
            </span>
            <h2 className="text-sm sm:text-base font-bold text-white truncate">
              {title} — {t("movieDetails.officialTrailer")}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-neutral-300 hover:text-white bg-neutral-900 border border-neutral-700/80 hover:border-neutral-500 transition-colors"
            >
              <span className="hidden sm:inline">YouTube</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              type="button"
              onClick={onClose}
              aria-label={t("movieDetails.closeTrailer")}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 16:9 Responsive YouTube Embed */}
        <div className="relative w-full aspect-video bg-black">
          <iframe
            src={embedUrl}
            title={`${title} Trailer`}
            className="absolute inset-0 w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}
