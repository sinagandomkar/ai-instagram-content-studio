# Testing — AI Instagram Content Studio

**Runner:** Vitest (`vitest.config.ts`), `npm test`.

## What's covered now (M0–M1 pass)

| Suite | File | What it locks down |
| --- | --- | --- |
| Provider capability boundary | `src/domain/services/provider-registry.test.ts` | The single most important architectural invariant in the app (PRD §7.1): `own-account-*` capabilities resolve to Composio and nothing else, ever — even with fake providers claiming the capability; unavailable providers are excluded; unregistered capabilities resolve to an empty list rather than throwing. |
| Prompt library | `src/infrastructure/ai/prompts/index.test.ts` | Every `GenerationTask` produces a well-formed `{ systemInstruction, prompt, responseSchema }`; context fields actually get interpolated; an empty context still produces a usable prompt instead of a blank one; `PROMPT_VERSION` is set (it's stamped on every `GeneratedContent` row). |
| Persian formatting | `lib/format.test.ts` | Digit conversion is total (no stray Latin digits survive `formatCompactNumber`), consistent with the project's Persian-UI convention. |

These were picked because they're the parts of the codebase where a silent regression would be hardest to notice by eye — a capability leak in the provider registry, a prompt task falling through the `switch` unhandled, or a Latin digit slipping into "100% Persian" UI copy.

## Manual verification already performed (this build pass)

Since Vitest exercises pure logic only, the following were checked by running the actual dev server and hitting real routes end-to-end (documented here so the next person doesn't have to re-derive it):

- `next build` — full production build, including Next's own route-handler type validation (catches `params: Promise<...>` mistakes vitest wouldn't).
- `npm run dev` + `curl`: `/api/dashboard`, `/api/settings`, `/api/library` return `200` against a freshly migrated SQLite DB.
- `/api/discovery/import` → `/api/discovery`: a reel imported via the user-imported provider is immediately discoverable by niche, confirming the discovery→persistence→re-query loop works.
- `/api/reels/[id]/actions/save-to-library` → `/api/library`: confirms the save flow and its read-back.
- `/api/reels/[id]/actions/caption` without `GEMINI_API_KEY` set returns a clear `400` with a actionable message rather than a crash — confirms the "missing config fails loud, not silent" behavior.
- Server-rendered HTML for `/` was checked for `dir="rtl"`, `lang="fa"`, and the Persian nav labels, confirming the RTL shell renders before any client JS runs.

Browser/visual verification (actually clicking through the Discovery → Reel Action Sheet → Library flow in a real browser) was **not** possible in the environment this was built in — headless Chromium couldn't be downloaded (network-restricted sandbox). This is a real gap, not a formality: verify the golden path manually after cloning (see `docs/DEPLOYMENT.md` for setup) before treating the UI layer as trustworthy.

## What's deliberately not covered yet (M4, PRD Roadmap)

- Integration tests against a real (temp-file) SQLite DB for the application services — `DiscoveryService`, `ReelActionService`, etc. Pure unit tests don't touch Prisma; a proper pass should spin up a throwaway SQLite file per test run, run migrations, and test the persistence paths (upsert-by-`externalId`, snapshot creation, growth ranking) for real.
- API route tests (e.g. with `next/experimental/testmode` or a simple `fetch` against a running dev server) — the manual `curl` pass above is a stand-in, not a substitute for a CI-running suite.
- Component tests for the Reel Action Sheet / Discovery page — would need `@testing-library/react` + jsdom, deliberately deferred since the highest-value bug surface right now is backend orchestration and the provider boundary, not component rendering.
- A smoke E2E (Playwright, once the sandbox that builds this has real network access to fetch browser binaries, or in CI) covering: niche search → open Reel Action Sheet → generate a caption → save to library → see it in Library.

## Running

```bash
npm test           # runs the full suite once
npx vitest         # watch mode
```

No environment variables are required for the current suite — everything it touches is pure logic, by design.
