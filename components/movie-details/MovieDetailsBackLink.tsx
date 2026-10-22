"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export interface MovieDetailsBackLinkProps {
  initialFrom?: "catalog" | "watchlist";
  mediaType?: "movie" | "tv" | string;
}

const emptySubscribe = () => () => {};

function getSavedCatalogHref(
  mediaType: string,
  defaultHref: string,
  searchParamQuery: string
): string {
  // 1. If query parameters (filters) were passed directly in the details URL, use them!
  if (searchParamQuery) {
    const params = new URLSearchParams(searchParamQuery);
    params.delete("from");
    const cleanQuery = params.toString();
    if (cleanQuery) {
      return `/catalog?${cleanQuery}`;
    }
  }

  // 2. Otherwise check sessionStorage
  if (typeof window !== "undefined") {
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
      // Graceful fallback
    }
  }

  // 3. Fallback default based on media type
  return defaultHref;
}

export function MovieDetailsBackLink({
  initialFrom = "catalog",
  mediaType = "movie",
}: MovieDetailsBackLinkProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isWatchlist =
    initialFrom === "watchlist" ||
    (searchParams ? searchParams.get("from") === "watchlist" : false);

  const defaultCatalogHref =
    mediaType === "tv" ? "/catalog?mediaType=tv" : "/catalog";

  const searchParamQuery = searchParams ? searchParams.toString() : "";

  const resolvedCatalogHref = useSyncExternalStore(
    emptySubscribe,
    () =>
      getSavedCatalogHref(mediaType, defaultCatalogHref, searchParamQuery),
    () => {
      if (searchParamQuery) {
        const params = new URLSearchParams(searchParamQuery);
        params.delete("from");
        const cleanQuery = params.toString();
        if (cleanQuery) return `/catalog?${cleanQuery}`;
      }
      return defaultCatalogHref;
    }
  );

  const backHref =
    isWatchlist ? "/watchlist" : resolvedCatalogHref;
  const backLabel = "Back to media";

  const handleBackClick = (e: React.MouseEvent) => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      const navSource = sessionStorage.getItem("internal_nav_from");
      const hasReferrer =
        typeof document !== "undefined" &&
        Boolean(
          (isWatchlist && document.referrer.includes("/watchlist")) ||
            (!isWatchlist && document.referrer.includes("/catalog"))
        );

      if (
        hasReferrer ||
        (isWatchlist && navSource === "watchlist") ||
        (!isWatchlist && navSource === "catalog")
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
