## 1. Project Overview & Architecture

- **System Purpose**: Movie and TV series catalog, personal watchlist, and user review web application.
- **Architecture Pattern**: Frontend-centric Backend-as-a-Service (BaaS).
- **Tech Stack**: Next.js 14+ (App Router, Server Actions, SSR), Supabase (PostgreSQL, Supabase Auth, Row Level Security), Tailwind CSS, TypeScript (strict mode enabled).
- **Data Strategy**: TMDB API is restricted to one-time offline ingestion (`scripts/seed.ts`). All user catalog browsing, search, and mutations query internal Supabase tables directly.
- **Language & Localization**: Standardized to English for all UI text, components, error messages, and database metadata.

---

## 2. Reference Documentation & UI Standards

- **Product Requirements & Business Logic**: Defined in `docs/spec.md`. Consult `docs/spec.md` whenever designing database schemas, implementing business constraints (e.g., 1–10 rating scales, watchlist states), or setting up entity relations.
- **UI Design from Screenshots & Visual Consistency**:
  - Implement frontend components based on provided Figma screenshots.
  - If a screenshot for a requested UI component is not provided and the design must be created from scratch, strictly adhere to the established application style (matching the color palette, dark theme, typography, padding, card radiuses, and structural layout of existing components).
- **Preservation of User-Authored UI Changes & DOM Structure**:
  - Always respect and preserve UI styling modifications and DOM adjustments made manually by the user (e.g., custom color hex values such as genre chips `bg-[#85c355]`, presence/absence of shadows, borders, radiuses, paddings, copy wording).
  - **Do not restore removed elements**: If the user removed any HTML elements or components they deemed unnecessary, never re-add them.
  - **Explicit Color Rule**: Never change the color of the genre chips in media details from `bg-[#85c355]`.
  - During refactoring, modularization, or code generation, inspect the current working file / git diff carefully and DO NOT revert, overwrite, or roll back user-customized UI styling, colors, or structural removals to older or default states.

---

## 3. Strict Architectural Guardrails

- **No Standalone Node.js/NestJS/Express Backend**: All database queries, user management, and mutations execute directly via `@supabase/supabase-js` or Next.js Server Actions. Do not create custom HTTP Express/NestJS services.
- **No Live TMDB Calls in User Journeys**: Do not fetch TMDB endpoints during user search, catalog filtering, or detail views. Everything must query the internal Supabase schema.
- **Dependency & Library Discipline**:
  - If a mature library or npm package can significantly simplify the task at hand (e.g., icon sets, UI utilities), suggest it to the user with a brief rationale.
  - **DO NOT** run `npm install` or add dependencies to `package.json` until the user explicitly confirms and approves the recommendation.
- **Environment Integrity**:
  - Never commit, log, or hardcode API keys or secrets in source code.
  - Secrets reside exclusively in `.env.local`:
    - `NEXT_PUBLIC_SUPABASE_URL`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - `SUPABASE_SERVICE_ROLE_KEY` (server-side and seed script only)
    - `TMDB_ACCESS_TOKEN` (seed script only)

---

## 4. Key Directory Structure (Flat Layout, No `src/`)

```text
├── .agents/
│   └── mcp_config.json        # Supabase MCP configuration
├── app/                       # Next.js App Router (pages and server actions)
├── components/                # Reusable UI components
├── docs/
│   └── spec.md                # Functional, database, and business specifications
├── lib/
│   ├── supabase/              # Browser and Server Supabase clients
│   └── utils.ts               # Shared helper functions
├── scripts/
│   └── seed.ts                # Standalone TMDB database seeding script
├── types/
│   ├── database.types.ts      # Auto-generated Supabase schema definitions
│   └── media.ts               # Domain-specific UI interfaces
├── .env.local
├── AGENTS.md
└── package.json
```

````

---

## 5. Supabase MCP & Automation Protocol

- **Schema Inspection First**: Verify existing tables and column configurations via Supabase MCP before writing or editing SQL migrations.
- **Destructive SQL Safety**: Explicit user confirmation is strictly mandatory before running any destructive DDL (`DROP TABLE`, `DROP COLUMN`, `TRUNCATE`).
- **Type Synchronization**: Whenever a migration or schema modification is executed via Supabase MCP, immediately regenerate the TypeScript database contract at `src/types/database.types.ts`.
- **Row Level Security (RLS)**: Enforce RLS on all custom tables:
- Public read access on catalog data (`media_items`, `genres`, `media_genres`).

- Authenticated user-scoped write access on user tables (`watchlists`, `reviews` where `auth.uid() = user_id`).

---

## 6. Operational Protocol (Agentic Execution Loop)

1. **Plan First**: Before making non-trivial modifications, inspect the target files, check `docs/spec.md` for entity constraints if relevant, and state a brief 2–3 step plan.

2. **Execute In Isolation**: Modify only files strictly necessary for the active sub-task.
3. **Mandatory Type Verification**:

- After any change to `.ts` or `.tsx` files, immediately execute `npx tsc --noEmit`.
- Read compiler errors, fix syntax or typing mismatches, and re-run until the build check passes with exit code 0.

4. **State Reporting**: Conclude every task with a concise summary stating which files changed, the verification command executed, and the status.
