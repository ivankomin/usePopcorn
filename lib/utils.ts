/**
 * Formats a TMDB poster path or full URL into a displayable image URL.
 */
export function getPosterUrl(
  posterPath: string | null | undefined,
  size: "w342" | "w500" | "w780" | "original" = "w500",
): string {
  if (!posterPath) {
    return "/placeholder-poster.png";
  }
  if (posterPath.startsWith("http://") || posterPath.startsWith("https://")) {
    return posterPath;
  }
  return `https://image.tmdb.org/t/p/${size}${posterPath}`;
}

/**
 * Formats runtime minutes into a readable duration string.
 * Supports 'long' format (e.g. 154 -> "2 hrs 34 min", matching Figma) and 'short' format (e.g. 154 -> "2h 34m").
 */
export function formatRuntime(
  minutes: number | null | undefined,
): string | null {
  if (!minutes || minutes <= 0) return null;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  const formattedMinutes = String(remainingMinutes).padStart(2, "0");
  if (hours === 0) return `${remainingMinutes} min`;
  return `${hours} h ${formattedMinutes} min`;
}

/**
 * Formats a numeric score to one decimal place.
 */
export function formatRating(score: number | null | undefined): string {
  if (score === null || score === undefined || isNaN(score)) return "0.0";
  return score.toFixed(1);
}

/**
 * Utility for joining class names.
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
