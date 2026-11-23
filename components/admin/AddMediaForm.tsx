"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import {
  Film,
  Tv,
  Lock,
  Loader2,
  DollarSign,
  Calendar,
  Clock,
  User,
  Users,
  Play,
} from "lucide-react";
import Button from "@/components/Button";
import type { GenreRow } from "@/types/media";
import { extractYouTubeVideoId, getBudgetCategory } from "@/lib/utils";
import { validateImageFile } from "@/lib/validation";
import {
  createMediaItemAction,
  checkDuplicateMediaAction,
  uploadMediaPosterAction,
  type IngestMediaInput,
} from "@/app/actions/admin";
import {
  AddMediaFormAlerts,
  type DuplicateMediaWarning,
} from "./AddMediaFormAlerts";
import { GenreSelectorField } from "./GenreSelectorField";
import { PosterArtworkField } from "./PosterArtworkField";

export interface AddMediaFormProps {
  genres: GenreRow[];
  systemStatus: "Free" | "Updating";
  onSuccess?: (mediaId: string) => void;
}

const AGE_RATINGS = [
  "G",
  "PG",
  "PG-13",
  "R",
  "NC-17",
  "TV-Y",
  "TV-G",
  "TV-PG",
  "TV-14",
  "TV-MA",
];

const MAX_POSTER_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_POSTER_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

interface MediaFormState {
  mediaType: "movie" | "tv";
  title: string;
  originalTitle: string;
  releaseYear: number | "";
  releaseDate: string;
  runtime: number | "";
  seasonsCount: number | "";
  episodesCount: number | "";
  overview: string;
  directors: string;
  cast: string;
  trailerUrl: string;
  selectedGenreIds: number[];
  budget: number | "";
  revenue: number | "";
  ageRating: string;
  country: string;
}

function createInitialFormState(): MediaFormState {
  return {
    mediaType: "movie",
    title: "",
    originalTitle: "",
    releaseYear: new Date().getFullYear(),
    releaseDate: "",
    runtime: "",
    seasonsCount: 1,
    episodesCount: "",
    overview: "",
    directors: "",
    cast: "",
    trailerUrl: "",
    selectedGenreIds: [],
    budget: "",
    revenue: "",
    ageRating: "PG-13",
    country: "United States",
  };
}

function validatePosterUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "Poster URL must start with http:// or https://.";
    }
    return null;
  } catch {
    return "Please enter a valid image URL (e.g. https://example.com/poster.jpg).";
  }
}

export function AddMediaForm({
  genres,
  systemStatus,
  onSuccess,
}: AddMediaFormProps) {
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<MediaFormState>(createInitialFormState);

  const updateField = <K extends keyof MediaFormState>(
    key: K,
    value: MediaFormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Poster State
  const [posterMode, setPosterMode] = useState<"file" | "url">("file");
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterUrl, setPosterUrl] = useState("");
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const [posterError, setPosterError] = useState<string | null>(null);
  const [posterUrlLoadError, setPosterUrlLoadError] = useState(false);
  const [isUploadingPoster, setIsUploadingPoster] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  // Duplicate Check State (FR-17)
  const [duplicateWarning, setDuplicateWarning] =
    useState<DuplicateMediaWarning | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);

  // Submission Status
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdMediaId, setCreatedMediaId] = useState<string | null>(null);

  const isLocked = systemStatus === "Updating";

  // Debounced duplicate detection check (FR-17)
  useEffect(() => {
    const cleanTitle = form.title.trim();

    const timer = setTimeout(async () => {
      if (!cleanTitle || !form.releaseYear || form.releaseYear < 1888) {
        setDuplicateWarning(null);
        return;
      }

      setIsCheckingDuplicate(true);
      const res = await checkDuplicateMediaAction(
        cleanTitle,
        Number(form.releaseYear),
      );
      setIsCheckingDuplicate(false);
      if (res.exists && res.existingItem) {
        setDuplicateWarning(res.existingItem);
      } else {
        setDuplicateWarning(null);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [form.title, form.releaseYear]);

  const toggleGenre = (genreId: number) => {
    setForm((prev) => ({
      ...prev,
      selectedGenreIds: prev.selectedGenreIds.includes(genreId)
        ? prev.selectedGenreIds.filter((id) => id !== genreId)
        : [...prev.selectedGenreIds, genreId],
    }));
  };

  const handlePosterModeChange = (mode: "file" | "url") => {
    if (mode === posterMode) return;
    setPosterMode(mode);
    setPosterError(null);
    setPosterUrlLoadError(false);

    if (mode === "file") {
      setPosterPreview(objectUrlRef.current);
    } else {
      const trimmed = posterUrl.trim();
      setPosterPreview(
        trimmed && !validatePosterUrl(trimmed) ? trimmed : null,
      );
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateImageFile(file, {
      maxSizeBytes: MAX_POSTER_SIZE_BYTES,
      allowedTypes: ALLOWED_POSTER_MIME_TYPES,
      formatLabel: "JPG, PNG, or WebP",
    });

    if (validationError) {
      setPosterError(validationError);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setPosterError(null);
    setPosterUrlLoadError(false);
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
    const nextObjectUrl = URL.createObjectURL(file);
    objectUrlRef.current = nextObjectUrl;
    setPosterFile(file);
    setPosterPreview(nextObjectUrl);
  };

  const handlePosterUrlChange = (value: string) => {
    setPosterUrl(value);
    setPosterUrlLoadError(false);

    const trimmed = value.trim();
    if (!trimmed) {
      setPosterError(null);
      setPosterPreview(null);
      return;
    }

    const urlErr = validatePosterUrl(trimmed);
    setPosterError(urlErr);
    setPosterPreview(urlErr ? null : trimmed);
  };

  const clearPosterSelection = () => {
    setPosterError(null);
    setPosterUrlLoadError(false);
    if (posterMode === "file") {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setPosterFile(null);
      setPosterPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } else {
      setPosterUrl("");
      setPosterPreview(null);
    }
  };

  const budgetBand = getBudgetCategory(
    typeof form.budget === "number" ? form.budget : undefined,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setCreatedMediaId(null);

    if (isLocked) {
      setErrorMessage(
        "System synchronization is active ('Updating'). Manual media ingestion is locked. Try again later.",
      );
      return;
    }

    if (duplicateWarning) {
      setErrorMessage(
        `Cannot save duplicate: "${duplicateWarning.title}" (${duplicateWarning.release_year}) already exists in the catalog.`,
      );
      return;
    }

    if (!form.title.trim()) {
      setErrorMessage("Please enter a media title.");
      return;
    }

    if (!form.releaseYear || form.releaseYear < 1888 || form.releaseYear > 2050) {
      setErrorMessage("Please specify a valid release year (1888–2050).");
      return;
    }

    if (posterMode === "url" && posterUrl.trim()) {
      const urlErr = validatePosterUrl(posterUrl);
      if (urlErr) {
        setPosterError(urlErr);
        setErrorMessage(urlErr);
        return;
      }
    }

    if (form.trailerUrl.trim() && !extractYouTubeVideoId(form.trailerUrl)) {
      setErrorMessage(
        "Invalid trailer URL. Please enter a valid YouTube link (e.g. https://www.youtube.com/watch?v=...) or video ID.",
      );
      return;
    }

    startTransition(async () => {
      let resolvedPosterUrl: string | null = null;

      if (posterMode === "file" && posterFile) {
        setIsUploadingPoster(true);
        const formData = new FormData();
        formData.append("file", posterFile);
        const uploadRes = await uploadMediaPosterAction(formData);
        setIsUploadingPoster(false);

        if (!uploadRes.success || !uploadRes.data?.url) {
          setErrorMessage(uploadRes.error || "Failed to upload poster image.");
          return;
        }
        resolvedPosterUrl = uploadRes.data.url;
      } else if (posterMode === "url" && posterUrl.trim()) {
        resolvedPosterUrl = posterUrl.trim();
      }

      const directorsList = form.directors
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const castList = form.cast
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const input: IngestMediaInput = {
        title: form.title.trim(),
        original_title: form.originalTitle.trim() || null,
        media_type: form.mediaType,
        release_year: Number(form.releaseYear),
        release_date: form.releaseDate || null,
        runtime: typeof form.runtime === "number" ? form.runtime : null,
        seasons_count:
          form.mediaType === "tv" && typeof form.seasonsCount === "number"
            ? form.seasonsCount
            : null,
        episodes_count:
          form.mediaType === "tv" && typeof form.episodesCount === "number"
            ? form.episodesCount
            : null,
        overview: form.overview.trim() || null,
        poster_path: resolvedPosterUrl,
        budget: typeof form.budget === "number" ? form.budget : null,
        revenue: typeof form.revenue === "number" ? form.revenue : null,
        age_rating: form.ageRating || null,
        country: form.country.trim() || null,
        countries: form.country.trim() ? [form.country.trim()] : [],
        genre_ids: form.selectedGenreIds,
        directors: directorsList,
        cast: castList,
        tagline: null,
        trailer_url: form.trailerUrl.trim() || null,
      };

      const result = await createMediaItemAction(input);

      if (!result.success || !result.data?.mediaId) {
        setErrorMessage(
          result.error || "Failed to add media item to the catalog.",
        );
      } else {
        const newId = result.data.mediaId;
        setCreatedMediaId(newId);
        onSuccess?.(newId);

        setForm((prev) => ({
          ...createInitialFormState(),
          mediaType: prev.mediaType,
        }));
        setDuplicateWarning(null);
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
          objectUrlRef.current = null;
        }
        setPosterFile(null);
        setPosterUrl("");
        setPosterPreview(null);
        setPosterError(null);
        setPosterUrlLoadError(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-brand-surface border border-neutral-800 rounded-2xl p-6 sm:p-8 flex flex-col gap-6 shadow-2xl relative"
    >
      <AddMediaFormAlerts
        isLocked={isLocked}
        duplicateWarning={duplicateWarning}
        createdMediaId={createdMediaId}
        errorMessage={errorMessage}
      />

      {/* Section 1: Media Type & Primary Identifiers */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            Core Media Metadata
          </h3>

          <div className="flex items-center bg-neutral-900 border border-neutral-700/60 rounded-xl p-1 gap-1">
            <button
              type="button"
              onClick={() => updateField("mediaType", "movie")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                form.mediaType === "movie"
                  ? "bg-brand-lime text-black"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Movie</span>
            </button>
            <button
              type="button"
              onClick={() => updateField("mediaType", "tv")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                form.mediaType === "tv"
                  ? "bg-brand-lime text-black"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>TV Series</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1">
              Title <span className="text-rose-400">*</span>
              {isCheckingDuplicate && (
                <Loader2 className="w-3 h-3 animate-spin text-neutral-500 ml-1" />
              )}
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              required
              disabled={isLocked}
              placeholder="e.g. Inception"
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-lime transition-colors disabled:opacity-50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-300">
              Original Title (Optional)
            </label>
            <input
              type="text"
              value={form.originalTitle}
              onChange={(e) => updateField("originalTitle", e.target.value)}
              disabled={isLocked}
              placeholder="e.g. Inception"
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-lime transition-colors disabled:opacity-50"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-neutral-400" />
              Release Year <span className="text-rose-400">*</span>
            </label>
            <input
              type="number"
              value={form.releaseYear}
              onChange={(e) =>
                updateField(
                  "releaseYear",
                  e.target.value ? Number(e.target.value) : "",
                )
              }
              required
              min={1888}
              max={2050}
              disabled={isLocked}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-lime transition-colors disabled:opacity-50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-300">
              Release Date (YYYY-MM-DD)
            </label>
            <input
              type="date"
              value={form.releaseDate}
              onChange={(e) => updateField("releaseDate", e.target.value)}
              disabled={isLocked}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-lime transition-colors disabled:opacity-50"
            />
          </div>

          {form.mediaType === "movie" ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-neutral-400" />
                Runtime (minutes)
              </label>
              <input
                type="number"
                value={form.runtime}
                onChange={(e) =>
                  updateField(
                    "runtime",
                    e.target.value ? Number(e.target.value) : "",
                  )
                }
                placeholder="148"
                min={1}
                disabled={isLocked}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-lime transition-colors disabled:opacity-50"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  Seasons
                </label>
                <input
                  type="number"
                  value={form.seasonsCount}
                  onChange={(e) =>
                    updateField(
                      "seasonsCount",
                      e.target.value ? Number(e.target.value) : "",
                    )
                  }
                  min={1}
                  disabled={isLocked}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-lime disabled:opacity-50"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  Episodes
                </label>
                <input
                  type="number"
                  value={form.episodesCount}
                  onChange={(e) =>
                    updateField(
                      "episodesCount",
                      e.target.value ? Number(e.target.value) : "",
                    )
                  }
                  min={1}
                  disabled={isLocked}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-lime disabled:opacity-50"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Genres Multi-Selection */}
      <GenreSelectorField
        genres={genres}
        selectedGenreIds={form.selectedGenreIds}
        isLocked={isLocked}
        onToggleGenre={toggleGenre}
      />

      {/* Section 3: Cast, Crew & Synopsis */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-neutral-400" />
              Director(s) (comma separated)
            </label>
            <input
              type="text"
              value={form.directors}
              onChange={(e) => updateField("directors", e.target.value)}
              placeholder="e.g. Christopher Nolan"
              disabled={isLocked}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-lime transition-colors disabled:opacity-50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-neutral-400" />
              Principal Cast (comma separated)
            </label>
            <input
              type="text"
              value={form.cast}
              onChange={(e) => updateField("cast", e.target.value)}
              placeholder="e.g. Leonardo DiCaprio, Joseph Gordon-Levitt"
              disabled={isLocked}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-lime transition-colors disabled:opacity-50"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1">
              <Play className="w-3.5 h-3.5 text-neutral-400" />
              YouTube Trailer URL (Optional)
            </label>
            {form.trailerUrl.trim() &&
              (extractYouTubeVideoId(form.trailerUrl) ? (
                <span className="text-[10px] font-mono text-brand-lime bg-brand-lime/10 px-1.5 py-0.5 rounded">
                  Valid YouTube ID: {extractYouTubeVideoId(form.trailerUrl)}
                </span>
              ) : (
                <span className="text-[10px] font-mono text-rose-400">
                  Invalid YouTube URL
                </span>
              ))}
          </div>
          <input
            type="text"
            value={form.trailerUrl}
            onChange={(e) => updateField("trailerUrl", e.target.value)}
            placeholder="https://www.youtube.com/watch?v=YoHD9XEInc0"
            disabled={isLocked}
            className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-lime transition-colors disabled:opacity-50"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-neutral-300">
            Synopsis / Overview
          </label>
          <textarea
            rows={3}
            value={form.overview}
            onChange={(e) => updateField("overview", e.target.value)}
            placeholder="A thief who steals corporate secrets through the use of dream-sharing technology..."
            disabled={isLocked}
            className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-brand-lime transition-colors disabled:opacity-50 resize-y"
          />
        </div>
      </div>

      {/* Section 4: Financials & Classification (FR-16) */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-neutral-800/80 pb-3">
          <DollarSign className="w-4 h-4 text-brand-lime" />
          Financials &amp; Classifications
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-300">
                Budget (USD)
              </label>
              {budgetBand && (
                <span className="text-[10px] font-mono text-brand-lime bg-brand-lime/10 px-1.5 py-0.5 rounded">
                  {budgetBand}
                </span>
              )}
            </div>
            <input
              type="number"
              value={form.budget}
              onChange={(e) =>
                updateField(
                  "budget",
                  e.target.value ? Number(e.target.value) : "",
                )
              }
              placeholder="160000000"
              min={0}
              disabled={isLocked}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-lime disabled:opacity-50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-300">
              Revenue (USD)
            </label>
            <input
              type="number"
              value={form.revenue}
              onChange={(e) =>
                updateField(
                  "revenue",
                  e.target.value ? Number(e.target.value) : "",
                )
              }
              placeholder="836800000"
              min={0}
              disabled={isLocked}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-lime disabled:opacity-50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1">
              Age Rating
            </label>
            <select
              value={form.ageRating}
              onChange={(e) => updateField("ageRating", e.target.value)}
              disabled={isLocked}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-lime disabled:opacity-50"
            >
              {AGE_RATINGS.map((rate) => (
                <option key={rate} value={rate}>
                  {rate}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1">
              Primary Country
            </label>
            <input
              type="text"
              value={form.country}
              onChange={(e) => updateField("country", e.target.value)}
              placeholder="United States"
              disabled={isLocked}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-lime disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Section 5: Poster Upload or Image URL (FR-20, UC-03) */}
      <PosterArtworkField
        posterMode={posterMode}
        posterFile={posterFile}
        posterUrl={posterUrl}
        posterPreview={posterPreview}
        posterError={posterError}
        posterUrlLoadError={posterUrlLoadError}
        isLocked={isLocked}
        fileInputRef={fileInputRef}
        onModeChange={handlePosterModeChange}
        onFileChange={handleFileChange}
        onUrlChange={handlePosterUrlChange}
        onClear={clearPosterSelection}
        onPreviewLoadError={() => setPosterUrlLoadError(true)}
      />

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-neutral-800/80">
        <span className="text-xs text-neutral-400">* Required fields.</span>

        <Button
          type="submit"
          size="md"
          disabled={
            isLocked ||
            Boolean(duplicateWarning) ||
            isPending ||
            isUploadingPoster
          }
          isLoading={isPending || isUploadingPoster}
        >
          {isLocked ? (
            <>
              <Lock className="w-4 h-4 mr-1.5" />
              <span>Locked</span>
            </>
          ) : isPending || isUploadingPoster ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              <span>
                {isUploadingPoster ? "Uploading Poster..." : "Saving Record..."}
              </span>
            </>
          ) : (
            <span>Add Media Record</span>
          )}
        </Button>
      </div>
    </form>
  );
}
