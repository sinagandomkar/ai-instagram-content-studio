# AI Instagram Content Studio

A SaaS tool that helps a Persian-speaking creator or small team pick a niche, discover what's working on Instagram Reels right now, understand *why* it's working, and generate ready-to-use Persian content (scripts, hooks, captions, hashtags, stories, carousels) from those insights — plus analyze their own account's growth, engagement, and audience.

100% Persian, RTL UI. English code, per project convention.

Full spec: [`docs/PRD.md`](docs/PRD.md). This README covers what's built and how to run it.

## Status

V1 (local-first) — see [`docs/ROADMAP.md`](docs/ROADMAP.md) for what's in this build pass vs. deferred to V2+.

- ✅ Viral Content Engine (niche discovery, curated/imported/research-mode providers, Reel Actions, Story/Carousel generation) — the PRD's highest-priority module.
- ✅ Main Dashboard, Comment Intelligence, Posting Recommendations — all backed by Composio's Instagram Graph API integration once an account is connected.
- ✅ Provider architecture (`ContentDiscoveryProvider`) with capability-based automatic provider selection — see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) §7.1.
- ✅ Verified live through a public tunnel, not just locally — this is what surfaced and got three real RTL layout bugs and one cross-origin config gap fixed (see Build Journey below and [`docs/TESTING.md`](docs/TESTING.md)).

## Quickstart

```bash
npm install
cp .env.example .env        # see docs/DEPLOYMENT.md for where to get each key
npx prisma migrate deploy
npm run dev
```

Open `http://localhost:3000`. Works with the `.env` keys empty — Reel Actions and account-connected features just report "not configured" until you add `GEMINI_API_KEY` / `COMPOSIO_API_KEY`.

Sharing your local instance publicly (tunnel): `docs/DEPLOYMENT.md` §2. Docker: §5.

## Documentation

| Doc | Covers |
| --- | --- |
| [PRD.md](docs/PRD.md) | Product requirements, scope, legal/compliance position on Instagram data discovery |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Clean Architecture layers, provider interfaces, request flows, MCP wiring |
| [DATABASE.md](docs/DATABASE.md) | Entity rationale (schema itself: `prisma/schema.prisma`) |
| [UI_UX.md](docs/UI_UX.md) | Design system, RTL conventions, screen-by-screen breakdown |
| [ROADMAP.md](docs/ROADMAP.md) | Build milestones, V1 vs V2+ scope |
| [PROMPT_LIBRARY.md](docs/PROMPT_LIBRARY.md) | Every AI generation task, its prompt, and its output schema |
| [TESTING.md](docs/TESTING.md) | What's tested, what's manually verified, what's still a gap |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Local, Docker, and hosted (V1.5) setup; API key acquisition; troubleshooting |

## Tech stack

Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui (Base UI, RTL preset) · Prisma + SQLite (`better-sqlite3` driver adapter) · Gemini API · Composio (official Instagram Graph API access) · Playwright MCP (opt-in research-mode discovery).

## Project structure

```text
app/            routes (pages + API handlers)
src/domain/     entities, ports (ContentDiscoveryProvider, AIProvider), provider registry
src/application/ use-case services — the only thing API routes call
src/infrastructure/ provider adapters (Composio, curated library, user-imported, browser automation), Gemini provider, prompt library
components/     RTL/shadcn UI components
lib/            Prisma client, formatting helpers, fetch helpers
prisma/         schema + migrations
docs/           everything above
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) §9 for the full target layout and the reasoning behind the layering.

## Build journey

How this went from spec to a working, publicly-reachable site — kept here because the decisions and the bugs found along the way are as informative as the final state.

1. **PRD → Architecture → Database → UI/UX → Roadmap → Prompt Library**, in that order, per the master prompt's own "no code before PRD approval" rule. Each is a full doc in `docs/`.
2. **Composio locked in as a first-class provider** for official Instagram Graph API access, with a capability-based `ContentDiscoveryProvider` registry so it's the only provider ever asked for owned-account data — niche-wide discovery falls back through curated-library → user-imported → opt-in browser-automation providers instead.
3. **Full build**: domain/application/infrastructure layers, all API routes, all four screens (Dashboard, Viral Content Engine, Library, Settings), Vitest suite, Dockerfile, deployment docs — verified with `next build`, `npm test`, and live `curl` smoke tests end-to-end (discovery → save → library round-trip).
4. **First deploy attempt: Vercel + Supabase Postgres.** Required migrating off SQLite (Vercel's serverless filesystem can't hold a file DB). Migration itself worked — then Supabase's *direct* Postgres connection turned out to be IPv6-only, and the network here has no IPv6, so migrations couldn't run. No way around that from this side.
5. **Pivoted to local-first**, per Sina's call: reverted cleanly to SQLite, ran `npm run dev` on his own machine, and used a tunnel (`localhost.run` over SSH — Cloudflare's quick tunnel was tried first but kept dropping on this network) to get a public URL without any new cloud accounts. Vercel/Postgres stays documented as an optional upgrade path (`docs/DEPLOYMENT.md` §4), not deleted.
6. **Testing it live (not just locally) is what caught the real bugs**: Next's dev server silently blocking cross-origin API requests from the tunnel's domain (fixed via `allowedDevOrigins`), and three instances of the same RTL mistake — mixing a logical Tailwind class (`me-`/`pe-`, which resolve to the *left* side in RTL) with a physically-positioned element (`right-0`), leaving content with no offset from the sidebar and icons overlapping text. None of these showed up in `next build` or the test suite; they only showed up by actually opening the site in a browser.
7. **Synced back to GitHub** after the local pivot, including fixing a `.gitignore` bug where `.env*` was also swallowing `.env.example` (a template, not a secret) so it had never actually been pushed.

## Scripts

```bash
npm run dev     # local dev server
npm run build   # production build
npm test        # unit tests (vitest)
npm run lint    # eslint
```
