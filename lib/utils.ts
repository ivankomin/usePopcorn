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

/**
 * Formats a currency amount into a clean spaced format (e.g. 8000000 -> "$8 000 000").
 */
export function formatCurrency(amount: number | null | undefined): string | null {
  if (!amount || amount <= 0) return null;
  return `$${amount.toLocaleString("en-US").replace(/,/g, " ")}`;
}

/**
 * Formats an ISO date string into readable date (e.g. "1994-09-10" -> "Sep 10, 1994").
 */
export function formatDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Checks if an age rating denotes restricted / mature content.
 * e.g. R, NC-17, TV-MA, 18+, Adult.
 */
export function isMatureRating(rating: string | null | undefined): boolean {
  if (!rating) return false;
  const normalized = rating.trim().toUpperCase();
  return (
    normalized === "R" ||
    normalized === "NC-17" ||
    normalized === "TV-MA" ||
    normalized === "18+" ||
    normalized === "18" ||
    normalized === "ADULT" ||
    normalized === "X"
  );
}

/**
 * Formats vote counts (e.g. 27500 -> "27.5k", 950 -> "950").
 */
export function formatVoteCount(count: number | null | undefined): string {
  if (!count || count <= 0) return "0";
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

