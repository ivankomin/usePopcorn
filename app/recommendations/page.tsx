import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Film, Tv, LayoutGrid } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserRecommendations } from "@/lib/recommendations";
import Loader from "@/components/Loader";
import {
  TasteProfileBanner,
  RecommendationsGrid,
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

      <div className="gap-4">

      </div>

      <RecommendationsGrid items={result.items} mediaType={mediaType} />
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

  const tabs: Array<{
    key: "all" | "movie" | "tv";
    label: string;
    href: string;
    icon: typeof LayoutGrid;
  }> = [
    { key: "all", label: "All", href: "/recommendations", icon: LayoutGrid },
    {
      key: "movie",
      label: "Movies",
      href: "/recommendations?mediaType=movie",
      icon: Film,
    },
    {
      key: "tv",
      label: "Series",
      href: "/recommendations?mediaType=tv",
      icon: Tv,
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white px-4 sm:px-6 lg:px-10 py-8 sm:py-10">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        {/* Header & Media Type Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 pb-2">
          <div className="space-y-1.5">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Need recommendations?
            </h1>
          </div>

          <div
            role="tablist"
            aria-label="Filter recommendations by media type"
            className="inline-flex items-center gap-1.5 bg-[#181818] border border-neutral-800 rounded-xl p-1 self-start sm:self-auto"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = mediaType === tab.key;
              return (
                <Link
                  key={tab.key}
                  href={tab.href}
                  role="tab"
                  aria-selected={isActive}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-brand-lime text-black shadow-sm"
                      : "text-neutral-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <Suspense key={mediaType} fallback={<RecommendationsLoadingFallback />}>
          <RecommendationsContent mediaType={mediaType} />
        </Suspense>
      </div>
    </div>
  );
}
