"use server";

import { revalidatePath } from "next/cache";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MediaMetadata } from "@/types/media";
import type { Json } from "@/types/database.types";

export interface SystemStateData {
  status: "Free" | "Updating";
  message: string | null;
  updated_at: string | null;
}

export interface IngestMediaInput {
  title: string;
  original_title?: string | null;
  media_type: "movie" | "tv";
  release_year: number;
  release_date?: string | null;
  runtime?: number | null;
  seasons_count?: number | null;
  episodes_count?: number | null;
  overview?: string | null;
  status?: string | null;
  poster_path?: string | null;
  budget?: number | null;
  revenue?: number | null;
  age_rating?: string | null;
  country?: string | null;
  countries?: string[];
  genre_ids: number[];
  directors?: string[];
  cast?: string[];
  tagline?: string | null;
}

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

function calculateBudgetCategory(budget?: number | null): string | null {
  if (!budget || budget <= 0) return null;
  if (budget < 15_000_000) return "Low (< $15M)";
  if (budget <= 60_000_000) return "Medium ($15M–$60M)";
  if (budget <= 120_000_000) return "High ($60M–$120M)";
  return "Blockbuster (> $120M)";
}

/**
 * Validates that the active session belongs to a user with the 'admin' role.
 */
export async function verifyAdminSession() {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { isAdmin: false, user: null, error: "Authentication required" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return { isAdmin: false, user, error: "Administrator privileges required" };
  }

  return { isAdmin: true, user, error: null };
}

/**
 * Retrieves the current operational state of the system ("Free" vs. "Updating").
 */
export async function getSystemStateAction(): Promise<SystemStateData> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("system_state")
    .select("status, message, updated_at")
    .eq("id", "sync_status")
    .maybeSingle();

  if (error || !data) {
    return {
      status: "Free",
      message: null,
      updated_at: null,
    };
  }

  return {
    status: (data.status as "Free" | "Updating") || "Free",
    message: data.message,
    updated_at: data.updated_at,
  };
}

/**
 * Toggles the system operational lock ("Free" vs. "Updating") (FR-19).
 */
export async function setSystemStateAction(
  status: "Free" | "Updating",
  message?: string
): Promise<ActionResult> {
  const auth = await verifyAdminSession();
  if (!auth.isAdmin) {
    return { success: false, error: auth.error || "Unauthorized" };
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("system_state")
    .upsert({
      id: "sync_status",
      status,
      message: message ?? (status === "Updating" ? "Background synchronization active" : "System operational"),
      updated_at: new Date().toISOString(),
    });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin");
  return { success: true };
}

/**
 * Checks for existing catalog items matching title and release year (FR-17).
 */
export async function checkDuplicateMediaAction(
  title: string,
  releaseYear: number
): Promise<{ exists: boolean; existingItem?: { id: string; title: string; release_year: number } }> {
  const cleanTitle = title.trim();
  if (!cleanTitle || !releaseYear) {
    return { exists: false };
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("media_items")
    .select("id, title, release_year")
    .ilike("title", cleanTitle)
    .eq("release_year", releaseYear)
    .maybeSingle();

  if (error || !data) {
    return { exists: false };
  }

  return {
    exists: true,
    existingItem: {
      id: data.id,
      title: data.title,
      release_year: data.release_year,
    },
  };
}

/**
 * Uploads a poster image to the 'posters' Supabase Storage bucket (FR-20).
 */
export async function uploadMediaPosterAction(formData: FormData): Promise<ActionResult<{ url: string }>> {
  const auth = await verifyAdminSession();
  if (!auth.isAdmin) {
    return { success: false, error: auth.error || "Unauthorized" };
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return { success: false, error: "No image file provided" };
  }

  // Validate format and size (max 8MB)
  const allowedMime = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedMime.includes(file.type)) {
    return { success: false, error: "Invalid image format. Allowed formats: JPG, PNG, WEBP." };
  }

  if (file.size > 8 * 1024 * 1024) {
    return { success: false, error: "Poster file size exceeds the 8MB limit." };
  }

  try {
    const adminClient = createAdminClient();
    const fileExt = file.name.split(".").pop() || "jpg";
    const fileName = `manual/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data: uploadData, error: uploadError } = await adminClient.storage
      .from("posters")
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return { success: false, error: uploadError.message };
    }

    const { data: urlData } = adminClient.storage
      .from("posters")
      .getPublicUrl(uploadData.path);

    return { success: true, data: { url: urlData.publicUrl } };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to upload poster";
    return { success: false, error: msg };
  }
}

/**
 * Ingests a new film or series record into media_items and media_genres (FR-16, UC-03).
 */
export async function createMediaItemAction(
  input: IngestMediaInput
): Promise<ActionResult<{ mediaId: string }>> {
  // 1. Session verification
  const auth = await verifyAdminSession();
  if (!auth.isAdmin) {
    return { success: false, error: auth.error || "Unauthorized" };
  }

  // 2. Check System Operational State (FR-19)
  const systemState = await getSystemStateAction();
  if (systemState.status === "Updating") {
    return {
      success: false,
      code: "SYSTEM_LOCKED",
      error: "System synchronization is active (Updating). Manual editing is temporarily locked. Try again later.",
    };
  }

  // 3. Pre-flight Duplicate Check (FR-17)
  const dupCheck = await checkDuplicateMediaAction(input.title, input.release_year);
  if (dupCheck.exists && dupCheck.existingItem) {
    return {
      success: false,
      code: "DUPLICATE_ENTRY",
      error: `Duplicate Entry Detected: "${dupCheck.existingItem.title}" (${dupCheck.existingItem.release_year}) already exists in the catalog.`,
    };
  }

  // 4. Metadata Structure
  const metadata: MediaMetadata = {
    tagline: input.tagline?.trim() || null,
    directors: input.directors && input.directors.length > 0 ? input.directors : undefined,
    cast: input.cast && input.cast.length > 0 ? input.cast : undefined,
  };

  const budgetCategory = calculateBudgetCategory(input.budget);

  try {
    const adminClient = createAdminClient();

    // 5. Insert into media_items
    const { data: newMedia, error: insertError } = await adminClient
      .from("media_items")
      .insert({
        title: input.title.trim(),
        original_title: input.original_title?.trim() || null,
        media_type: input.media_type,
        release_year: input.release_year,
        release_date: input.release_date || null,
        runtime: input.runtime || null,
        seasons_count: input.media_type === "tv" ? (input.seasons_count || 1) : null,
        episodes_count: input.media_type === "tv" ? (input.episodes_count || null) : null,
        overview: input.overview?.trim() || null,
        status: input.status || "Released",
        poster_path: input.poster_path || null,
        budget: input.budget || null,
        budget_category: budgetCategory,
        revenue: input.revenue || null,
        age_rating: input.age_rating || null,
        country: input.country?.trim() || null,
        countries: input.countries && input.countries.length > 0 ? input.countries : [],
        vote_average: 0.0,
        vote_count: 0,
        metadata: metadata as unknown as Json,
      })
      .select("id")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return {
          success: false,
          code: "DUPLICATE_ENTRY",
          error: `Duplicate Entry: A title with this name and release year already exists in the database.`,
        };
      }
      return { success: false, error: insertError.message };
    }

    const newMediaId = newMedia.id;

    // 6. Associate Genres in media_genres
    if (input.genre_ids && input.genre_ids.length > 0) {
      const genreInserts = input.genre_ids.map((genreId) => ({
        media_id: newMediaId,
        genre_id: genreId,
      }));

      const { error: genreError } = await adminClient
        .from("media_genres")
        .insert(genreInserts);

      if (genreError) {
        console.error("Failed to associate genres:", genreError.message);
      }
    }

    revalidatePath("/catalog");
    revalidatePath("/admin");
    revalidatePath("/");

    return {
      success: true,
      data: { mediaId: newMediaId },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create media item.";
    return { success: false, error: message };
  }
}
