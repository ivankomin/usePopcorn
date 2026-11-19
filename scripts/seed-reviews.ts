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

const TARGET_REVIEWS = parseInt(process.env.SEED_REVIEWS_COUNT || "300", 10);

const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Synthetic seed reviewer profiles only (never touches real user accounts)
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
  { username: "binge_watcher_leo", email: "leo_binge@seed.usepopcorn.local" },
  { username: "nora_framebyframe", email: "nora_frames@seed.usepopcorn.local" },
  { username: "david_reel_talk", email: "david_reel@seed.usepopcorn.local" },
  { username: "maya_screennotes", email: "maya_notes@seed.usepopcorn.local" },
  { username: "liam_midnightwatch", email: "liam_midnight@seed.usepopcorn.local" },
  { username: "chloe_storycraft", email: "chloe_story@seed.usepopcorn.local" },
];

// Sentiment-matched review templates
const HIGH_REVIEW_TEMPLATES = [
  "An absolute masterpiece from start to finish. The direction, cinematography, and score work in complete harmony to create an unforgettable journey.",
  "Brilliant storytelling with incredible emotional depth. It completely exceeded my expectations and kept me hooked from beginning to end.",
  "Stunning visual aesthetics paired with a deeply captivating plot. The world-building feels authentic, and the character arcs are genuinely compelling and well-earned.",
  "A masterclass in tension and pacing. Every scene feels deliberate, and the payoff in the final stretch is nothing short of breathtaking.",
  "Phenomenal acting and razor-sharp dialogue. One of those rare titles that you immediately want to revisit as soon as the credits roll.",
  "Superb cinematography and stellar performances across the entire ensemble. The score elevates every emotional beat perfectly.",
  "Genuinely surprising twists and top-tier sound design. It manages to balance high-stakes momentum with thoughtful character development.",
  "Captivating from the opening shot. The atmospheric lighting and nuanced performances make this an instant standout in its genre.",
  "Incredible attention to detail in every frame. The production design and performances give it a grounded realism that sticks with you.",
  "A gripping and poignant narrative that stays with you long after it ends. Highly recommended for anyone who appreciates top-notch storytelling.",
  "Bold, visionary, and effortlessly absorbing. It takes creative risks that pay off magnificently, delivering both spectacle and substance.",
  "Heartfelt, funny, and surprisingly emotional. The chemistry between the leads is infectious and carries the entire experience effortlessly.",
  "A dark, stylish, and intense thrill ride. Confident direction and rich psychological undertones give it tremendous replay value.",
  "Remarkable writing with layered characters and genuine moral ambiguity. Not a straightforward story, which makes it all the more rewarding.",
  "Outstanding lead performance that anchors every moment. Even during the quieter scenes, you cannot take your eyes off the screen.",
  "A modern classic in the making. Tightly crafted, emotionally resonant, and endlessly memorable.",
];

const SOLID_REVIEW_TEMPLATES = [
  "A thoroughly engaging watch with sharp pacing. While a few story beats feel somewhat familiar, the execution and charisma of the cast make it very enjoyable.",
  "A visual feast with an evocative soundtrack. Even when the pacing slows down a bit in the middle, the atmosphere keeps you invested.",
  "Smart, stylish, and very entertaining. It delivers exactly what you hope for and leaves a strong impression.",
  "Fun, engaging, and thoroughly well-made. Great weekend watch that rarely drags.",
  "Solid entry with fantastic art direction and crisp dialogue. Definitely worth adding to your watchlist.",
  "Impressive technical craftsmanship with great editing and a memorable score, even if the plot plays it a little safe.",
  "A thought-provoking narrative that blends familiar genre elements with strong character work and a satisfying payoff.",
  "Engrossing overall. Terrific performances make even the secondary characters feel rich and well-realized.",
  "Well-acted and nicely shot with plenty of standout moments. A couple of uneven patches, but still an easy recommendation.",
  "Really enjoyable premise handled with care. Not flawless, yet consistently compelling from start to finish.",
];

const MIXED_REVIEW_TEMPLATES = [
  "Interesting concept and strong visuals, though the pacing feels uneven and some subplots never fully pay off.",
  "Great performances from the cast, but the writing struggles to maintain momentum in the second half.",
  "Ambitious and visually polished, yet it feels slightly overstuffed and predictable in spots. Worth a watch if you love the genre.",
  "Has a few genuinely memorable sequences, though the overall story feels like it could have been tighter and more focused.",
  "Decent entertainment with nice production values, even if it doesn't quite live up to all the hype.",
];

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRatingForTitle(imdbRating: number | null): number {
  const base = imdbRating && imdbRating > 0 ? imdbRating : 7.5;
  // Bell-ish variance around base (-2 to +2)
  const offsets = [-2, -1, -1, 0, 0, 0, 1, 1, 2];
  const raw = Math.round(base + getRandomElement(offsets));
  return Math.max(4, Math.min(10, raw));
}

function getReviewTemplateForRating(rating: number | null): string {
  if (rating === null || rating >= 8) {
    return getRandomElement(HIGH_REVIEW_TEMPLATES);
  }
  if (rating >= 6) {
    return getRandomElement(SOLID_REVIEW_TEMPLATES);
  }
  return getRandomElement(MIXED_REVIEW_TEMPLATES);
}

function getRandomPastDate(): string {
  const now = Date.now();
  const pastDays = Math.floor(Math.random() * 60) + 1;
  const pastHours = Math.floor(Math.random() * 24);
  const date = new Date(
    now - pastDays * 24 * 60 * 60 * 1000 - pastHours * 60 * 60 * 1000,
  );
  return date.toISOString();
}

async function ensureSeedReviewers(): Promise<string[]> {
  console.log("Ensuring synthetic seed reviewer accounts exist...");
  const userIds: string[] = [];

  for (const reviewer of SEED_REVIEWERS) {
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", reviewer.username)
      .maybeSingle();

    if (existingProfile) {
      userIds.push(existingProfile.id);
      continue;
    }

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
      await supabase.from("profiles").upsert(
        {
          id: created.user.id,
          username: reviewer.username,
          role: "user",
        },
        { onConflict: "id" },
      );
    } else if (error) {
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
        console.warn(
          `Could not create reviewer ${reviewer.username}:`,
          error.message,
        );
      }
    }
  }

  console.log(`Available synthetic reviewer profiles: ${userIds.length}`);
  return userIds;
}

async function seedReviews() {
  console.log(`=== Seeding ${TARGET_REVIEWS} Reviews Across Catalog Media ===`);

  const reviewerIds = await ensureSeedReviewers();
  if (reviewerIds.length === 0) {
    console.error("No reviewer accounts available. Aborting review seeding.");
    process.exit(1);
  }

  // Fetch all catalog media items, prioritizing unreviewed / newest items first
  const { data: mediaItems, error: mediaError } = await supabase
    .from("media_items")
    .select("id, title, imdb_rating, vote_count, created_at")
    .not("tmdb_id", "is", null)
    .order("vote_count", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(300);

  if (mediaError || !mediaItems || mediaItems.length === 0) {
    console.error("Failed to load media items:", mediaError);
    process.exit(1);
  }

  console.log(`Found ${mediaItems.length} candidate media items to review.`);

  // Fetch existing reviews to avoid duplicates
  const usedCombos = new Set<string>();
  const { data: existingReviews } = await supabase
    .from("reviews")
    .select("user_id, media_id")
    .limit(5000);

  if (existingReviews) {
    for (const r of existingReviews) {
      usedCombos.add(`${r.user_id}:${r.media_id}`);
    }
  }

  // Prioritize items with fewer than 2 reviews so every newly seeded item gets coverage
  const underReviewed = mediaItems.filter((m) => (m.vote_count || 0) < 2);
  const pool = underReviewed.length > 0 ? underReviewed : mediaItems;

  const reviewsToInsert: Array<{
    user_id: string;
    media_id: string;
    rating: number | null;
    content: string | null;
    status: string;
    created_at: string;
    updated_at: string;
  }> = [];

  // Pass 1: Guarantee 2 reviews for each under-reviewed item (up to TARGET_REVIEWS)
  for (const media of pool) {
    if (reviewsToInsert.length >= TARGET_REVIEWS) break;
    const perTitle = Math.min(
      3,
      Math.floor(Math.random() * 2) + 2, // 2 or 3 reviews per title
    );

    const shuffledReviewers = [...reviewerIds].sort(() => Math.random() - 0.5);
    let addedForTitle = 0;

    for (const reviewerId of shuffledReviewers) {
      if (addedForTitle >= perTitle || reviewsToInsert.length >= TARGET_REVIEWS) {
        break;
      }

      const comboKey = `${reviewerId}:${media.id}`;
      if (usedCombos.has(comboKey)) continue;
      usedCombos.add(comboKey);

      const typeRoll = Math.random();
      let rating: number | null = null;
      let content: string | null = null;

      if (typeRoll < 0.8) {
        rating = getRatingForTitle(media.imdb_rating);
        content = getReviewTemplateForRating(rating);
      } else if (typeRoll < 0.95) {
        rating = getRatingForTitle(media.imdb_rating);
        content = null;
      } else {
        rating = null;
        content = getReviewTemplateForRating(8);
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
      addedForTitle++;
    }
  }

  // Pass 2: Top up remaining count randomly across all mediaItems
  let attempts = 0;
  while (reviewsToInsert.length < TARGET_REVIEWS && attempts < 2000) {
    attempts++;
    const reviewerId = getRandomElement(reviewerIds);
    const media = getRandomElement(mediaItems);
    const comboKey = `${reviewerId}:${media.id}`;

    if (usedCombos.has(comboKey)) continue;
    usedCombos.add(comboKey);

    const typeRoll = Math.random();
    let rating: number | null = null;
    let content: string | null = null;

    if (typeRoll < 0.8) {
      rating = getRatingForTitle(media.imdb_rating);
      content = getReviewTemplateForRating(rating);
    } else if (typeRoll < 0.95) {
      rating = getRatingForTitle(media.imdb_rating);
      content = null;
    } else {
      rating = null;
      content = getReviewTemplateForRating(8);
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

  console.log(
    `Inserting ${reviewsToInsert.length} generated reviews into Supabase in chunks...`,
  );

  const chunkSize = 50;
  let totalInserted = 0;

  for (let i = 0; i < reviewsToInsert.length; i += chunkSize) {
    const chunk = reviewsToInsert.slice(i, i + chunkSize);
    const { data: inserted, error: insertError } = await supabase
      .from("reviews")
      .upsert(chunk, { onConflict: "user_id,media_id" })
      .select("id");

    if (insertError) {
      console.error("Error inserting seed reviews chunk:", insertError);
      process.exit(1);
    }
    totalInserted += inserted?.length || chunk.length;
  }

  console.log(`Successfully seeded ${totalInserted} reviews!`);

  // Verify recalculated vote_average and vote_count on media_items
  const { data: updatedMedia } = await supabase
    .from("media_items")
    .select("id, title, vote_average, vote_count, imdb_rating")
    .gt("vote_count", 0)
    .order("vote_count", { ascending: false })
    .limit(10);

  console.log(
    "\nSample of media items with updated user ratings & review counts:",
  );
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
