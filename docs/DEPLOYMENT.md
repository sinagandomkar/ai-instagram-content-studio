# Deployment Guide — AI Instagram Content Studio

**Note:** PRD §8 originally scoped V1 to local-first SQLite. That changed when the decision was made to publish on Vercel (Vercel's serverless filesystem is ephemeral — a SQLite file doesn't survive between invocations), so the datasource is now Postgres everywhere, including local dev. `docs/PRD.md`/`docs/DATABASE.md` describe the entities; this doc describes how to actually run it.

## 1. Get a Postgres database (Supabase, free tier)

1. Sign up at [supabase.com](https://supabase.com), create a project.
2. Project Settings → Database → **Connection string** → **URI**.
3. Supabase gives you two variants: a direct connection (port `5432`) and a **transaction pooler** (port `6543`). Use the pooler string for Vercel — serverless functions open/close connections per request, and the pooler is built for that; the direct string is fine for local dev or Docker.
4. Put that string in `DATABASE_URL`.

## 2. Local dev

```bash
npm install
cp .env.example .env      # paste your Supabase connection string + API keys (docs below)
npx prisma migrate dev --name init   # first time only: creates the schema in your Postgres DB
npm run dev
```

`npm run build` / `npm test` work the same as before — Postgres vs SQLite doesn't change how the app is exercised, only where the data lives.

## 3. Deploy to Vercel

1. Push this repo to GitHub (if it isn't already — see `git log` / ask if you need this set up).
2. [vercel.com/new](https://vercel.com/new) → import the repo. Framework preset: Next.js (auto-detected).
3. Add environment variables (Project Settings → Environment Variables) — same keys as `.env.example`: `DATABASE_URL` (the Supabase pooler string), `GEMINI_API_KEY`, `COMPOSIO_API_KEY`, `COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID`, `COMPOSIO_USER_ID`.
4. Deploy. Vercel runs `next build`, which runs `prisma generate` via the `postinstall` hook — but it does **not** run migrations. Run `npx prisma migrate deploy` once yourself (locally, pointed at the same `DATABASE_URL`) before or right after the first deploy, and again after pulling any update that adds a migration.
5. Composio's OAuth callback (`/api/dashboard/connect/callback`) needs your real deployed URL to work — nothing to configure for that specifically, it's derived from the request at runtime, but confirm the Composio auth config's allowed redirect settings (Composio dashboard → your Instagram auth config) include your Vercel domain if it enforces an allow-list.

## 4. Local Docker (`docker-compose.yml`) — alternative to Supabase

Runs its own Postgres in a container instead of using Supabase — useful for fully offline local dev or self-hosting on a VPS.

```bash
cp .env.example .env      # GEMINI_API_KEY / COMPOSIO_* — DATABASE_URL is set inside docker-compose.yml itself
docker compose run --rm migrate   # applies migrations to the `db` service
docker compose up app
```

- `db`: `postgres:16-alpine`, data persisted in the `pg-data` named volume.
- `migrate`: a one-off run using the `builder` build stage (full `node_modules`, including the `prisma` CLI — a devDependency, so it's deliberately *not* in the slim runtime image). Re-run this after any update that adds a migration.
- `app`: the actual server, built with Next's `output: "standalone"` for a small image (`Dockerfile`).

To point the Docker `app`/`migrate` services at Supabase instead of the bundled `db` service, remove the `db` service and change `DATABASE_URL` in both to your Supabase string.

## 5. Getting the other API keys (all free-tier)

**Gemini (`GEMINI_API_KEY`):** [Google AI Studio](https://aistudio.google.com/apikey) → create a key. Free tier covers V1's usage.

**Composio (`COMPOSIO_API_KEY`, `COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID`):**

1. Sign up at [dashboard.composio.dev](https://dashboard.composio.dev) → Settings → copy the API key.
2. Toolkits → find **Instagram** → create an auth config (this is what authorizes *your* app to request Instagram Business/Creator account access via Composio's OAuth flow) → copy its id into `COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID`.
3. `COMPOSIO_USER_ID` can stay `local-user` — V1 is single-user; this is just the identifier Composio uses to scope the connection.

Without these two, the Main Dashboard, Comment Intelligence for owned content, and Posting Recommendations stay in their "connect your account" empty state — everything else (Viral Content Engine, Reel Actions, Story/Carousel generation) works independently once `GEMINI_API_KEY` is set.

## 6. Research-mode caveat on Vercel

`BrowserAutomationProvider` (the opt-in "research mode" discovery provider, off by default — PRD §5) spawns a local `npx @playwright/mcp` child process. That doesn't work on Vercel's serverless functions (no persistent child-process browser, and no network egress to download the browser binary at request time). It works fine locally and in Docker (own long-running process). Leave research mode off in the hosted deployment, or point it at a remote browser service (e.g. Browserbase) — out of scope for this build pass.

## 7. Troubleshooting

- **"table does not exist" / connection errors:** migrations haven't been applied to the DB the app is actually reading, or `DATABASE_URL` doesn't match between where you ran `migrate deploy` and where the running app points.
- **`GEMINI_API_KEY is not configured` / `Composio is not configured`:** expected, not a bug — set the corresponding env var (§5). The app is designed to fail loudly here rather than silently returning fake data.
- **Vercel build fails on `prisma generate` or connecting to the DB during build:** `prisma generate` doesn't need a live DB connection (it just reads the schema), only `migrate`/runtime queries do — if the build itself fails trying to reach the DB, check nothing in the codebase queries Prisma at module-import time outside of `lib/prisma.ts`'s lazy singleton.
