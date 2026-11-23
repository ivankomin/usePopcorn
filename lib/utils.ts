/**
 * Formats a TMDB poster path or full URL into a displayable image URL.
 */
export function getPosterUrl(
  posterPath: string | null | undefined,
  size: "w200" | "w342" | "w500" | "w780" | "original" = "w500",
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
 * Formats a media item's display duration: seasons count for TV series,
 * or formatted runtime for movies.
 */
export function formatMediaDuration(media: {
  media_type?: string | null;
  runtime?: number | null;
  seasons_count?: number | null;
}): string | null {
  if (media.media_type === "tv") {
    const seasons = media.seasons_count || 1;
    return `${seasons} ${seasons === 1 ? "Season" : "Seasons"}`;
  }
  return formatRuntime(media.runtime);
}

/**
 * Categorizes a production budget (in USD) into a standardized display band.
 */
export function getBudgetCategory(budget?: number | null): string | null {
  if (!budget || budget <= 0) return null;
  if (budget < 15_000_000) return "Low (< $15M)";
  if (budget <= 60_000_000) return "Medium ($15M–$60M)";
  if (budget <= 120_000_000) return "High ($60M–$120M)";
  return "Blockbuster (> $120M)";
}

/**
 * Formats runtime minutes into a readable duration string (e.g. 154 -> "2 h 34 min").
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
 * Formats an ISO date string into dot-notated date (e.g. "2025-12-25" -> "12.25.2025").
 */
export function formatAddedAtDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}.${dd}.${yyyy}`;
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

const YOUTUBE_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;

/**
 * Extracts a validated 11-character YouTube video ID from a raw key or YouTube URL
 * (supports youtube.com/watch?v=, youtu.be/, youtube.com/embed/, youtube.com/shorts/).
 */
export function extractYouTubeVideoId(
  input: string | null | undefined,
): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (YOUTUBE_ID_REGEX.test(trimmed)) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();

    let candidate: string | null = null;
    if (host === "youtu.be") {
      candidate = parsed.pathname.split("/").filter(Boolean)[0] ?? null;
    } else if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "youtube-nocookie.com"
    ) {
      if (parsed.pathname === "/watch") {
        candidate = parsed.searchParams.get("v");
      } else {
        const segments = parsed.pathname.split("/").filter(Boolean);
        if (
          segments.length >= 2 &&
          (segments[0] === "embed" ||
            segments[0] === "shorts" ||
            segments[0] === "live" ||
            segments[0] === "v")
        ) {
          candidate = segments[1];
        }
      }
    }

    return candidate && YOUTUBE_ID_REGEX.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

/**
 * Builds a privacy-enhanced YouTube embed URL for a validated video ID.
 */
export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0`;
}

