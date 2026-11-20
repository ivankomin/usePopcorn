# Coursework Requirements Audit & Action Checklist

**Audited Documents:**
* **ТЗ (Technical Specification):** `ргр тз (4).docx`
* **ПЗ (Explanatory Note):** `ргр кпі (7).docx`
* **Audited Against:** `use-popcorn` codebase + live Supabase schema (`public` tables, constraints, triggers, RLS, and Storage buckets)

---

## Tier A — Missing Core Functional Requirements (High Priority)

- [x] **1. Admin User Management & User Blocking**
  * **Source:** ТЗ — *«Облік користувачів → Для адміністратора системи»* & Fig. 4.9 (*«Management → базі даних користувачів»*)
  * **Required:** Admins must be able to view the list of registered users and block users for violating platform rules.
  * **Current State:** Not implemented. `components/admin/AdminNavTabs.tsx` only contains *Catalog Management* and *Review Moderation*.
  * **Recommended Implementation:**
    * Add `/admin/users` route and navigation tab in `components/admin/AdminNavTabs.tsx`.
    * Add server actions in `app/actions/admin.ts` to list registered users (`profiles` + auth email/status) and block/unblock users (using Supabase Auth `ban_duration` and/or an `is_blocked` column on `profiles`).
    * Enforce blocked status in `lib/supabase/middleware.ts` and sign-in flow so blocked accounts cannot access authenticated features.

- [ ] **2. Integrate `system_state` Lock (`Updating` / `Free`) into Automated Sync Scripts**
  * **Source:** ТЗ — *«керування статусом системи для запобігання конфліктам запису в БД»*; ПЗ — FR-19, BPMN 1.4
  * **Required:** Scheduled API sync sets global status to `Updating` (temporarily locking manual edits) and resets it to `Free` upon completion.
  * **Current State:** Partially implemented. The `system_state` table, admin UI toggle (`components/admin/SystemStatusCard.tsx`), and write guard (`app/actions/admin.ts`) exist, but `scripts/seed-weekly.ts` and `scripts/seed.ts` never update `system_state`.
  * **Recommended Implementation:**
    * Update `scripts/seed-weekly.ts` (and optionally `scripts/seed.ts`) to set `system_state` (`id = 'sync_status'`) to `'Updating'` before ingestion and restore `'Free'` inside a `finally` block (skipped in `--dry-run` mode).

- [ ] **3. Password Recovery (`«Forgot?»` Flow)**
  * **Source:** ТЗ — Fig. 4.2 (*«функцію відновлення доступу "Forgot?"»*)
  * **Required:** Login screen includes a password recovery flow.
  * **Current State:** Missing in `app/login/page.tsx`.
  * **Recommended Implementation:**
    * Add a `"Forgot?"` link next to the password label in `app/login/page.tsx`.
    * Add `/forgot-password` (calls `supabase.auth.resetPasswordForEmail`) and `/reset-password` (calls `supabase.auth.updateUser({ password })` after callback verification).

- [ ] **4. Structured Text Logs (`.log` / `.txt`) & Admin Logs / Platform Analytics View**
  * **Source:** ТЗ — *«Вимоги до вихідних даних»* & Fig. 4.9 (*«перегляду системних логів та аналітики платформи»*)
  * **Required:** Structured logs exportable as `.log` or `.txt` containing system events, critical errors, user session monitoring, and DB transaction reports; admin interface for viewing logs and platform analytics.
  * **Current State:** Only `console.log`/`console.error` calls exist; no persistent structured logs, `.log`/`.txt` export, or admin analytics dashboard.
  * **Recommended Implementation:**
    * Create a `system_logs` table (admin-readable via RLS) and a lightweight logger helper for sync scripts, admin actions, auth events, and errors.
    * Add an Admin Logs & Analytics page/tab with platform counters (total users, movies/TV count, reviews by status, watchlist activity) and a **"Download `.log`"** export button.

- [ ] **5. User Account Deletion (Data Lifecycle)**
  * **Source:** ПЗ — NFR 2.3 & Section 3.2 (*«видалення акаунта»*, complete personal data removal within 48 hours while preserving anonymized rating statistics)
  * **Required:** Users can close/delete their account and remove personal data.
  * **Current State:** `components/profile/ProfileSettings.tsx` has Avatar, Info, and Security sections, but no account deletion option.
  * **Recommended Implementation:**
    * Add a *"Danger Zone / Delete Account"* section in `components/profile/ProfileSettings.tsx` with password/text confirmation and a Server Action using `adminClient.auth.admin.deleteUser(user.id)` (plus cascading cleanup or review anonymization if desired).

---

## Tier B — Feature Tweaks & Missing Details (Medium Priority)

- [ ] **6. Enforce 5 MB File Size Limit on Poster Uploads (Client, Server & Storage Bucket)**
  * **Source:** ТЗ — *«Вимоги до вхідних даних»* (`.jpg`, `.jpeg`, `.png`, `.webp`; max **5 MB** per file)
  * **Current State:**
    * Avatars enforce 2 MB client-side and on the `avatars` bucket (compliant: ≤ 5 MB).
    * Posters allow **8 MB** in `app/actions/admin.ts` (`uploadMediaPosterAction`), have **no client-side size/MIME validation** in `components/admin/AddMediaForm.tsx`, and the Supabase `posters` bucket has `file_size_limit: null` and `allowed_mime_types: null`.
  * **Recommended Implementation:**
    * Lower server limit in `app/actions/admin.ts` from `8 MB` to `5 MB`.
    * Add client-side size (`≤ 5 MB`) and MIME (`image/jpeg`, `image/png`, `image/webp`) validation in `components/admin/AddMediaForm.tsx`.
    * Update the Supabase `posters` bucket with `file_size_limit = 5242880` and `allowed_mime_types = ['image/jpeg', 'image/png', 'image/webp']`.

- [ ] **7. Admin Add Media: Poster via File Upload OR Image URL**
  * **Source:** ТЗ — Fig. 4.10 (*«завантаження медіа-постерів шляхом прямого завантаження або через URL»*)
  * **Current State:** `components/admin/AddMediaForm.tsx` only supports file uploads.
  * **Recommended Implementation:** Add a toggle (*Upload File* / *Image URL*) in the poster section of `AddMediaForm.tsx` with URL validation and live thumbnail preview.

- [ ] **8. Recommendations Page Filter Sidebar (Genre & Release Year)**
  * **Source:** ТЗ — Fig. 4.8 (*«бічною панеллю фільтрації для уточнення результатів за жанрами чи роками»*)
  * **Current State:** `app/recommendations/page.tsx` only filters by media type (*All / Movies / Series*).
  * **Recommended Implementation:** Add genre and release-year filtering controls to `/recommendations` (filtering the returned recommendations or extending `getUserRecommendations`).

- [ ] **9. Profile Cabinet: Favorite Genres Widget & Direct Sign Out / Watchlist Buttons**
  * **Source:** ТЗ — Fig. 4.7 (*«динамічний перелік улюблених жанрів, сформований на основі оцінок»*, plus quick buttons to Watchlist and Sign Out)
  * **Current State:** `components/profile/CabinetOverview.tsx` displays 4 numeric stats cards, watchlist snapshot, and recent reviews, but no favorite genres section. Sign Out is only in the navbar `UserMenu`.
  * **Recommended Implementation:** Compute top genres from the user's highly rated items / reviews and render a **Favorite Genres** widget in `CabinetOverview.tsx`; optionally add quick *Watchlist* & *Sign Out* buttons to `ProfileHeader.tsx`.

- [ ] **10. Search / Filter Catalog by Director (and Creator)**
  * **Source:** ПЗ — FR-8 (*«використовуючи пошуковий рядок або фільтри за жанрами, роком випуску, режисером чи іншими метаданими»*)
  * **Current State:** `lib/filters.ts` only searches `title` (`ilike("title", ...)`).
  * **Recommended Implementation:** Extend catalog search (or add a Director input filter) to also match `metadata->directors` / `metadata->creators`.

- [ ] **11. Movie / Series Trailer Support on Details Page**
  * **Source:** ПЗ — FR-9 (*«синопсис, акторський склад, тривалість, трейлер та поточний глобальний рейтинг»*)
  * **Current State:** Trailers are not fetched, stored, or displayed.
  * **Recommended Implementation:**
    * Fetch YouTube trailer key from TMDB (`append_to_response=...,videos`) in seeding scripts and store `trailer_key` inside existing `media_items.metadata` JSONB (no DB migration required).
    * Add an optional trailer URL field in `AddMediaForm.tsx`.
    * Render a *"Watch Trailer"* modal / embedded YouTube player on `app/movie/[id]/page.tsx` when available.

- [ ] **12. Review Moderation: "Warn Author" Action**
  * **Source:** ТЗ — Fig. 4.11 (*«схвалити публікацію, надіслати попередження автору або видалити відгук»*)
  * **Current State:** `components/admin/ReviewModerationCard.tsx` supports *Approve*, *Mark Pending*, *Flag*, and *Delete*, but no *"Warn Author"* action.
  * **Recommended Implementation:** Add a *"Warn Author"* action that saves a moderation warning notice (e.g., `user_warnings` table or moderation note) displayed in the author's profile/cabinet.

- [ ] **13. Small Validation, Redirect & Bug Fixes**
  * [ ] **Explicit email validation on signup** *(ТЗ + ПЗ FR-3)*: Call `validateEmail(trimmedEmail)` from `lib/validation.ts` in `app/signup/page.tsx` instead of relying only on HTML `type="email"`.
  * [ ] **Post-auth default redirect** *(ПЗ BPMN 1.3, UC-01, UC-02)*: Change default redirect (when `?next=` is absent) from `/` to `/profile` in `app/login/page.tsx` and `app/signup/page.tsx`.
  * [ ] **DB-level review length constraint** *(ПЗ BPMN 1.5, UC-04)*: Add `CHECK (char_length(content) <= 1000)` to `public.reviews` in Supabase so the server/DB enforces max length alongside `maxLength={1000}` in `ReviewForm.tsx`.
  * [ ] **Fix inline review edit refresh bug**: In `components/profile/UserReviewsArchive.tsx`, sync local `reviewsList` state after inline editing (currently `reviewsList` is initialized once via `useState(initialReviews)` and does not visually update until a full reload).

---

## Tier C — Engineering, Documentation & Testing Deliverables

- [ ] **14. Production `README.md` & `.env.example`**
  * **Source:** ТЗ — *«Вимоги до представленню вихідних кодів»* (*«містити файл інструкції README.md для розгортання та всі необхідні конфігураційні файли для запуску в середовищі Node.js»*)
  * **Current State:** `README.md` is still the default `create-next-app` boilerplate; `.env.example` does not exist.
  * **Recommended Implementation:** Write a clear `README.md` (architecture, tech stack, prerequisites, environment variables, Supabase setup, seeding & weekly GitHub Actions automation, local dev/build commands) and add `.env.example`.

- [ ] **15. Unit Tests with Jest**
  * **Source:** ПЗ — Section 3.2 (*«У проєкті використовуються Jest для модульного тестування»*)
  * **Current State:** No test suite or Jest configuration exists in the repository.
  * **Recommended Implementation:** *(Requires confirmation to install Jest devDependencies)* Set up Jest + TypeScript and add unit tests covering `lib/validation.ts`, `lib/filters.ts`, `lib/utils.ts`, and core helpers.

---

## Tier D — Spec-vs-Code Conflicts (Choose: Implement OR Update the `.docx` Text)

- [ ] **16. Ukrainian Localization / Dynamic JSON Dictionaries (`i18n`)**
  * **Source:** ПЗ — Table 1.1 (*«Повна підтримка української мови»*), NFR 2.3 & Section 3.2 (*«винесенням усіх текстових констант у незалежні JSON-словники»*)
  * **Conflict:** `AGENTS.md` standardizes the entire application to English, and all UI text/DB metadata is currently English-only with no JSON dictionaries.
  * **Options:**
    * **Option A (Code):** Implement a lightweight EN/UK language switcher backed by JSON dictionaries for UI labels.
    * **Option B (Doc):** Update those 3 spots in `ргр кпі (7).docx` to specify an English interface (matching your Figma mockups and `docs/spec.md`).

- [ ] **17. Custom User-Named Watchlist Collections**
  * **Source:** ПЗ — FR-13 (*«створювати власні тематичні підбірки»*)
  * **Conflict:** Current schema (`watchlists`) supports 3 fixed statuses (`plan_to_watch`, `watched`, `favorite`).
  * **Options:**
    * **Option A (Code):** Add `collections` + `collection_items` tables and UI for custom user-named lists.
    * **Option B (Doc):** Adjust FR-13 wording in `ргр кпі (7).docx` to specify the 3 personal categories (*Plan to Watch*, *Watched*, *Favorite*).

- [ ] **18. Text-Only Cleanup Inside the `.docx` Files (No Code Changes)**
  * **In `ргр тз (4).docx`:**
    * Fill in title page placeholder: `Керівник роботи: ____________ Ім’я ПРІЗВИЩЕ`.
    * Fill in the empty table under `СТАДІЇ І ЕТАПИ РОЗРОБКИ` (currently `<Брати з листа завдання>`).
  * **In `ргр кпі (7).docx`:**
    * **Section 3.1 / 3.2 (TMDB architecture):** Currently states Next.js Server Functions act as a live proxy to TMDB API. Update to match the actual (and better) architecture: TMDB is ingested offline/weekly via automated scripts (`scripts/seed.ts`, `scripts/seed-weekly.ts` + GitHub Actions), while user requests query Supabase PostgreSQL directly.
    * **Section 3.2 (UI library):** States Material UI was rejected in favor of Tailwind CSS, whereas `@mui/material` is currently installed for the star `<Rating>` component (either note it as used solely for the rating control or replace `<Rating>` with a custom Tailwind component).
    * **Minor figure text mismatches:** Fig. 4.5 mentions *awards* on movie details (not provided by TMDB v3 API); Fig. 4.2 states `GET STARTED NOW` goes to `/login` (currently links to `/catalog`); Figs. 4.3–4.4 mention IMDb rating on catalog cards (cards display community `vote_average`, while `imdb_rating` is shown on the detail page).

---

## Reference: Already Verified & Implemented

| Requirement Area | Status | Key Files / DB Evidence |
| :--- | :--- | :--- |
| Welcome page (FR-1, Fig. 4.1) | Done | `app/page.tsx` |
| Auth, JWT sessions, bcrypt hashing, logout (FR-2, FR-4, FR-6) | Done | `components/AuthProvider.tsx`, `lib/supabase/middleware.ts`, `app/auth/callback/route.ts` |
| Password complexity validation (FR-3) | Done | `lib/validation.ts`, `app/signup/page.tsx` |
| Profile editing: username, email, avatar, password w/ re-auth (FR-5) | Done | `components/profile/settings/*`, `lib/profile-api.ts`, `app/actions/profile.ts` |
| Movies & Series catalog, search, filters, sort, pagination (FR-7, FR-8) | Done | `app/catalog/page.tsx`, `components/CatalogFilters.tsx`, `lib/api.ts`, `lib/filters.ts` |
| Media detail page & metadata (FR-9) | Done | `app/movie/[id]/page.tsx`, `components/MovieDetailsCard.tsx` |
| 1–10 ratings, write/edit/delete reviews & auto rating recalculation (FR-10, FR-11, FR-12) | Done | `components/reviews/*`, `components/RatingProvider.tsx`, DB trigger `on_review_rating_change` |
| Watchlist management & filtering (FR-13, Fig. 4.6) | Done | `app/watchlist/page.tsx`, `components/WatchlistProvider.tsx` |
| Content-based personalized recommendations & similar media (FR-14) | Done | `app/recommendations/page.tsx`, `lib/recommendations.ts`, RPCs `get_user_recommendations` & `get_similar_media` |
| Admin manual media ingestion & duplicate prevention (FR-15, FR-16, FR-17, FR-20) | Done | `app/admin/page.tsx`, `components/admin/AddMediaForm.tsx`, `app/actions/admin.ts`, DB constraints `media_items_tmdb_id_key` & `uq_media_items_title_year` |
| Admin review moderation (Approve / Pending / Flag / Delete) | Done | `app/admin/reviews/page.tsx`, `components/admin/ReviewModerationContainer.tsx` |
| Scheduled external TMDB release sync (FR-18) | Done | `scripts/seed-weekly.ts`, `.github/workflows/weekly-seed.yml` |
| PostgreSQL RLS & integrity constraints | Done | Verified live in Supabase: RLS enabled on all 7 tables (`profiles`, `genres`, `media_genres`, `media_items`, `watchlists`, `reviews`, `system_state`); all CHECK/UNIQUE/FK constraints active |
