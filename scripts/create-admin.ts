import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment");
  process.exit(1);
}

const supabaseAdmin = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  const adminEmail = "admin@usepopcorn.com";
  const adminPassword = "AdminPopcorn2026!";
  const adminUsername = "popcorn_admin";

  console.log(`Checking for existing admin user: ${adminEmail}...`);

  const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) {
    console.error("Failed to list users:", listError.message);
    process.exit(1);
  }

  const existingUser = users.find((u) => u.email?.toLowerCase() === adminEmail.toLowerCase());
  let adminUserId = existingUser?.id;

  if (existingUser) {
    adminUserId = existingUser.id;
    console.log(`Admin user already exists with ID: ${adminUserId}. Updating password and metadata...`);
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(adminUserId, {
      password: adminPassword,
      email_confirm: true,
      user_metadata: { username: adminUsername },
    });
    if (updateError) {
      console.error("Failed to update user:", updateError.message);
      process.exit(1);
    }
  } else {
    console.log("Creating new admin user in auth.users...");
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { username: adminUsername },
    });

    if (createError || !newUser?.user) {
      console.error("Failed to create admin user:", createError?.message);
      process.exit(1);
    }
    adminUserId = newUser.user.id;
    console.log(`Created admin user with ID: ${adminUserId}`);
  }

  if (!adminUserId) {
    console.error("Admin user ID is missing.");
    process.exit(1);
  }

  // Ensure public.profiles has role = 'admin'
  console.log("Synchronizing public.profiles role to 'admin'...");
  const { error: profileUpsertError } = await supabaseAdmin
    .from("profiles")
    .upsert({
      id: adminUserId,
      username: adminUsername,
      role: "admin",
      updated_at: new Date().toISOString(),
    });

  if (profileUpsertError) {
    console.error("Failed to update profile role:", profileUpsertError.message);
    process.exit(1);
  }

  console.log("\n==========================================");
  console.log("Admin account successfully provisioned!");
  console.log(`Email:    ${adminEmail}`);
  console.log(`Password: ${adminPassword}`);
  console.log(`Role:     admin`);
  console.log("==========================================\n");
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
