# Development Roadmap — AI Instagram Content Studio

Scope for the current build pass (M0–M3) is what "بسازش" (build it) covers now: a working local-first V1. M4+ are V2+ per PRD §9, listed for continuity, not being built yet.

## M0 — Foundation
- Next.js + TS + Tailwind + shadcn/ui scaffold, RTL/dark-light theme shell.
- Prisma + Postgres, schema from `DATABASE.md`, initial migration.
- Domain ports (`ContentDiscoveryProvider`, `AIProvider`), `ProviderRegistry`.
- **Exit:** app boots, empty dashboard renders in Persian/RTL, DB migrates cleanly.

## M1 — Discovery providers + Viral Content Engine (highest priority per Master Prompt)
- `CuratedLibraryProvider`, `UserImportedProvider` (paste-a-URL flow with metadata extraction).
- `BrowserAutomationProvider` behind the research-mode settings gate (off by default).
- `/discovery` screen: niche input, sort, provenance-badged Reel grid, empty state.
- **Exit:** entering a niche returns reels from at least the curated/imported providers end-to-end.

## M2 — AI generation
- `GeminiProvider` (`AIProvider` implementation) + prompt library (script/hook/caption/hashtags/recording-tips/cover-title/keywords/why-viral/audience-analysis).
- Reel Action Sheet UI wired to all nine actions; results editable and persisted as `GeneratedContent`.
- Story Generator (frame-by-frame) and Carousel generation.
- **Exit:** every Reel Action produces and saves real Persian output from a live Reel.

## M3 — Account Intelligence via Composio
- `ComposioProvider`: OAuth connect flow, profile/growth/engagement/top-content/posting-history/comments.
- Dashboard screen fully wired (charts, top posts/reels, comment insights summary, suggestions).
- Comment Intelligence and Posting Recommendations services, using Composio data + Gemini reasoning.
- Library screen (saved reels + generated content, filterable).
- **Exit:** a connected Instagram Business account produces a complete dashboard; PRD success metrics (§3) checkable end-to-end.

## M4 — Hardening (still V1, pre-hosting)
- Testing pass (unit on services/providers, integration on API routes, a smoke E2E on the two core flows).
- Caching/cost-control pass (snapshot caching, generation caching per PRD Architecture §6).
- Deployment guide + README finalized; Docker Compose verified from a clean clone.

---

## V2+ (not in this build pass — tracked for continuity, PRD §9)
- Commercial discovery provider integration (Phyllo/HypeAuditor/etc.) for true cross-account niche-scale discovery.
- Multi-tenant auth, team seats, billing.
- Scheduled/automated posting (Composio `publish` capability).
- Historical trend tracking maturing "Fastest Growing" beyond the two-snapshot minimum.
- Hosted deployment (Vercel + Supabase) as default, local-first as an option rather than the only mode.
