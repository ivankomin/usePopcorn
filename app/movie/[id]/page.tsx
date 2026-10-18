import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getMediaById } from "@/lib/api";
import MovieDetailsCard from "@/components/MovieDetailsCard";

interface MoviePageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({
  params,
}: MoviePageProps): Promise<Metadata> {
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
  const { id } = await params;
  const media = await getMediaById(id);

  if (!media) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-start py-4 sm:py-8">
      <MovieDetailsCard media={media} />
    </div>
  );
}
