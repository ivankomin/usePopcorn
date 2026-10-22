import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.types";

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local",
  );
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Seed reviewer profiles
const SEED_REVIEWERS = [
  { username: "cine_enthusiast", email: "cine_enthusiast@seed.usepopcorn.local" },
  { username: "film_critic_sam", email: "sam_critic@seed.usepopcorn.local" },
  { username: "movie_buff_elena", email: "elena_buff@seed.usepopcorn.local" },
  { username: "alex_cinema", email: "alex_cinema@seed.usepopcorn.local" },
  { username: "screen_watcher", email: "watcher@seed.usepopcorn.local" },
  { username: "popcorn_master", email: "popcorn_master@seed.usepopcorn.local" },
  { username: "retro_reviewer", email: "retro_reviewer@seed.usepopcorn.local" },
  { username: "hollywood_insider", email: "insider@seed.usepopcorn.local" },
  { username: "indie_darling", email: "indie_darling@seed.usepopcorn.local" },
  { username: "sarah_movies", email: "sarah_movies@seed.usepopcorn.local" },
  { username: "marcus_reviews", email: "marcus_reviews@seed.usepopcorn.local" },
  { username: "olivia_cinematics", email: "olivia_c@seed.usepopcorn.local" },
];

// Rich, varied review templates
const REVIEW_TEMPLATES = [
  "An absolute masterpiece from start to finish. The direction, cinematography, and score work in complete harmony to create an unforgettable cinematic journey. The lead performance alone is deserving of every award.",
  "Brilliant storytelling with incredible emotional depth. It completely exceeded my expectations and kept me on the edge of my seat throughout the entire runtime.",
  "Stunning visual aesthetics paired with a deeply captivating plot. The world-building feels authentic, and the character arcs are genuinely compelling and well-earned.",
  "A masterclass in tension and pacing. Every scene feels deliberate, and the payoff in the third act is nothing short of breathtaking.",
  "Phenomenal acting and breathtaking dialogue. One of those rare titles that you immediately want to rewatch as soon as the credits roll.",
  "Superb cinematography and stellar performances across the entire ensemble. The score elevates every emotional beat perfectly.",
  "A thoroughly engaging watch with sharp pacing. While a few story beats feel somewhat familiar, the execution and charisma of the cast make it thoroughly enjoyable.",
  "Genuinely surprising plot twists and top-tier sound design. It manages to balance high-stakes action with thoughtful character development.",
  "Captivating from the opening shot. The atmospheric lighting and nuanced performances make this a standout in its genre.",
  "Incredible attention to detail in every frame. The practical effects and set design give it a gritty realism that CGI simply cannot replicate.",
  "A gripping and poignant narrative that stays with you long after the film ends. Highly recommended for anyone who appreciates quality filmmaking.",
  "A bold, visionary piece of cinema. It takes creative risks that pay off magnificently, delivering both spectacle and substance.",
  "Heartfelt, funny, and surprisingly emotional. The chemistry between the leads is infectious and carries the entire film effortlessly.",
  "A dark, stylish, and intense thrill ride. The direction is confident, and the psychological undertones add great replay value.",
  "Remarkable screenplay with layered characters and great moral ambiguity. Not your typical straightforward story, which makes it all the more rewarding.",
  "A visual feast with an evocative soundtrack. Even when the pacing slows down, the imagery and atmosphere keep you thoroughly mesmerized.",
  "Outstanding lead performance that anchors the whole story. Even during its quieter moments, you cannot take your eyes off the screen.",
  "Smart, stylish, and immensely entertaining. It delivers exactly what you hope for and then some.",
  "A modern classic in the making. The climax alone will have your heart pounding.",
  "Deeply moving and exquisitely crafted. A triumphant achievement in storytelling.",
  "Fun, engaging, and thoroughly well-made. Great weekend watch that never drags.",
  "Solid entry with fantastic art direction and sharp dialogue. Definitely worth your time.",
  "Impressive technical craftsmanship with outstanding editing and a pulse-pounding score.",
  "A thought-provoking narrative that challenges genre conventions while remaining accessible and intensely entertaining.",
  "Engrossing from the get-go. Terrific performances make even the secondary characters feel rich and fully realized.",
];

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomRating(): number {
  // Weighted towards 7-10 with occasional 5-6
  const weights = [5, 6, 7, 7, 8, 8, 8, 9, 9, 9, 10, 10];
  return getRandomElement(weights);
}

function getRandomPastDate(): string {
  const now = Date.now();
  const pastDays = Math.floor(Math.random() * 45) + 1; // 1 to 45 days ago
  const date = new Date(now - pastDays * 24 * 60 * 60 * 1000);
  return date.toISOString();
}

async function ensureSeedReviewers(): Promise<string[]> {
  console.log("Ensuring seed reviewer accounts exist...");
  const userIds: string[] = [];

  for (const reviewer of SEED_REVIEWERS) {
    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", reviewer.username)
      .maybeSingle();

    if (existingProfile) {
      userIds.push(existingProfile.id);
      continue;
    }

    // Try to create user via admin API
    const { data: created, error } = await supabase.auth.admin.createUser({
      email: reviewer.email,
      password: "SeedPassword123!",
      email_confirm: true,
      user_metadata: {
        username: reviewer.username,
      },
    });

    if (created?.user) {
      userIds.push(created.user.id);

      // Ensure profile row
      await supabase.from("profiles").upsert(
        {
          id: created.user.id,
          username: reviewer.username,
          role: "user",
        },
        { onConflict: "id" },
      );
    } else if (error) {
      // User might already exist in auth but not profiles
      const { data: listData } = await supabase.auth.admin.listUsers();
      const match = listData?.users.find((u) => u.email === reviewer.email);
      if (match) {
        userIds.push(match.id);
        await supabase.from("profiles").upsert(
          {
            id: match.id,
            username: reviewer.username,
            role: "user",
          },
          { onConflict: "id" },
        );
      } else {
        console.warn(`Could not create reviewer ${reviewer.username}:`, error.message);
      }
    }
  }

  // Also include any existing profiles from DB
  const { data: allProfiles } = await supabase
    .from("profiles")
    .select("id, username");

  const combinedIds = Array.from(
    new Set([...userIds, ...(allProfiles || []).map((p) => p.id)]),
  );

  console.log(`Available reviewer profiles: ${combinedIds.length}`);
  return combinedIds;
}

async function seedReviews() {
  console.log("=== Seeding 50 Reviews Across Catalog Media ===");

  const reviewerIds = await ensureSeedReviewers();
  if (reviewerIds.length === 0) {
    console.error("No reviewer accounts available. Aborting review seeding.");
    process.exit(1);
  }

  // Fetch candidate media items
  const { data: mediaItems, error: mediaError } = await supabase
    .from("media_items")
    .select("id, title")
    .limit(40);

  if (mediaError || !mediaItems || mediaItems.length === 0) {
    console.error("Failed to load media items:", mediaError);
    process.exit(1);
  }

  console.log(`Found ${mediaItems.length} candidate media items to review.`);

  // Prepare 50 unique (user_id, media_id) combinations
  const usedCombos = new Set<string>();

  // Fetch already existing reviews to avoid duplicates
  const { data: existingReviews } = await supabase
    .from("reviews")
    .select("user_id, media_id");

  if (existingReviews) {
    for (const r of existingReviews) {
      usedCombos.add(`${r.user_id}:${r.media_id}`);
    }
  }

  const reviewsToInsert: Array<{
    user_id: string;
    media_id: string;
    rating: number | null;
    content: string | null;
    status: string;
    created_at: string;
    updated_at: string;
  }> = [];

  let attempts = 0;
  const targetCount = 50;

  while (reviewsToInsert.length < targetCount && attempts < 500) {
    attempts++;
    const reviewerId = getRandomElement(reviewerIds);
    const media = getRandomElement(mediaItems);
    const comboKey = `${reviewerId}:${media.id}`;

    if (usedCombos.has(comboKey)) {
      continue;
    }
    usedCombos.add(comboKey);

    const typeRoll = Math.random();
    let rating: number | null = null;
    let content: string | null = null;

    if (typeRoll < 0.85) {
      // 85% have both rating and review text
      rating = getRandomRating();
      content = getRandomElement(REVIEW_TEMPLATES);
    } else if (typeRoll < 0.95) {
      // 10% have rating only
      rating = getRandomRating();
      content = null;
    } else {
      // 5% have review text only
      rating = null;
      content = getRandomElement(REVIEW_TEMPLATES);
    }

    const reviewDate = getRandomPastDate();

    reviewsToInsert.push({
      user_id: reviewerId,
      media_id: media.id,
      rating,
      content,
      status: "approved",
      created_at: reviewDate,
      updated_at: reviewDate,
    });
  }

  console.log(`Inserting ${reviewsToInsert.length} generated reviews into Supabase...`);

  const { data: inserted, error: insertError } = await supabase
    .from("reviews")
    .upsert(reviewsToInsert, { onConflict: "user_id,media_id" })
    .select();

  if (insertError) {
    console.error("Error inserting seed reviews:", insertError);
    process.exit(1);
  }

  console.log(`Successfully seeded ${inserted?.length || reviewsToInsert.length} reviews!`);

  // Verify that the trigger recalculated vote_average and vote_count on media_items
  const { data: updatedMedia } = await supabase
    .from("media_items")
    .select("id, title, vote_average, vote_count, imdb_rating")
    .gt("vote_count", 0)
    .order("vote_count", { ascending: false })
    .limit(8);

  console.log("\nSample of media items with newly updated user ratings & review counts:");
  for (const m of updatedMedia || []) {
    console.log(
      ` - "${m.title}": User Rating ${m.vote_average} (${m.vote_count} reviews) | IMDb: ${m.imdb_rating || "N/A"}`,
    );
  }

  console.log("\nSeeding complete!");
}

seedReviews().catch((err) => {
  console.error("Fatal error during review seeding:", err);
  process.exit(1);
});
