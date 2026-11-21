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
