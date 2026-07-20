# AI Instagram Content Studio

A SaaS tool that helps a Persian-speaking creator or small team pick a niche, discover what's working on Instagram Reels right now, understand *why* it's working, and generate ready-to-use Persian content (scripts, hooks, captions, hashtags, stories, carousels) from those insights — plus analyze their own account's growth, engagement, and audience.

100% Persian, RTL UI. English code, per project convention.

Full spec: [`docs/PRD.md`](docs/PRD.md). This README covers what's built and how to run it.

## Status

V1 (local-first) — see [`docs/ROADMAP.md`](docs/ROADMAP.md) for what's in this build pass vs. deferred to V2+.

- ✅ Viral Content Engine (niche discovery, curated/imported/research-mode providers, Reel Actions, Story/Carousel generation) — the PRD's highest-priority module.
- ✅ Main Dashboard, Comment Intelligence, Posting Recommendations — all backed by Composio's Instagram Graph API integration once an account is connected.
- ✅ Provider architecture (`ContentDiscoveryProvider`) with capability-based automatic provider selection — see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) §7.1.
- ⚠️ Not yet browser-verified end-to-end (see [`docs/TESTING.md`](docs/TESTING.md) — headless Chromium couldn't be downloaded in the sandbox this was built in). Verify the golden path yourself after setup.

## Quickstart

```bash
npm install
cp .env.example .env        # see docs/DEPLOYMENT.md for where to get each key
npx prisma migrate deploy
npm run dev
```

Open `http://localhost:3000`. Works with the `.env` keys empty — Reel Actions and account-connected features just report "not configured" until you add `GEMINI_API_KEY` / `COMPOSIO_API_KEY`.

Docker: `docs/DEPLOYMENT.md` §2.

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

## Scripts

```bash
npm run dev     # local dev server
npm run build   # production build
npm test        # unit tests (vitest)
npm run lint    # eslint
```
