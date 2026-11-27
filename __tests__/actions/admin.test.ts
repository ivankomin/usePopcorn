import { revalidatePath } from "next/cache";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAdminSession } from "@/lib/auth/admin";
import {
  fetchManagedUsers,
  fetchModeratedReviews,
  fetchSystemLogs,
} from "@/lib/admin-queries";
import { logSystemEvent } from "@/lib/logger";
import {
  checkDuplicateMediaAction,
  createMediaItemAction,
  deleteReviewAction,
  getManagedUsersAction,
  getModeratedReviewsAction,
  getSystemLogsAction,
  getSystemStateAction,
  setSystemStateAction,
  toggleUserBlockAction,
  updateReviewStatusAction,
  uploadMediaPosterAction,
  type IngestMediaInput,
} from "@/app/actions/admin";
import type { ReviewModerationStatus } from "@/types/media";

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: jest.fn(),
}));

jest.mock("@/lib/auth/admin", () => ({
  verifyAdminSession: jest.fn(),
}));

jest.mock("@/lib/admin-queries", () => ({
  fetchModeratedReviews: jest.fn(),
  fetchManagedUsers: jest.fn(),
  fetchSystemLogs: jest.fn(),
}));

jest.mock("@/lib/logger", () => ({
  logSystemEvent: jest.fn().mockResolvedValue(undefined),
}));

const mockedRevalidatePath = revalidatePath as jest.MockedFunction<
  typeof revalidatePath
>;
const mockedCreateServerClient = createServerClient as jest.MockedFunction<
  typeof createServerClient
>;
const mockedCreateAdminClient = createAdminClient as jest.MockedFunction<
  typeof createAdminClient
>;
const mockedVerifyAdminSession = verifyAdminSession as jest.MockedFunction<
  typeof verifyAdminSession
>;
const mockedFetchModeratedReviews = fetchModeratedReviews as jest.MockedFunction<
  typeof fetchModeratedReviews
>;
const mockedFetchManagedUsers = fetchManagedUsers as jest.MockedFunction<
  typeof fetchManagedUsers
>;
const mockedFetchSystemLogs = fetchSystemLogs as jest.MockedFunction<
  typeof fetchSystemLogs
>;
const mockedLogSystemEvent = logSystemEvent as jest.MockedFunction<
  typeof logSystemEvent
>;

const ADMIN_SESSION = {
  isAdmin: true,
  user: { id: "admin-1", email: "admin@usepopcorn.app" },
  username: "admin_one",
  error: null,
};

const NON_ADMIN_SESSION = {
  isAdmin: false,
  user: { id: "user-1", email: "user@usepopcorn.app" },
  username: "regular_user",
  error: "Administrator privileges required",
};

function makeMediaInput(
  overrides: Partial<IngestMediaInput> = {},
): IngestMediaInput {
  return {
    title: "Arrival",
    media_type: "movie",
    release_year: 2016,
    runtime: 116,
    budget: 47_000_000,
    genre_ids: [878, 18],
    poster_path: "https://cdn.example.com/arrival.jpg",
    trailer_url: "https://youtu.be/tFMo3UJ4B4g",
    ...overrides,
  };
}

function mockServerQueries(options: {
  systemStatus?: "Free" | "Updating";
  duplicateRow?: { id: string; title: string; release_year: number } | null;
}) {
  mockedCreateServerClient.mockResolvedValue({
    from: jest.fn((table: string) => {
      if (table === "system_state") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: {
                  status: options.systemStatus ?? "Free",
                  message: "OK",
                  updated_at: "2026-11-27T00:00:00Z",
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "media_items") {
        return {
          select: jest.fn().mockReturnValue({
            ilike: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: options.duplicateRow ?? null,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected server table: ${table}`);
    }),
  } as never);
}

describe("app/actions/admin", () => {
  beforeEach(() => {
    mockedVerifyAdminSession.mockResolvedValue(ADMIN_SESSION as never);
  });

  describe("system state & duplicate checks", () => {
    it("defaults getSystemStateAction to Free when DB returns an error", async () => {
      mockedCreateServerClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: null,
                error: { message: "not found" },
              }),
            }),
          }),
        }),
      } as never);

      expect(await getSystemStateAction()).toEqual({
        status: "Free",
        message: null,
        updated_at: null,
      });
    });

    it("blocks non-admins from setSystemStateAction and upserts state for admins", async () => {
      mockedVerifyAdminSession.mockResolvedValueOnce(NON_ADMIN_SESSION as never);
      expect(await setSystemStateAction("Updating")).toEqual({
        success: false,
        error: "Administrator privileges required",
      });

      const upsert = jest.fn().mockResolvedValue({ error: null });
      mockedCreateAdminClient.mockReturnValue({
        from: jest.fn().mockReturnValue({ upsert }),
      } as never);

      const res = await setSystemStateAction("Updating");
      expect(res).toEqual({ success: true });
      expect(upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "sync_status",
          status: "Updating",
          message: "Background synchronization active",
        }),
      );
      expect(mockedRevalidatePath).toHaveBeenCalledWith("/admin");
      expect(mockedRevalidatePath).toHaveBeenCalledWith("/admin/logs");
    });

    it("returns exists: false for blank duplicate checks and exists: true when matched", async () => {
      expect(await checkDuplicateMediaAction("   ", 2020)).toEqual({
        exists: false,
      });

      mockServerQueries({
        duplicateRow: { id: "m-1", title: "Arrival", release_year: 2016 },
      });
      expect(await checkDuplicateMediaAction("Arrival", 2016)).toEqual({
        exists: true,
        existingItem: { id: "m-1", title: "Arrival", release_year: 2016 },
      });
    });
  });

  describe("uploadMediaPosterAction", () => {
    it("rejects non-admins, missing files, invalid MIME types, and files over 5 MB", async () => {
      mockedVerifyAdminSession.mockResolvedValueOnce(NON_ADMIN_SESSION as never);
      expect(await uploadMediaPosterAction(new FormData())).toEqual({
        success: false,
        error: "Administrator privileges required",
      });

      expect(await uploadMediaPosterAction(new FormData())).toEqual({
        success: false,
        error: "No image file provided",
      });

      const badMime = new FormData();
      badMime.append(
        "file",
        new File(["gif"], "poster.gif", { type: "image/gif" }),
      );
      expect(await uploadMediaPosterAction(badMime)).toEqual({
        success: false,
        error: "Invalid image format. Allowed formats: JPG, PNG, WEBP.",
      });

      const oversized = {
        get: () => ({
          name: "huge.jpg",
          type: "image/jpeg",
          size: 5 * 1024 * 1024 + 1,
        }),
      } as unknown as FormData;
      expect(await uploadMediaPosterAction(oversized)).toEqual({
        success: false,
        error: "Poster file size exceeds the 5 MB limit.",
      });
    });

    it("uploads a valid poster image and returns its public URL", async () => {
      const upload = jest.fn().mockResolvedValue({
        data: { path: "manual/123-abc.png" },
        error: null,
      });
      const getPublicUrl = jest.fn().mockReturnValue({
        data: { publicUrl: "https://storage.example.com/manual/123-abc.png" },
      });
      mockedCreateAdminClient.mockReturnValue({
        storage: {
          from: jest.fn().mockReturnValue({ upload, getPublicUrl }),
        },
      } as never);

      const formData = new FormData();
      formData.append(
        "file",
        new File(["png-bytes"], "poster.png", { type: "image/png" }),
      );

      const result = await uploadMediaPosterAction(formData);
      expect(result).toEqual({
        success: true,
        data: { url: "https://storage.example.com/manual/123-abc.png" },
      });
      expect(upload).toHaveBeenCalled();
    });
  });

  describe("createMediaItemAction", () => {
    it("enforces admin role, SYSTEM_LOCKED state, and pre-insert duplicate check", async () => {
      mockedVerifyAdminSession.mockResolvedValueOnce(NON_ADMIN_SESSION as never);
      expect(await createMediaItemAction(makeMediaInput())).toEqual({
        success: false,
        error: "Administrator privileges required",
      });

      mockServerQueries({ systemStatus: "Updating" });
      const locked = await createMediaItemAction(makeMediaInput());
      expect(locked.success).toBe(false);
      expect(locked.code).toBe("SYSTEM_LOCKED");

      mockServerQueries({
        systemStatus: "Free",
        duplicateRow: { id: "dup-1", title: "Arrival", release_year: 2016 },
      });
      const duplicate = await createMediaItemAction(makeMediaInput());
      expect(duplicate.success).toBe(false);
      expect(duplicate.code).toBe("DUPLICATE_ENTRY");
    });

    it("rejects non-http poster URLs, malformed poster URLs, and invalid trailer URLs", async () => {
      mockServerQueries({ systemStatus: "Free", duplicateRow: null });

      const jsPoster = await createMediaItemAction(
        makeMediaInput({ poster_path: "javascript:alert(1)" }),
      );
      expect(jsPoster).toEqual({
        success: false,
        error: "Poster URL must start with http:// or https://.",
      });

      const badPoster = await createMediaItemAction(
        makeMediaInput({ poster_path: "not a url" }),
      );
      expect(badPoster).toEqual({
        success: false,
        error:
          "Invalid poster image URL. Please provide a valid http(s) URL.",
      });

      const badTrailer = await createMediaItemAction(
        makeMediaInput({ trailer_url: "https://vimeo.com/123456" }),
      );
      expect(badTrailer).toEqual({
        success: false,
        error:
          "Invalid trailer URL. Please provide a valid YouTube link or 11-character video ID.",
      });
    });

    it("maps Postgres 23505 unique violations to DUPLICATE_ENTRY", async () => {
      mockServerQueries({ systemStatus: "Free", duplicateRow: null });
      mockedCreateAdminClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: "23505", message: "duplicate key" },
              }),
            }),
          }),
        }),
      } as never);

      const result = await createMediaItemAction(makeMediaInput());
      expect(result.success).toBe(false);
      expect(result.code).toBe("DUPLICATE_ENTRY");
    });

    it("inserts media + genres with computed budget_category & trailer_key and revalidates pages", async () => {
      mockServerQueries({ systemStatus: "Free", duplicateRow: null });

      const mediaInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest
            .fn()
            .mockResolvedValue({ data: { id: "new-media-1" }, error: null }),
        }),
      });
      const genresInsert = jest.fn().mockResolvedValue({ error: null });

      mockedCreateAdminClient.mockReturnValue({
        from: jest.fn((table: string) => {
          if (table === "media_items") return { insert: mediaInsert };
          if (table === "media_genres") return { insert: genresInsert };
          throw new Error(`Unexpected table: ${table}`);
        }),
      } as never);

      const result = await createMediaItemAction(makeMediaInput());

      expect(result).toEqual({
        success: true,
        data: { mediaId: "new-media-1" },
      });
      expect(mediaInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Arrival",
          budget_category: "Medium ($15M–$60M)",
          metadata: expect.objectContaining({ trailer_key: "tFMo3UJ4B4g" }),
        }),
      );
      expect(genresInsert).toHaveBeenCalledWith([
        { media_id: "new-media-1", genre_id: 878 },
        { media_id: "new-media-1", genre_id: 18 },
      ]);
      expect(mockedRevalidatePath).toHaveBeenCalledWith("/catalog");
      expect(mockedRevalidatePath).toHaveBeenCalledWith("/admin");
      expect(mockedRevalidatePath).toHaveBeenCalledWith("/admin/logs");
      expect(mockedRevalidatePath).toHaveBeenCalledWith("/");
    });
  });

  describe("review moderation & admin query actions", () => {
    it("validates review moderation status and revalidates movie details page on update", async () => {
      expect(
        await updateReviewStatusAction(
          "rev-1",
          "invalid" as ReviewModerationStatus,
        ),
      ).toEqual({ success: false, error: "Invalid status value" });

      mockedCreateAdminClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { media_id: "m-42" },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      } as never);

      expect(await updateReviewStatusAction("rev-1", "flagged")).toEqual({
        success: true,
      });
      expect(mockedRevalidatePath).toHaveBeenCalledWith("/movie/m-42");
    });

    it("deletes reviews and logs moderation audit events", async () => {
      mockedCreateAdminClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { media_id: "m-7" },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      } as never);

      expect(await deleteReviewAction("rev-delete-1")).toEqual({
        success: true,
      });
      expect(mockedLogSystemEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "warn",
          action: "admin.review_deleted",
        }),
      );
      expect(mockedRevalidatePath).toHaveBeenCalledWith("/movie/m-7");
    });

    it("enforces admin guard and delegates read actions to admin-queries", async () => {
      mockedVerifyAdminSession.mockResolvedValueOnce(NON_ADMIN_SESSION as never);
      expect((await getModeratedReviewsAction()).success).toBe(false);

      mockedFetchModeratedReviews.mockResolvedValue({ reviews: [] } as never);
      mockedFetchManagedUsers.mockResolvedValue({ users: [] } as never);
      mockedFetchSystemLogs.mockResolvedValue({ logs: [] } as never);

      expect((await getModeratedReviewsAction({ status: "flagged" })).success).toBe(
        true,
      );
      expect((await getManagedUsersAction({ status: "blocked" })).success).toBe(
        true,
      );
      expect((await getSystemLogsAction({ level: "error" })).success).toBe(
        true,
      );
      expect(mockedFetchModeratedReviews).toHaveBeenCalledWith({
        status: "flagged",
      });
      expect(mockedFetchManagedUsers).toHaveBeenCalledWith({
        status: "blocked",
      });
      expect(mockedFetchSystemLogs).toHaveBeenCalledWith({ level: "error" });
    });
  });

  describe("toggleUserBlockAction", () => {
    it("prevents self-blocking and blocking another administrator", async () => {
      expect(await toggleUserBlockAction("admin-1", true)).toEqual({
        success: false,
        error: "You cannot block your own administrator account.",
      });

      mockedCreateAdminClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: { id: "admin-2", username: "other_admin", role: "admin" },
                error: null,
              }),
            }),
          }),
        }),
      } as never);

      expect(await toggleUserBlockAction("admin-2", true)).toEqual({
        success: false,
        error: "Administrator accounts cannot be blocked.",
      });
    });

    it("blocks and unblocks a regular user with proper ban_duration and default reason", async () => {
      const updateUserById = jest.fn().mockResolvedValue({ error: null });
      const profileUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      mockedCreateAdminClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: { id: "u-5", username: "spammer", role: "user" },
                error: null,
              }),
            }),
          }),
          update: profileUpdate,
        }),
        auth: { admin: { updateUserById } },
      } as never);

      const blocked = await toggleUserBlockAction("u-5", true, "   ");
      expect(blocked.success).toBe(true);
      expect(blocked.data?.is_blocked).toBe(true);
      expect(blocked.data?.blocked_reason).toBe("Violation of platform rules");
      expect(updateUserById).toHaveBeenCalledWith("u-5", {
        ban_duration: "876000h",
      });

      const unblocked = await toggleUserBlockAction("u-5", false);
      expect(unblocked).toEqual({
        success: true,
        data: {
          is_blocked: false,
          blocked_reason: null,
          blocked_at: null,
        },
      });
      expect(updateUserById).toHaveBeenCalledWith("u-5", {
        ban_duration: "none",
      });
    });
  });
});
