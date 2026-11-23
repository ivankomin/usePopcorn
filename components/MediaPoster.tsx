"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface MediaPosterProps {
  title: string;
  src: string | null | undefined;
  sizes: string;
  priority?: boolean;
  imageClassName?: string;
  fallbackClassName?: string;
  fallbackIconClassName?: string;
  fallbackTitleClassName?: string;
  /** Optional externally-controlled error state (e.g. when parent also renders a blurred backdrop). */
  imageError?: boolean;
  onImageError?: () => void;
}

export function MediaPoster({
  title,
  src,
  sizes,
  priority = false,
  imageClassName,
  fallbackClassName,
  fallbackIconClassName = "text-2xl mb-1",
  fallbackTitleClassName = "text-[11px] font-medium leading-tight line-clamp-2",
  imageError: controlledError,
  onImageError,
}: MediaPosterProps) {
  const [internalError, setInternalError] = useState(false);
  const hasError = controlledError ?? internalError;

  const handleError = () => {
    if (onImageError) {
      onImageError();
    } else {
      setInternalError(true);
    }
  };

  if (!hasError && src) {
    return (
      <Image
        src={src}
        alt={title}
        fill
        priority={priority}
        sizes={sizes}
        className={cn("object-cover object-center", imageClassName)}
        onError={handleError}
      />
    );
  }

  return (
    <div
      className={cn(
        "w-full h-full flex flex-col items-center justify-center p-2 text-center bg-neutral-900 text-neutral-500",
        fallbackClassName
      )}
    >
      <span className={fallbackIconClassName}>🎬</span>
      <span className={fallbackTitleClassName}>{title}</span>
    </div>
  );
}
