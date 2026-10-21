import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { Metadata } from "next";
import { getMediaById, getUserWatchlistEntryForMedia } from "@/lib/api";
import MovieDetailsCard from "@/components/MovieDetailsCard";

interface MoviePageProps {
  params: Promise<{
    id: string;
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

export default async function MoviePage({ params }: MoviePageProps) {
  await connection();
  const { id } = await params;
  const [media, watchlistEntry] = await Promise.all([
    getMediaById(id),
    getUserWatchlistEntryForMedia(id),
  ]);

  if (!media) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-start py-4 sm:py-8">
      <MovieDetailsCard
        media={media}
        initialInWatchlist={Boolean(watchlistEntry)}
        initialAddedAt={watchlistEntry?.created_at || null}
      />
    </div>
  );
}
