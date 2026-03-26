export function getMediaType(pathname: string): "movie" | "series" | "" {
    if (pathname.startsWith("/movies")) return "movie";
    if (pathname.startsWith("/series")) return "series";
    return "";
  }