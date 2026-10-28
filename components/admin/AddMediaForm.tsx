"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Film,
  Tv,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Loader2,
  DollarSign,
  Calendar,
  Clock,
  User,
  Users,
  Tag,
  ExternalLink,
} from "lucide-react";
import Button from "@/components/Button";
import type { GenreRow } from "@/types/media";
import {
  createMediaItemAction,
  checkDuplicateMediaAction,
  uploadMediaPosterAction,
  type IngestMediaInput,
} from "@/app/actions/admin";

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

function formatBudgetBand(budgetNum?: number): string | null {
  if (!budgetNum || budgetNum <= 0) return null;
  if (budgetNum < 15_000_000) return "Low (< $15M)";
  if (budgetNum <= 60_000_000) return "Medium ($15M–$60M)";
  if (budgetNum <= 120_000_000) return "High ($60M–$120M)";
  return "Blockbuster (> $120M)";
}

export function AddMediaForm({
  genres,
  systemStatus,
  onSuccess,
}: AddMediaFormProps) {
  const [isPending, startTransition] = useTransition();

  // Form Fields
  const [mediaType, setMediaType] = useState<"movie" | "tv">("movie");
  const [title, setTitle] = useState("");
  const [originalTitle, setOriginalTitle] = useState("");
  const [releaseYear, setReleaseYear] = useState<number>(
    new Date().getFullYear(),
  );
  const [releaseDate, setReleaseDate] = useState("");
  const [runtime, setRuntime] = useState<number | "">("");
  const [seasonsCount, setSeasonsCount] = useState<number | "">(1);
  const [episodesCount, setEpisodesCount] = useState<number | "">("");
  const [overview, setOverview] = useState("");
  const [directors, setDirectors] = useState("");
  const [cast, setCast] = useState("");
  const [tagline, setTagline] = useState("");
  const [selectedGenreIds, setSelectedGenreIds] = useState<number[]>([]);
  const [budget, setBudget] = useState<number | "">("");
  const [revenue, setRevenue] = useState<number | "">("");
  const [ageRating, setAgeRating] = useState("PG-13");
  const [country, setCountry] = useState("United States");

  // Poster State
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const [isUploadingPoster, setIsUploadingPoster] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Duplicate Check State (FR-17)
  const [duplicateWarning, setDuplicateWarning] = useState<{
    id: string;
    title: string;
    release_year: number;
  } | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);

  // Submission Status
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdMediaId, setCreatedMediaId] = useState<string | null>(null);

  const isLocked = systemStatus === "Updating";

  // Debounced duplicate detection check (FR-17)
  useEffect(() => {
    const cleanTitle = title.trim();

    const timer = setTimeout(async () => {
      if (!cleanTitle || !releaseYear || releaseYear < 1888) {
        setDuplicateWarning(null);
        return;
      }

      setIsCheckingDuplicate(true);
      const res = await checkDuplicateMediaAction(
        cleanTitle,
        Number(releaseYear),
      );
      setIsCheckingDuplicate(false);
      if (res.exists && res.existingItem) {
        setDuplicateWarning(res.existingItem);
      } else {
        setDuplicateWarning(null);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [title, releaseYear]);

  // Handle Genre Chip Toggle
  const toggleGenre = (genreId: number) => {
    setSelectedGenreIds((prev) =>
      prev.includes(genreId)
        ? prev.filter((id) => id !== genreId)
        : [...prev, genreId],
    );
  };

  // Handle File Selection for Poster
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPosterFile(file);
      setPosterPreview(URL.createObjectURL(file));
    }
  };

  const budgetBand = formatBudgetBand(
    typeof budget === "number" ? budget : undefined,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setCreatedMediaId(null);

    // Front-end lock check (FR-19)
    if (isLocked) {
      setErrorMessage(
        "System synchronization is active ('Updating'). Manual media ingestion is locked. Try again later.",
      );
      return;
    }

    // Duplicate check validation (FR-17)
    if (duplicateWarning) {
      setErrorMessage(
        `Cannot save duplicate: "${duplicateWarning.title}" (${duplicateWarning.release_year}) already exists in the catalog.`,
      );
      return;
    }

    if (!title.trim()) {
      setErrorMessage("Please enter a media title.");
      return;
    }

    if (!releaseYear || releaseYear < 1888 || releaseYear > 2050) {
      setErrorMessage("Please specify a valid release year (1888–2050).");
      return;
    }

    startTransition(async () => {
      let uploadedPosterUrl: string | null = null;

      // 1. Upload poster if file selected (FR-20)
      if (posterFile) {
        setIsUploadingPoster(true);
        const formData = new FormData();
        formData.append("file", posterFile);
        const uploadRes = await uploadMediaPosterAction(formData);
        setIsUploadingPoster(false);

        if (!uploadRes.success || !uploadRes.data?.url) {
          setErrorMessage(uploadRes.error || "Failed to upload poster image.");
          return;
        }
        uploadedPosterUrl = uploadRes.data.url;
      }

      // 2. Prepare payload (FR-16, UC-03)
      const directorsList = directors
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const castList = cast
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const input: IngestMediaInput = {
        title: title.trim(),
        original_title: originalTitle.trim() || null,
        media_type: mediaType,
        release_year: Number(releaseYear),
        release_date: releaseDate || null,
        runtime: typeof runtime === "number" ? runtime : null,
        seasons_count:
          mediaType === "tv" && typeof seasonsCount === "number"
            ? seasonsCount
            : null,
        episodes_count:
          mediaType === "tv" && typeof episodesCount === "number"
            ? episodesCount
            : null,
        overview: overview.trim() || null,
        poster_path: uploadedPosterUrl,
        budget: typeof budget === "number" ? budget : null,
        revenue: typeof revenue === "number" ? revenue : null,
        age_rating: ageRating || null,
        country: country.trim() || null,
        countries: country.trim() ? [country.trim()] : [],
        genre_ids: selectedGenreIds,
        directors: directorsList,
        cast: castList,
        tagline: tagline.trim() || null,
      };

      // 3. Commit to database
      const result = await createMediaItemAction(input);

      if (!result.success || !result.data?.mediaId) {
        setErrorMessage(
          result.error || "Failed to add media item to the catalog.",
        );
      } else {
        const newId = result.data.mediaId;
        setCreatedMediaId(newId);
        onSuccess?.(newId);

        // Reset form inputs
        setTitle("");
        setOriginalTitle("");
        setOverview("");
        setDirectors("");
        setCast("");
        setTagline("");
        setSelectedGenreIds([]);
        setBudget("");
        setRevenue("");
        setPosterFile(null);
        setPosterPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-brand-surface border border-neutral-800 rounded-2xl p-6 sm:p-8 flex flex-col gap-6 shadow-2xl relative"
    >
      {/* FR-19 System Lock Alert Banner */}
      {isLocked && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3 text-amber-300">
          <Lock className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
          <div className="text-sm">
            <p className="font-bold">
              System Synchronization Active (Updating)
            </p>
            <p className="text-xs text-amber-300/90 mt-0.5">
              Manual movie addition and catalog modifications are currently
              locked to avoid write conflicts. Please{" "}
              <strong>Try again later</strong> once background sync finishes.
            </p>
          </div>
        </div>
      )}

      {/* FR-17 Duplicate Detection Alert Banner */}
      {duplicateWarning && (
        <div className="p-4 flex items-start justify-between gap-3 text-rose-300 animate-fadeIn">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
            <div className="text-sm">
              <p className="font-bold">Duplicate Entry Detected</p>
              <p className="text-xs text-rose-300/90 mt-0.5">
                A media item titled{" "}
                <strong>&quot;{duplicateWarning.title}&quot;</strong> released
                in <strong>{duplicateWarning.release_year}</strong> already
                exists in the catalog. Creation is blocked to prevent duplicate
                records.
              </p>
            </div>
          </div>
          <Link
            href={`/movie/${duplicateWarning.id}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-200 underline hover:text-white shrink-0 mt-0.5"
          >
            <span>View existing</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Success Notification */}
      {createdMediaId && (
        <div className="p-4 flex items-center justify-between gap-3 text-emerald-300">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            <div>
              <p className="text-sm font-bold">
                Media successfully ingested into catalog!
              </p>
            </div>
          </div>
          <Link
            href={`/movie/${createdMediaId}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-lime text-black font-semibold text-xs hover:bg-[#96d862] transition-colors shrink-0"
          >
            <span>View Movie</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="rounded-xl p-4 text-xs text-rose-300">
          {errorMessage}
        </div>
      )}

      {/* Section 1: Media Type & Primary Identifiers */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            Core Media Metadata
          </h3>

          {/* Media Type Toggle */}
          <div className="flex items-center bg-neutral-900 border border-neutral-700/60 rounded-xl p-1 gap-1">
            <button
              type="button"
              onClick={() => setMediaType("movie")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                mediaType === "movie"
                  ? "bg-brand-lime text-black"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Movie</span>
            </button>
            <button
              type="button"
              onClick={() => setMediaType("tv")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                mediaType === "tv"
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
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1">
              Title <span className="text-rose-400">*</span>
              {isCheckingDuplicate && (
                <Loader2 className="w-3 h-3 animate-spin text-neutral-500 ml-1" />
              )}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={isLocked}
              placeholder="e.g. Inception"
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-lime transition-colors disabled:opacity-50"
            />
          </div>

          {/* Original Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-300">
              Original Title (Optional)
            </label>
            <input
              type="text"
              value={originalTitle}
              onChange={(e) => setOriginalTitle(e.target.value)}
              disabled={isLocked}
              placeholder="e.g. Inception"
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-lime transition-colors disabled:opacity-50"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Release Year */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-neutral-400" />
              Release Year <span className="text-rose-400">*</span>
            </label>
            <input
              type="number"
              value={releaseYear}
              onChange={(e) =>
                setReleaseYear(
                  e.target.value
                    ? Number(e.target.value)
                    : (0 as unknown as number),
                )
              }
              required
              min={1888}
              max={2050}
              disabled={isLocked}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-lime transition-colors disabled:opacity-50"
            />
          </div>

          {/* Release Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-300">
              Release Date (YYYY-MM-DD)
            </label>
            <input
              type="date"
              value={releaseDate}
              onChange={(e) => setReleaseDate(e.target.value)}
              disabled={isLocked}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-lime transition-colors disabled:opacity-50"
            />
          </div>

          {/* Runtime or Seasons */}
          {mediaType === "movie" ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-neutral-400" />
                Runtime (minutes)
              </label>
              <input
                type="number"
                value={runtime}
                onChange={(e) =>
                  setRuntime(e.target.value ? Number(e.target.value) : "")
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
                  value={seasonsCount}
                  onChange={(e) =>
                    setSeasonsCount(
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
                  value={episodesCount}
                  onChange={(e) =>
                    setEpisodesCount(
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
      <div className="space-y-3">
        <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <Tag className="w-4 h-4 text-brand-lime" />
          Genres & Categories
        </label>
        <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-2 bg-neutral-900/60 border border-neutral-800 rounded-xl">
          {genres.map((g) => {
            const isSelected = selectedGenreIds.includes(g.id);
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => toggleGenre(g.id)}
                disabled={isLocked}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  isSelected
                    ? "bg-[#85c355] text-black shadow-xs font-bold"
                    : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white"
                } disabled:opacity-50`}
              >
                {g.name}
              </button>
            );
          })}
        </div>
      </div>

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
              value={directors}
              onChange={(e) => setDirectors(e.target.value)}
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
              value={cast}
              onChange={(e) => setCast(e.target.value)}
              placeholder="e.g. Leonardo DiCaprio, Joseph Gordon-Levitt"
              disabled={isLocked}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-lime transition-colors disabled:opacity-50"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-neutral-300">
            Synopsis / Overview
          </label>
          <textarea
            rows={3}
            value={overview}
            onChange={(e) => setOverview(e.target.value)}
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
          Financials & Classifications
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {/* Budget */}
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
              value={budget}
              onChange={(e) =>
                setBudget(e.target.value ? Number(e.target.value) : "")
              }
              placeholder="160000000"
              min={0}
              disabled={isLocked}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-lime disabled:opacity-50"
            />
          </div>

          {/* Revenue */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-300">
              Revenue (USD)
            </label>
            <input
              type="number"
              value={revenue}
              onChange={(e) =>
                setRevenue(e.target.value ? Number(e.target.value) : "")
              }
              placeholder="836800000"
              min={0}
              disabled={isLocked}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-lime disabled:opacity-50"
            />
          </div>

          {/* Age Rating */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1">
              Age Rating
            </label>
            <select
              value={ageRating}
              onChange={(e) => setAgeRating(e.target.value)}
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

          {/* Country */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1">
              Primary Country
            </label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="United States"
              disabled={isLocked}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-lime disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Section 5: Poster Upload (FR-20, UC-03) */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          Poster Upload
        </label>

        <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-neutral-900/60 border border-neutral-800 rounded-xl">
          {/* Thumbnail Preview */}
          <div className="w-24 h-36 relative bg-neutral-800 rounded-lg overflow-hidden border border-neutral-700 flex items-center justify-center shrink-0">
            {posterPreview ? (
              <Image
                src={posterPreview}
                alt="Poster preview"
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <Film className="w-8 h-8 text-neutral-600" />
            )}
          </div>

          <div className="flex-1 space-y-2 text-center sm:text-left">
            <p className="text-xs text-neutral-300 font-medium">
              Upload poster artwork (.jpg, .png, .webp).
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              disabled={isLocked}
              className="hidden"
              id="admin-poster-upload"
            />

            <Button
              type="button"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLocked}
              className="text-xs mt-2"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              <span>
                {posterFile ? "Change Selected Image" : "Choose Image File"}
              </span>
            </Button>
            {posterFile && (
              <span className="ml-2 text-xs text-brand-lime font-mono">
                {posterFile.name} ({(posterFile.size / 1024).toFixed(0)} KB)
              </span>
            )}
          </div>
        </div>
      </div>

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
