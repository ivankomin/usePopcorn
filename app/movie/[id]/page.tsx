import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { Metadata } from "next";
import {
  getMediaById,
  getUserWatchlistEntryForMedia,
  getUserReviewForMedia,
  getMediaReviews,
} from "@/lib/api";
import MovieDetailsCard from "@/components/MovieDetailsCard";
import { MovieReviewsSection } from "@/components/reviews";
import type { WatchlistStatus } from "@/types/media";

interface MoviePageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    from?: string;
  }>;
}

export async function generateMetadata({
  params,
}: MoviePageProps): Promise<Metadata> {
  await connection();
  const { id } = await params;
  const media = await getMediaById(id);

  if (!media) {
    return {
      title: "Media Not Found - usePopcorn",
    };
  }

  const yearStr = media.release_year ? ` (${media.release_year})` : "";
  return {
    title: `${media.title}${yearStr} - usePopcorn`,
    description:
      media.overview || `Watch and review ${media.title} on usePopcorn.`,
  };
}

export default async function MoviePage({
  params,
  searchParams,
}: MoviePageProps) {
  await connection();
  const [{ id }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams ? searchParams : Promise.resolve(undefined),
  ]);
  const [media, watchlistEntry, userReview, mediaReviews] = await Promise.all([
    getMediaById(id),
    getUserWatchlistEntryForMedia(id),
    getUserReviewForMedia(id),
    getMediaReviews(id),
  ]);

  if (!media) {
    notFound();
  }

  const fromSource =
    resolvedSearchParams?.from === "watchlist" ? "watchlist" : "catalog";

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-start py-4 sm:py-8">
      <MovieDetailsCard
        media={media}
        initialInWatchlist={Boolean(watchlistEntry)}
        initialAddedAt={watchlistEntry?.created_at || null}
        initialWatchlistStatus={
          (watchlistEntry?.status as WatchlistStatus) || "plan_to_watch"
        }
        initialFrom={fromSource}
        initialUserRating={userReview?.rating ?? null}
      />
      <MovieReviewsSection
        mediaId={media.id}
        initialUserReview={userReview}
        initialReviews={mediaReviews}
      />
    </div>
  );
}
