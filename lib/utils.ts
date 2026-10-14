/**
 * Formats a TMDB poster path or full URL into a displayable image URL.
 */
export function getPosterUrl(
  posterPath: string | null | undefined,
  size: 'w342' | 'w500' | 'w780' | 'original' = 'w500'
): string {
  if (!posterPath) {
    return '/placeholder-poster.png';
  }
  if (posterPath.startsWith('http://') || posterPath.startsWith('https://')) {
    return posterPath;
  }
  return `https://image.tmdb.org/t/p/${size}${posterPath}`;
}

/**
 * Formats runtime minutes into hours and minutes (e.g. 142 -> "2h 22m").
 */
export function formatRuntime(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return 'N/A';
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes}m`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Formats a numeric score to one decimal place.
 */
export function formatRating(score: number | null | undefined): string {
  if (score === null || score === undefined || isNaN(score)) return '0.0';
  return score.toFixed(1);
}

/**
 * Utility for joining class names.
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
