"use server";

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logSystemEvent } from "@/lib/logger";

export interface UpdateUserEmailResult {
  success: boolean;
  error?: string;
}

/**
 * Server Action to update the user's email directly using the Supabase Admin API.
 * Auto-confirms the email (`email_confirm: true`), completely bypassing
 * transactional email delivery and avoiding email provider rate limits.
 */
export async function updateUserEmailAction(
  newEmail: string
): Promise<UpdateUserEmailResult> {
  // 1. Verify caller authentication via session cookie
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthorized. Please sign in again." };
  }

  const normalizedEmail = newEmail.trim().toLowerCase();

  // If email didn't change, return success early
  if (user.email && user.email.toLowerCase() === normalizedEmail) {
    return { success: true };
  }

  // 2. Perform direct email update with Admin client
  try {
    const adminClient = createAdminClient();
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      user.id,
      {
        email: normalizedEmail,
        email_confirm: true,
      }
    );

    if (updateError) {
      const errMsg = updateError.message.toLowerCase();
      const errCode = (updateError as { code?: string })?.code;

      if (
        errCode === "email_exists" ||
        errMsg.includes("already been registered") ||
        errMsg.includes("already in use")
      ) {
        return {
          success: false,
          error: "This email address is already in use by another account.",
        };
      }

      return { success: false, error: updateError.message };
    }

    await logSystemEvent({
      level: "info",
      category: "auth",
      action: "profile.email_updated",
      message: `User updated account email to ${normalizedEmail}.`,
      actorId: user.id,
      metadata: { previousEmail: user.email ?? null, newEmail: normalizedEmail },
    });

    return { success: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to update email address.";
    await logSystemEvent({
      level: "error",
      category: "auth",
      action: "profile.email_update_failed",
      message: `Failed updating user email: ${message}`,
      actorId: user.id,
    });
    return { success: false, error: message };
  }
}

export interface DeleteUserAccountInput {
  currentPassword: string;
  confirmationText: string;
}

export interface DeleteUserAccountResult {
  success: boolean;
  error?: string;
}

/**
 * Permanently deletes the authenticated user's account and personal data:
 * - Re-authenticates the caller with their current password
 * - Deletes text-only reviews and anonymizes rated reviews (`user_id = NULL`, `content = NULL`)
 *   so aggregate media rating statistics (`vote_average`, `vote_count`) remain accurate
 * - Removes uploaded avatar files from Supabase Storage (`avatars` bucket)
 * - Deletes the Supabase Auth user (cascading `profiles` and `watchlists`, setting `system_logs.actor_id` to NULL)
 */
export async function deleteUserAccountAction(
  input: DeleteUserAccountInput
): Promise<DeleteUserAccountResult> {
  const confirmationText = (input.confirmationText || "").trim();
  const currentPassword = input.currentPassword || "";

  if (confirmationText !== "DELETE") {
    return {
      success: false,
      error: 'Please type "DELETE" to confirm permanent account deletion.',
    };
  }

  if (!currentPassword) {
    return {
      success: false,
      error: "Please enter your current password to verify your identity.",
    };
  }

  // 1. Verify caller authentication via session cookie
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user || !user.email) {
    return { success: false, error: "Unauthorized. Please sign in again." };
  }

  // 2. Re-authenticate with current password
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (reauthError) {
    return {
      success: false,
      error: "Current password is incorrect. Identity verification failed.",
    };
  }

  try {
    const adminClient = createAdminClient();

    // 3. Guard against deleting the last remaining administrator account
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return {
        success: false,
        error: `Failed to verify account status: ${profileError.message}`,
      };
    }

    if (profile?.role === "admin") {
      const { count: adminCount, error: countError } = await adminClient
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin");

      if (countError) {
        return {
          success: false,
          error: `Failed to verify administrator count: ${countError.message}`,
        };
      }

      if ((adminCount ?? 0) <= 1) {
        return {
          success: false,
          error:
            "Cannot delete the last remaining administrator account. Assign another administrator first.",
        };
      }
    }

    // 4a. Delete text-only reviews (no rating statistic to preserve)
    const { count: deletedTextReviewsCount, error: deleteTextError } =
      await adminClient
        .from("reviews")
        .delete({ count: "exact" })
        .eq("user_id", user.id)
        .is("rating", null);

    if (deleteTextError) {
      return {
        success: false,
        error: `Failed to remove personal reviews: ${deleteTextError.message}`,
      };
    }

    // 4b. Anonymize rated reviews: strip user link and written text while preserving numeric rating
    const { count: anonymizedRatingsCount, error: anonymizeError } =
      await adminClient
        .from("reviews")
        .update(
          {
            user_id: null,
            content: null,
            updated_at: new Date().toISOString(),
          },
          { count: "exact" }
        )
        .eq("user_id", user.id)
        .not("rating", "is", null);

    if (anonymizeError) {
      return {
        success: false,
        error: `Failed to anonymize rating statistics: ${anonymizeError.message}`,
      };
    }

    // 5. Delete user avatar files from Supabase Storage (`avatars/<user.id>/*`)
    let deletedAvatarFiles = 0;
    const { data: avatarFiles, error: listAvatarError } =
      await adminClient.storage.from("avatars").list(user.id, { limit: 100 });

    if (!listAvatarError && avatarFiles && avatarFiles.length > 0) {
      const paths = avatarFiles
        .filter((file) => Boolean(file.name))
        .map((file) => `${user.id}/${file.name}`);

      if (paths.length > 0) {
        const { error: removeError } = await adminClient.storage
          .from("avatars")
          .remove(paths);
        if (!removeError) {
          deletedAvatarFiles = paths.length;
        }
      }
    }

    // 6. Permanently delete Supabase Auth user (cascades `profiles` & `watchlists`, nulls `system_logs.actor_id`)
    const { error: deleteUserError } =
      await adminClient.auth.admin.deleteUser(user.id);

    if (deleteUserError) {
      await logSystemEvent({
        level: "error",
        category: "auth",
        action: "account.delete_failed",
        message: `Failed deleting auth user during account closure: ${deleteUserError.message}`,
        actorId: user.id,
      });
      return {
        success: false,
        error: `Failed to delete account: ${deleteUserError.message}`,
      };
    }

    // 7. Record anonymized audit event (no PII retained)
    await logSystemEvent({
      level: "info",
      category: "auth",
      action: "account.deleted",
      message: "User permanently deleted their account and personal data.",
      actorId: null,
      metadata: {
        anonymizedRatingsCount: anonymizedRatingsCount ?? 0,
        deletedTextReviewsCount: deletedTextReviewsCount ?? 0,
        deletedAvatarFiles,
      },
    });

    // 8. Clear session cookies on server client
    await supabase.auth.signOut();

    return { success: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to delete account.";
    await logSystemEvent({
      level: "error",
      category: "auth",
      action: "account.delete_failed",
      message: `Unexpected error deleting account: ${message}`,
      actorId: user.id,
    });
    return { success: false, error: message };
  }
}
