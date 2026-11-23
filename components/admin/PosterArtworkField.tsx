"use client";

import type { RefObject } from "react";
import Image from "next/image";
import { Film, Link2, Upload, X } from "lucide-react";
import Button from "@/components/Button";

export interface PosterArtworkFieldProps {
  posterMode: "file" | "url";
  posterFile: File | null;
  posterUrl: string;
  posterPreview: string | null;
  posterError: string | null;
  posterUrlLoadError: boolean;
  isLocked: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onModeChange: (mode: "file" | "url") => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUrlChange: (value: string) => void;
  onClear: () => void;
  onPreviewLoadError: () => void;
}

export function PosterArtworkField({
  posterMode,
  posterFile,
  posterUrl,
  posterPreview,
  posterError,
  posterUrlLoadError,
  isLocked,
  fileInputRef,
  onModeChange,
  onFileChange,
  onUrlChange,
  onClear,
  onPreviewLoadError,
}: PosterArtworkFieldProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          Poster Artwork
        </label>

        <div className="flex items-center bg-neutral-900 border border-neutral-700/60 rounded-xl p-1 gap-1">
          <button
            type="button"
            onClick={() => onModeChange("file")}
            disabled={isLocked}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 ${
              posterMode === "file"
                ? "bg-brand-lime text-black"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload File</span>
          </button>
          <button
            type="button"
            onClick={() => onModeChange("url")}
            disabled={isLocked}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 ${
              posterMode === "url"
                ? "bg-brand-lime text-black"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Image URL</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-neutral-900/60 border border-neutral-800 rounded-xl">
        <div className="w-24 h-36 relative bg-neutral-800 rounded-lg overflow-hidden border border-neutral-700 flex items-center justify-center shrink-0">
          {posterPreview && !posterUrlLoadError ? (
            <Image
              src={posterPreview}
              alt="Poster preview"
              fill
              className="object-cover"
              unoptimized
              onError={onPreviewLoadError}
            />
          ) : (
            <Film className="w-8 h-8 text-neutral-600" />
          )}
        </div>

        {posterMode === "file" ? (
          <div className="flex-1 space-y-2 text-center sm:text-left w-full">
            <p className="text-xs text-neutral-300 font-medium">
              Upload poster artwork (.jpg, .jpeg, .png, .webp — max 5 MB).
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onFileChange}
              disabled={isLocked}
              className="hidden"
              id="admin-poster-upload"
            />

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLocked}
                className="text-xs"
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                <span>
                  {posterFile ? "Change Selected Image" : "Choose Image File"}
                </span>
              </Button>

              {posterFile && (
                <button
                  type="button"
                  onClick={onClear}
                  disabled={isLocked}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-neutral-400 hover:text-white bg-neutral-800/80 border border-neutral-700 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {posterFile && (
              <p className="text-xs text-brand-lime font-mono">
                {posterFile.name} ({(posterFile.size / 1024).toFixed(0)} KB)
              </p>
            )}

            {posterError && (
              <p className="text-xs text-rose-400">{posterError}</p>
            )}
          </div>
        ) : (
          <div className="flex-1 space-y-2 w-full">
            <p className="text-xs text-neutral-300 font-medium">
              Paste a direct image URL (https://...) for live thumbnail preview.
            </p>

            <div className="flex items-center gap-2">
              <input
                type="url"
                value={posterUrl}
                onChange={(e) => onUrlChange(e.target.value)}
                disabled={isLocked}
                placeholder="https://image.tmdb.org/t/p/w500/..."
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-lime transition-colors disabled:opacity-50"
              />
              {posterUrl && (
                <button
                  type="button"
                  onClick={onClear}
                  disabled={isLocked}
                  title="Clear poster URL"
                  className="p-2.5 rounded-xl text-neutral-400 hover:text-white bg-neutral-800/80 border border-neutral-700 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {posterError && (
              <p className="text-xs text-rose-400">{posterError}</p>
            )}
            {!posterError && posterUrlLoadError && (
              <p className="text-xs text-amber-400">
                Preview could not be loaded from this URL. Verify that the link
                points directly to an accessible image.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
