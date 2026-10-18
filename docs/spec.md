# Technical Specification & Database Design Requirements

This document provides a concise architectural and functional extraction from the official project specification ("Кіно-бібліотека"). It is designed as an unambiguous reference for AI coding agents and database migrations.

---

## 1. High-Level System Architecture & Scope

* **Application Model**: Backend-as-a-Service (BaaS) combining a Next.js (App Router) presentation and proxy layer with a Supabase cloud database instance.
* **Database Engine**: PostgreSQL 15+ managed by Supabase.
* **Authentication**: Supabase Auth (JWT session management, cryptographic password hashing via bcrypt). User records map directly from `auth.users`.
* **Data Flow**:
  * External metadata originates from TMDB API and is ingested via an automated offline seeding script (`scripts/seed.ts`).
  * Live user queries (searching, filtering, pagination, watchlist mutation, rating) query the internal Supabase PostgreSQL tables exclusively.
* **Localization**: The UI and all content metadata are standardized in English.

---

## 2. Core Functional Requirements (Database-Relevant)

* **FR-2 & FR-5 (User Roles & Profiles)**:
  * Distinguish user access using a role-based permission model (`user`, `admin`).
  * Support user profile management (username, custom avatar storage references).
* **FR-7, FR-8 & FR-9 (Media Items & Metadata)**:
  * Store titles, release year, release date, runtime/duration, season count, overview, TMDB identifiers, and poster links.
  * Facilitate indexed searches and genre-based multi-category filtering.
  * Support hybrid data storage: structured core fields with JSONB capability for flexible supplementary TMDB metadata.
* **FR-11 & FR-12 (Ratings, Reviews & Aggregate Calculation)**:
  * Allow authenticated users to score a media item on an integer scale from 1 to 10.
  * Enable optional text reviews.
  * A user can submit only one rating/review per media item (subsequent submissions update the existing record).
  * Automatically recalculate the target media item's average rating and total vote count upon review creation, modification, or deletion.
* **FR-13 (Personalized Watchlists)**:
  * Enable authenticated users to organize movies/shows into categorized watchlists (e.g., `plan_to_watch`, `watched`, `favorite`).
  * Ensure user-to-media combinations remain unique within a given watchlist state.
* **FR-16 & FR-17 (Deduplication & Admin Ingestion)**:
  * Strict unique constraints on `tmdb_id` (and composite fallback `title + release_year`) to prevent duplicate catalog entries.
* **FR-20 (Poster Storage)**:
  * Store relative poster image references or Supabase Storage bucket URLs.

---

## 3. Relational Database Schema Specification

### 3.1 Table: `profiles`
Extends `auth.users` to maintain public profile attributes.
* `id` (`UUID`, PK, references `auth.users(id)` ON DELETE CASCADE)
* `username` (`TEXT`, UNIQUE, NOT NULL)
* `avatar_url` (`TEXT`, nullable)
* `role` (`TEXT`, NOT NULL, DEFAULT `'user'`, CHECK `role IN ('user', 'admin')`)
* `created_at` (`TIMESTAMPTZ`, DEFAULT `now()`)
* `updated_at` (`TIMESTAMPTZ`, DEFAULT `now()`)

### 3.2 Table: `genres`
Maintains normalized genre categories.
* `id` (`INTEGER`, PK) — Matches official TMDB genre identifier directly.
* `name` (`TEXT`, UNIQUE, NOT NULL) — Standardized English genre title (e.g., "Action", "Sci-Fi").

### 3.3 Table: `media_items`
Central catalog for movies and TV shows.
* `id` (`UUID`, PK, DEFAULT `gen_random_uuid()`)
* `tmdb_id` (`INTEGER`, UNIQUE, nullable) — Unique key to support idempotent upserts during ingestion.
* `media_type` (`TEXT`, NOT NULL, CHECK `media_type IN ('movie', 'tv')`)
* `title` (`TEXT`, NOT NULL)
* `original_title` (`TEXT`, nullable)
* `overview` (`TEXT`, nullable)
* `release_year` (`INTEGER`, NOT NULL)
* `release_date` (`DATE`, nullable)
* `runtime` (`INTEGER`, nullable) — Running time in minutes (primarily for movies).
* `seasons_count` (`INTEGER`, nullable) — Total season count (for TV series).
* `episodes_count` (`INTEGER`, nullable) — Total episode count (primarily for TV series).
* `status` (`TEXT`, nullable) — Production / release status (e.g., `'Released'`, `'Returning Series'`, `'Ended'`).
* `poster_path` (`TEXT`, nullable) — Relative TMDB image path or storage bucket key.
* `budget` (`BIGINT`, nullable) — Budget in USD (primarily for movies).
* `revenue` (`BIGINT`, nullable) — Worldwide gross box office revenue in USD (primarily for movies).
* `budget_category` (`TEXT`, nullable) — Categorized budget band (e.g., `'Blockbuster (> $120M)'`).
* `country` (`TEXT`, nullable) — Primary production country.
* `countries` (`TEXT[]`, nullable, DEFAULT `'{}'::text[]`) — List of all production countries.
* `age_rating` (`TEXT`, nullable) — Content rating / certification (e.g., `'PG-13'`, `'R'`, `'TV-MA'`).
* `vote_average` (`NUMERIC(3, 1)`, NOT NULL, DEFAULT `0.0`, CHECK `vote_average >= 0.0 AND vote_average <= 10.0`)
* `vote_count` (`INTEGER`, NOT NULL, DEFAULT `0`)
* `metadata` (`JSONB`, nullable) — Flexible store for extra attributes (directors, cast, taglines).
* `created_at` (`TIMESTAMPTZ`, DEFAULT `now()`)

### 3.4 Table: `media_genres`
Many-to-many junction table resolving relationships between media items and genres.
* `media_id` (`UUID`, NOT NULL, references `media_items(id)` ON DELETE CASCADE)
* `genre_id` (`INTEGER`, NOT NULL, references `genres(id)` ON DELETE CASCADE)
* **Primary Key**: `(media_id, genre_id)`

### 3.5 Table: `watchlists`
Stores user-curated media collections.
* `id` (`UUID`, PK, DEFAULT `gen_random_uuid()`)
* `user_id` (`UUID`, NOT NULL, references `profiles(id)` ON DELETE CASCADE)
* `media_id` (`UUID`, NOT NULL, references `media_items(id)` ON DELETE CASCADE)
* `status` (`TEXT`, NOT NULL, DEFAULT `'plan_to_watch'`, CHECK `status IN ('plan_to_watch', 'watched', 'favorite')`)
* `created_at` (`TIMESTAMPTZ`, DEFAULT `now()`)
* **Constraints**: `UNIQUE(user_id, media_id)`

### 3.6 Table: `reviews`
Captures user evaluations and written commentary.
* `id` (`UUID`, PK, DEFAULT `gen_random_uuid()`)
* `user_id` (`UUID`, NOT NULL, references `profiles(id)` ON DELETE CASCADE)
* `media_id` (`UUID`, NOT NULL, references `media_items(id)` ON DELETE CASCADE)
* `rating` (`SMALLINT`, NOT NULL, CHECK `rating >= 1 AND rating <= 10`)
* `content` (`TEXT`, nullable)
* `status` (`TEXT`, NOT NULL, DEFAULT `'approved'`, CHECK `status IN ('pending', 'approved', 'flagged')`)
* `created_at` (`TIMESTAMPTZ`, DEFAULT `now()`)
* `updated_at` (`TIMESTAMPTZ`, DEFAULT `now()`)
* **Constraints**: `UNIQUE(user_id, media_id)`

---

## 4. Business Logic & Automated Database Triggers

### 4.1 Average Rating Recalculation
According to BPMN process 1.5, whenever a user creates, edits, or deletes an entry in `reviews`, a PostgreSQL trigger must automatically recompute:
$$ \text{vote\_average} = \text{ROUND}(\text{AVG}(\text{rating}), 1) $$
$$ \text{vote\_count} = \text{COUNT}(\text{id}) $$
and update the matching row in `media_items`.

### 4.2 Automated Profile Creation
A trigger listening to `auth.users` on `AFTER INSERT` must insert a default matching row into `public.profiles` (`id = NEW.id`, `username = COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))`).

---

## 5. Security & Row Level Security (RLS) Matrix

| Table | Operation | Target Role | Access Rule / Policy Condition |
| :--- | :--- | :--- | :--- |
| `genres` | SELECT | `anon`, `authenticated` | `USING (true)` |
| `genres` | INSERT/UPDATE/DELETE | Admin only | `auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')` |
| `media_items` | SELECT | `anon`, `authenticated` | `USING (true)` |
| `media_items` | INSERT/UPDATE/DELETE | Admin only | Service role or admin user check |
| `media_genres` | SELECT | `anon`, `authenticated` | `USING (true)` |
| `profiles` | SELECT | `anon`, `authenticated` | `USING (true)` |
| `profiles` | UPDATE | Owner | `USING (auth.uid() = id)` |
| `watchlists` | ALL | Owner | `USING (auth.uid() = user_id)` with `WITH CHECK (auth.uid() = user_id)` |
| `reviews` | SELECT | `anon`, `authenticated` | `USING (status = 'approved' OR auth.uid() = user_id)` |
| `reviews` | INSERT/UPDATE/DELETE | Owner | `USING (auth.uid() = user_id)` with `WITH CHECK (auth.uid() = user_id)` |

---

## 6. Recommended Database Indexes

To satisfy the sub-300ms interface latency and rapid search requirements:
* `CREATE INDEX idx_media_items_title_trgm ON media_items USING gin (title gin_trgm_ops);` (requires `pg_trgm`)
* `CREATE INDEX idx_media_items_release_year ON media_items (release_year DESC);`
* `CREATE INDEX idx_media_items_vote_avg ON media_items (vote_average DESC);`
* `CREATE INDEX idx_media_items_budget_category ON media_items (budget_category);`
* `CREATE INDEX idx_media_items_country ON media_items (country);`
* `CREATE INDEX idx_media_items_countries ON media_items USING gin (countries);`
* `CREATE INDEX idx_media_items_age_rating ON media_items (age_rating);`
* `CREATE INDEX idx_watchlists_user_id ON watchlists (user_id);`
* `CREATE INDEX idx_reviews_media_id ON reviews (media_id);`