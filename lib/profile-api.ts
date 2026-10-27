import { createClient } from "@/lib/supabase/client";

export interface UploadAvatarResult {
  publicUrl: string;
}

export interface UpdateProfileDetailsParams {
  userId: string;
  currentEmail?: string | null;
  newUsername: string;
  newEmail: string;
}

export interface UpdateProfileDetailsResult {
  emailChanged: boolean;
}

export interface ChangeUserPasswordParams {
  email: string;
  currentPassword: string;
  newPassword: string;
}

/**
 * Uploads a new avatar image to the Supabase Storage 'avatars' bucket,
 * retrieves its public URL, and synchronizes both public.profiles and auth metadata.
 */
export async function uploadUserAvatar(
  userId: string,
  file: File,
  client = createClient()
): Promise<UploadAvatarResult> {
  const fileExt = file.name.split(".").pop() || "jpg";
  const fileName = `${userId}/avatar-${Date.now()}.${fileExt}`;

  // 1. Upload to Supabase Storage bucket 'avatars'
  const { data: uploadData, error: uploadError } = await client.storage
    .from("avatars")
    .upload(fileName, file, {
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  // 2. Get Public URL
  const { data: urlData } = client.storage
    .from("avatars")
    .getPublicUrl(uploadData.path);

  const publicUrl = urlData.publicUrl;

  // 3. Update public.profiles
  const { error: profileError } = await client
    .from("profiles")
    .update({
      avatar_url: publicUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (profileError) {
    throw new Error(profileError.message);
  }

  // 4. Update auth user metadata
  await client.auth.updateUser({
    data: { avatar_url: publicUrl },
  });

  return { publicUrl };
}

/**
 * Updates user contact details (username and email) across both public.profiles
 * and Supabase Auth metadata. Handles email confirmation detection and username uniqueness.
 */
export async function updateProfileDetails(
  params: UpdateProfileDetailsParams,
  client = createClient()
): Promise<UpdateProfileDetailsResult> {
  const { userId, currentEmail, newUsername, newEmail } = params;
  let emailChanged = false;

  // 1. Update Email in Supabase Auth if changed
  if (newEmail !== (currentEmail || "").toLowerCase()) {
    const { error: emailError } = await client.auth.updateUser({
      email: newEmail,
    });

    if (emailError) {
      const errCode = (emailError as { code?: string })?.code;
      const errMsg = emailError.message.toLowerCase();

      if (errCode === "email_exists" || errMsg.includes("already been registered")) {
        throw new Error("This email address is already in use by another account.");
      }

      if (errMsg.includes("rate limit")) {
        throw new Error("Email request limit reached. Please wait a few minutes before trying again.");
      }

      throw new Error(emailError.message);
    }
    emailChanged = true;
  }

  // 2. Update Username in public.profiles
  const { error: profileError } = await client
    .from("profiles")
    .update({
      username: newUsername,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (profileError) {
    if (profileError.code === "23505") {
      throw new Error("This username is already taken. Please choose another.");
    }
    throw new Error(profileError.message);
  }

  // 3. Update auth user metadata
  await client.auth.updateUser({
    data: { username: newUsername },
  });

  return { emailChanged };
}

/**
 * Re-authenticates the user with their current password and securely updates
 * the password using Supabase Auth (bcrypt hashing).
 */
export async function changeUserPassword(
  params: ChangeUserPasswordParams,
  client = createClient()
): Promise<void> {
  const { email, currentPassword, newPassword } = params;

  // 1. Mandatory Re-authentication check
  const { error: reauthError } = await client.auth.signInWithPassword({
    email,
    password: currentPassword,
  });

  if (reauthError) {
    throw new Error(
      "Current password is incorrect. Identity verification failed."
    );
  }

  // 2. Perform password update (Supabase Auth applies bcrypt hashing)
  const { error: updateError } = await client.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    throw new Error(updateError.message);
  }
}
