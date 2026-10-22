"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export interface MovieDetailsBackLinkProps {
  initialFrom?: "catalog" | "watchlist";
  mediaType?: "movie" | "tv" | string;
}

const emptySubscribe = () => () => {};

function getSavedCatalogHref(
  mediaType: string,
  defaultHref: string
): string {
  if (typeof window === "undefined") return defaultHref;
  try {
    const lastUrl = sessionStorage.getItem("last_catalog_url");
    if (lastUrl && lastUrl.startsWith("/catalog")) {
      if (mediaType === "tv") {
        if (lastUrl.includes("mediaType=tv")) return lastUrl;
        const tvUrl = sessionStorage.getItem("last_tv_catalog_url");
        if (tvUrl && tvUrl.startsWith("/catalog")) return tvUrl;
        return "/catalog?mediaType=tv";
      }
      if (mediaType === "movie") {
        if (!lastUrl.includes("mediaType=tv")) return lastUrl;
        const movieUrl = sessionStorage.getItem("last_movie_catalog_url");
        if (movieUrl && movieUrl.startsWith("/catalog")) return movieUrl;
        return "/catalog";
      }
      return lastUrl;
    }

    if (mediaType === "tv") {
      const tvUrl = sessionStorage.getItem("last_tv_catalog_url");
      if (tvUrl && tvUrl.startsWith("/catalog")) return tvUrl;
    } else if (mediaType === "movie") {
      const movieUrl = sessionStorage.getItem("last_movie_catalog_url");
      if (movieUrl && movieUrl.startsWith("/catalog")) return movieUrl;
    }
  } catch {
    // Graceful fallback if storage is restricted
  }
  return defaultHref;
}

export function MovieDetailsBackLink({
  initialFrom = "catalog",
  mediaType = "movie",
}: MovieDetailsBackLinkProps) {
  const router = useRouter();

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
    () => initialFrom || "catalog"
  );

  const defaultCatalogHref =
    mediaType === "tv" ? "/catalog?mediaType=tv" : "/catalog";

  const resolvedCatalogHref = useSyncExternalStore(
    emptySubscribe,
    () => getSavedCatalogHref(mediaType, defaultCatalogHref),
    () => defaultCatalogHref
  );

  const backHref =
    fromSource === "watchlist" ? "/watchlist" : resolvedCatalogHref;
  const backLabel = "Back to media";

  const handleBackClick = (e: React.MouseEvent) => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      const navSource = sessionStorage.getItem("internal_nav_from");
      const hasReferrer =
        typeof document !== "undefined" &&
        Boolean(
          (fromSource === "watchlist" &&
            document.referrer.includes("/watchlist")) ||
            (fromSource === "catalog" && document.referrer.includes("/catalog"))
        );

      if (
        hasReferrer ||
        (fromSource === "watchlist" && navSource === "watchlist") ||
        (fromSource === "catalog" && navSource === "catalog")
      ) {
        sessionStorage.removeItem("internal_nav_from");
        e.preventDefault();
        router.back();
        return;
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
