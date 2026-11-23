import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getUserRecommendations } from "@/lib/recommendations";
import Loader from "@/components/Loader";
import {
  TasteProfileBanner,
  RecommendationsGrid,
  RecommendationsHeader,
} from "@/components/recommendations";

export const metadata: Metadata = {
  title: "For You - usePopcorn",
  description:
    "Personalized movie and TV series recommendations based on your ratings and watchlist.",
};

interface RecommendationsPageProps {
  searchParams: Promise<{
    mediaType?: string;
  }>;
}

function normalizeMediaType(raw?: string): "all" | "movie" | "tv" {
  if (raw === "movie" || raw === "tv") return raw;
  return "all";
}

function RecommendationsLoadingFallback() {
  return (
    <div className="w-full flex flex-col items-center justify-center min-h-100 py-20">
      <Loader size="lg" text="Personalizing your recommendations..." />
    </div>
  );
}

async function RecommendationsContent({
  mediaType,
}: {
  mediaType: "all" | "movie" | "tv";
}) {
  const result = await getUserRecommendations({
    mediaType,
    limit: 16,
  });

  return (
    <div className="flex flex-col gap-6">
      <TasteProfileBanner profile={result.tasteProfile} />

      <RecommendationsGrid
        items={result.items}
        mediaType={mediaType}
        autoRefreshOnInteraction={result.tasteProfile.stage !== "personalized"}
      />
    </div>
  );
}

export default async function RecommendationsPage({
  searchParams,
}: RecommendationsPageProps) {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/recommendations");
  }

  const resolvedParams = await searchParams;
  const mediaType = normalizeMediaType(resolvedParams.mediaType);

  return (
    <div className="min-h-screen bg-black text-white px-4 sm:px-6 lg:px-10 py-8 sm:py-10">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        {/* Header & Media Type Tabs */}
        <RecommendationsHeader mediaType={mediaType} />

        <Suspense key={mediaType} fallback={<RecommendationsLoadingFallback />}>
          <RecommendationsContent mediaType={mediaType} />
        </Suspense>
      </div>
    </div>
  );
}
