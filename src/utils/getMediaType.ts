export function getMediaType(pathname: string): "movie" | "series" | "watchlist" | "" {
    if (pathname.startsWith("/movies")) return "movie";
    if (pathname.startsWith("/series")) return "series";
    if (pathname.startsWith("/watchlist")) return "watchlist";
    return "";
  }