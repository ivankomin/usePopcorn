"use client";

import { MediaPoster } from "@/components/MediaPoster";

export interface MovieDetailsPosterProps {
  title: string;
  posterSrc: string | null;
  imageError: boolean;
  onError: () => void;
}

export function MovieDetailsPoster({
  title,
  posterSrc,
  imageError,
  onError,
}: MovieDetailsPosterProps) {
  return (
    <div className="relative aspect-2/3 w-full rounded-2xl overflow-hidden bg-neutral-900 border border-white/5 shadow-xl">
      <MediaPoster
        title={title}
        src={posterSrc}
        sizes="(max-width: 768px) 100vw, 304px"
        priority={true}
        imageError={imageError}
        onImageError={onError}
        fallbackClassName="p-4"
        fallbackIconClassName="text-4xl mb-2"
        fallbackTitleClassName="text-sm font-medium"
      />
    </div>
  );
}
