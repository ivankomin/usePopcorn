"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export interface MovieDetailsBackLinkProps {
  initialFrom?: "catalog" | "watchlist";
}

const emptySubscribe = () => () => {};

export function MovieDetailsBackLink({
  initialFrom = "catalog",
}: MovieDetailsBackLinkProps) {
  const fromSource = useSyncExternalStore(
    emptySubscribe,
    () => {
      if (initialFrom === "watchlist") return "watchlist";
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("from") === "watchlist") return "watchlist";
      if (document.referrer && document.referrer.includes("/watchlist")) {
        return "watchlist";
      }
      return "catalog";
    },
    () => initialFrom || "catalog",
  );

  const backHref = fromSource === "watchlist" ? "/watchlist" : "/catalog";
  const backLabel = "Back to media";

  const handleBackClick = (e: React.MouseEvent) => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      if (
        (fromSource === "watchlist" &&
          document.referrer.includes("/watchlist")) ||
        (fromSource === "catalog" && document.referrer.includes("/catalog"))
      ) {
        e.preventDefault();
        window.history.back();
      }
    }
  };

  return (
    <Link
      href={backHref}
      onClick={handleBackClick}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-400 hover:text-white transition-colors mb-5 group"
    >
      <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
      <span>{backLabel}</span>
    </Link>
  );
}
