"use client";

import Image from "next/image";

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
      {!imageError && posterSrc ? (
        <Image
          src={posterSrc}
          alt={title}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 304px"
          className="object-cover object-center"
          onError={onError}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-neutral-900 text-neutral-500">
          <span className="text-4xl mb-2">🎬</span>
          <span className="text-sm font-medium">{title}</span>
        </div>
      )}
    </div>
  );
}
