# usePopcorn

**usePopcorn** is a full-stack movie and TV series catalog, personal watchlist, review, and content-based recommendation web application built with **Next.js (App Router)** and **Supabase**.

---

## Features

- **Media Catalog & Discovery**
  - Browse movies and TV series with full-text search, multi-genre filters, release year range, rating range, runtime/seasons, country, budget band, age rating, sorting, and pagination.
  - Detailed title pages with synopsis, cast, directors/creators, financial stats, IMDb & community scores, and similar-media suggestions.
- **Authentication & Security**
  - Email/password sign-up and sign-in via Supabase Auth (JWT sessions, bcrypt password hashing) with strong password complexity validation.
  - Self-service password recovery (`/forgot-password` and `/reset-password`).
  - Role-based access control (`user`, `admin`) enforced through PostgreSQL Row Level Security (RLS), Next.js middleware/proxy session guards, and Server Action authorization checks.
- **Personal Watchlist & Ratings / Reviews**
  - Organize titles into **Plan to Watch**, **Watched**, and **Favorite** lists with status filtering and sorting.
  - Rate titles on a 1–10 scale and write/edit/delete reviews (up to 1,000 characters), with a PostgreSQL trigger (`on_review_rating_change`) automatically recalculating `vote_average` and `vote_count`.
- **Personalized Recommendations**
  - Multi-feature content-based recommendation engine (`get_user_recommendations` & `get_similar_media` PostgreSQL RPCs) weighted by genres, directors/creators, cast, release era, media type preference, and Bayesian quality scores.
- **Profile Cabinet & Account Lifecycle**
  - Manage avatar (Supabase Storage `avatars` bucket, max 2 MB), username, email, password (with current-password re-authentication), review archive, and watchlist overview.
  - Self-service **Danger Zone / Delete Account** flow that removes personal data (credentials, profile, avatar files, watchlist, written review text) while retaining anonymized numeric ratings for catalog statistics.
- **Admin Dashboard**
  - **Catalog Management (`/admin`)**: Manually add movies/TV series with real-time duplicate detection, `system_state` (`Free` / `Updating`) write-lock protection, and poster upload (≤ 5 MB JPG/PNG/WebP) or external image URL with live preview.
  - **Review Moderation (`/admin/reviews`)**: Approve, mark pending, flag, or delete user reviews.
  - **User Management (`/admin/users`)**: Search, filter, inspect activity stats, and block/unblock users.
  - **System Logs (`/admin/logs`)**: Filterable audit log viewer with `.log` export (`/api/admin/logs/export`).

---

## Architecture & Tech Stack

- **Architecture Pattern**: Frontend-centric Backend-as-a-Service (BaaS) — no standalone Express/NestJS server. All user catalog browsing, search, and mutations query Supabase PostgreSQL directly via `@supabase/supabase-js` and Next.js Server Actions.
- **TMDB Ingestion Strategy**: TMDB API calls are strictly restricted to offline seeding and scheduled weekly sync scripts (`scripts/seed.ts`, `scripts/seed-weekly.ts`). End-user journeys never call TMDB live.
- **Tech Stack**:
  - **Framework**: Next.js 16 (App Router, SSR, Server Actions, Route Handlers)
  - **Language**: TypeScript (strict mode)
  - **UI**: React 19, Tailwind CSS v4, Lucide Icons, MUI `<Rating>`
  - **Database / Auth / Storage**: Supabase (PostgreSQL 15+, Supabase Auth, Row Level Security, Storage buckets `avatars` and `posters`)

---

## Project Structure

```text
├── app/                     # Next.js App Router pages, Server Actions, and API routes
│   ├── actions/             # Server Actions (admin, auth, profile)
│   ├── admin/               # Admin dashboard (catalog, reviews, users, logs)
│   ├── api/admin/logs/      # Structured .log export route handler
│   ├── catalog/             # Catalog browse & filtering
│   ├── movie/[id]/          # Movie & TV series detail page
│   ├── profile/             # Personal cabinet & account settings
│   ├── recommendations/     # Personalized recommendations page
│   └── watchlist/           # Personal watchlist page
├── components/              # Reusable UI components (admin, filters, profile, reviews, recommendations)
├── docs/                    # Technical specification (spec.md) and audit notes
├── hooks/                   # Client hooks (useAuth, useProfile, useRatings, useWatchlist, useCatalogFilters)
├── lib/                     # Supabase clients, catalog queries, filters, logger, validation, utils
├── scripts/                 # Offline TMDB seeding, weekly sync, review seeding, admin bootstrap
├── types/                   # Auto-generated Supabase types (database.types.ts) and domain types (media.ts)
├── .github/workflows/       # Weekly TMDB release sync GitHub Actions workflow
├── proxy.ts                 # Next.js session refresh & blocked-user enforcement proxy
└── .env.example             # Environment variable template
```

---

## Prerequisites

- **Node.js** `20.x` or `22.x` (Node `22` is used in CI)
- **npm** `10+`
- A **Supabase** project with the schema from `docs/spec.md`, RLS policies, triggers, RPCs, and public Storage buckets (`avatars`, `posters`)
- A **TMDB API v4 Read Access Token** (only required when running catalog seed/sync scripts)

---

## Getting Started

### 1. Clone and install dependencies

```bash
git clone <repository-url>
cd use-popcorn
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

| Variable | Required | Scope | Description |
| :--- | :---: | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Client & Server | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Client & Server | Your Supabase publishable/anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server & Scripts only | Service-role key for admin operations, logging, and seeding |
| `TMDB_ACCESS_TOKEN` | Seeding only | Scripts only | TMDB v4 Read Access Token for offline catalog ingestion |

> **Security**: Never expose `SUPABASE_SERVICE_ROLE_KEY` or `TMDB_ACCESS_TOKEN` to client components or commit `.env.local`.

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Seeding & Admin Scripts

Run offline ingestion and administrative scripts against your configured `.env.local`:

```bash
# Initial TMDB catalog seed (acquires system_state = 'Updating' lock during sync)
npx tsx scripts/seed.ts

# Incremental weekly release sync (supports DRY_RUN=true)
npm run seed:weekly

# Seed synthetic community reviews (optional, for demo/testing)
npm run seed:reviews

# Promote/create an administrator account
npx tsx scripts/create-admin.ts
```

### Automated Weekly TMDB Sync (GitHub Actions)

The workflow in `.github/workflows/weekly-seed.yml` runs every **Monday at 03:00 UTC** (and supports manual `workflow_dispatch` runs with `dry_run`, `lookback_days`, `movies_limit`, and `tv_limit` inputs).

To enable it in GitHub, add the following repository secrets under **Settings → Secrets and variables → Actions**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TMDB_ACCESS_TOKEN`

During execution, `scripts/seed-weekly.ts` sets `system_state` (`id = 'sync_status'`) to `Updating` to prevent concurrent manual edits and restores it to `Free` in a `finally` block.

---

## Verification & Production Build

```bash
# TypeScript strict type check
npx tsc --noEmit

# ESLint check
npm run lint

# Production build & start
npm run build
npm run start
```
