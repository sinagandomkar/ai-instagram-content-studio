# PRD — AI Instagram Content Studio

**Status:** DRAFT — awaiting approval (per Master Prompt rule: "Do NOT write application code before the PRD is approved")
**Version:** 0.1
**Date:** 2026-07-19
**Owner:** Sina
**Source spec:** `MASTER_PROMPT_AI_Instagram_Content_Studio.md`

---

## 1. Executive Summary

AI Instagram Content Studio is a SaaS tool that helps a creator, agency, or brand pick a niche, discover what's working on Instagram Reels right now, understand *why* it's working, and generate ready-to-use Persian content (scripts, hooks, captions, hashtags, stories, carousels) from those insights — plus analyze their own account's growth, engagement, and audience.

Two engines make up the product:

1. **Account Intelligence** — analyze a connected/entered Instagram account: growth, engagement, top content, posting patterns, comment sentiment, and improvement suggestions.
2. **Viral Content Engine** (highest priority) — given a niche, surface high-performing Reels from across Instagram and turn each one into a springboard for original Persian content via AI.

V1 targets zero/near-zero running cost: local-first storage, free-tier AI (Gemini), and free/self-hostable MCP tooling wherever the data source allows it legally.

---

## 2. Problem & Opportunity

Persian-speaking creators and small marketing teams currently do trend research manually — scrolling Explore/hashtags, screenshotting reels, guessing why something worked, and writing captions from scratch. This is slow, unstructured, and produces no institutional memory (nothing is saved, compared, or reused).

The opportunity: collapse "find what's working → understand why → produce my own version" into one workflow, in Persian, with AI doing the analysis and first-draft generation, and the human doing the judgment and final edit.

---

## 3. Goals, Non-Goals, Success Metrics

**Goals (V1)**
- A user can enter a niche and see a ranked, sortable feed of high-performing Reels with real (or clearly-labeled estimated) metrics.
- Every Reel card produces usable Persian AI output (script, hook, caption, hashtags, story sequence, carousel, "why it went viral") in under ~15 seconds per action.
- A user can point the tool at an Instagram account (their own, or public) and get a readable analytics dashboard.
- Everything works locally with a free-tier stack — no paid infrastructure required to run V1.

**Non-Goals (V1)**
- No automated posting/scheduling to Instagram.
- No multi-tenant billing/subscription system (single-user/local-first first; team & billing come with the SaaS hardening phase).
- No guarantee of 100%-accurate Instagram metrics where official APIs don't expose them — V1 is explicit about estimated vs. verified data.

**Success metrics**
- Time from "enter niche" to "first usable script draft" < 60 seconds.
- ≥ 80% of generated captions/hashtags require only light editing (qualitative user rating, tracked in-app).
- Zero paid infrastructure spend to run a single-user V1 instance for a month.

---

## 4. Target Users / Personas

| Persona | Need |
| --- | --- |
| Solo Instagram creator (Persian-speaking) | Fast trend research + first-draft content in their voice/language |
| Small marketing/social team | Repeatable niche research + shared content library |
| Agency managing multiple client accounts | Per-account analytics + content ideas at scale (post-V1, multi-account) |

---

## 5. Legal & Compliance Position — Read Before Building the Viral Content Engine

This is the single biggest risk in the spec and needs an explicit decision, so it's called out before architecture.

**What official APIs actually allow:**
- The Instagram/Meta Graph API only exposes analytics (growth, engagement, insights) for **Instagram Business/Creator accounts the authenticated user administers**. It does **not** provide a way to browse or rank arbitrary public Reels by niche/views across accounts you don't own. That capability does not exist as a sanctioned public API from Meta.
- So the "discover high-performing Reels by niche across all of Instagram" requirement — the Viral Content Engine's core feature — structurally cannot be built on the official API alone, at any price.
- **Composio is the concrete mechanism for this official-API path** (decision locked, see §7.1): it handles OAuth to the user's own Instagram Business/Creator account and exposes profile insights, reels/post insights, engagement, and comments through an authenticated MCP/tool integration. It is first-class for the Account Intelligence module. It is **not** a discovery tool — it cannot and will not be asked to find other people's high-performing reels by niche, since Meta doesn't grant that access to any third party, Composio included.

**What's actually available, ranked by legal safety:**
1. **User-imported data** (V1 default): the user pastes a Reel URL or uploads a screenshot/CSV of something they found; the app extracts what it can from the public page (oEmbed-style metadata) and the user supplies the rest. Zero scraping-at-scale risk.
2. **Licensed third-party social-data providers** (Phyllo, Modash, HypeAuditor, Social Blade's API, etc.) — these companies hold their own agreements/scraping infrastructure and sell access legally. Costs money, but it's the compliant way to get "trending reels by niche" at scale. Recommended path once the product has revenue to justify it.
3. **Self-directed browser automation** (Playwright MCP, on the user's own logged-in session, low-volume, personal research use) — a grey zone. Public-data scraping has favorable precedent in the US (hiQ v. LinkedIn), but Meta has actively litigated against scrapers (Meta v. Bright Data, Meta v. BrandTotal) and scraping violates Instagram's Terms of Use, which creates account-ban and civil-claim exposure. Usable for a *personal research assistant* pattern (rate-limited, no resale of data, one account at a time) but must never be marketed as a bulk-scraping/data-resale feature, and the user must be told this in-product.
4. **Manual/curated seed lists** — the team or community manually tracks known viral reels per niche into the library over time; the app's job becomes analysis + generation on top of that curated set rather than open-ended discovery.

**Recommendation for V1:** ship options 1 and 4 (import + curated library) as the default, honest MVP; wire the data-source layer as a pluggable interface (`ContentDiscoveryProvider`) so option 3 (opt-in, rate-limited, clearly labeled "research mode") and eventually option 2 (paid provider) can be swapped in without touching the rest of the app. Every Reel card must show its data provenance (imported / curated / research-mode / licensed-API) so the user always knows how trustworthy a number is.

This satisfies the Master Prompt's own instruction to "design the best LEGAL alternative" — it's legal specifically because V1 doesn't do unauthenticated bulk scraping as a resold service; it does user-directed, rate-limited, provenance-labeled discovery.

**Open decision needed from Sina:** confirm this tiered approach (import/curated first, research-mode opt-in second, paid provider later) is acceptable before the Viral Content Engine's discovery layer is architected in detail.

---

## 6. Product Scope — Modules

### 6.1 Main Dashboard (Account Intelligence)
Profile overview, growth over time, engagement rate, top posts, top reels, audience-interest signals, posting-consistency score, comment insights, AI-generated improvement suggestions. Charts throughout (line for growth, bar for post performance, heatmap for posting-time consistency). Data source: **Composio** (Instagram Graph API, OAuth-connected account) — see §7.1. If no account is connected, the dashboard falls back to whatever imported/exported data the user provides, clearly labeled as such.

### 6.2 Viral Content Engine (highest priority)
Niche input → ranked Reel feed. Card fields: thumbnail, creator, views, likes, comments, publish date, video URL, estimated engagement rate, data-provenance badge. Sort: Most Viewed / Highest Engagement / Newest / Fastest Growing ("fastest growing" requires at least two time-stamped snapshots of the same reel — only available for items tracked over time in the library, not first-import).

### 6.3 Reel Actions (per card)
Generate Similar Script · Generate Better Hook · Generate Caption · Generate Hashtags · Generate Story Sequence · Generate Carousel · Explain Why It Went Viral · Analyze Audience · Save to Library. Each is an independent, re-runnable AI call against that Reel's context (transcript/description/metrics if available).

### 6.4 AI Content Generation
Persian output for: script, hook, CTA, title, caption, hashtags, recording tips, cover title, keywords. All editable in-app before saving/exporting.

### 6.5 Story Generator
Full sequence: text, visual idea, poll, question box, CTA, sticker suggestion — per story frame, generated as a set.

### 6.6 Comment Intelligence
For a Reel/post with available comments (own account, or imported comment export): pain points, repeated questions, desired products/topics, sentiment split. Requires comment text as input — for the user's own connected account, **Composio** pulls real comments via the Graph API directly and safely; for other people's public reels, this depends entirely on what the active discovery provider (§7.1) exposes, which may be nothing beyond visible caption/engagement counts.

### 6.7 Posting Recommendations
Best days/hours/frequency, derived from the connected account's own historical posting-time vs. engagement data, with the reasoning shown, not just the answer.

---

## 7. MCP-First Strategy & Provider Architecture

### 7.1 `ContentDiscoveryProvider` — Provider Architecture (locked decision)

The Viral Content Engine and Account Intelligence module both read Instagram data, but through fundamentally different access patterns: one is authenticated first-party access to an account the user owns, the other is discovery of content the user does not own. Both are modeled as implementations of one `ContentDiscoveryProvider` interface, so the rest of the app (Reel cards, dashboard widgets, AI generation) never needs to know which provider actually answered a request — it only asks for a capability and gets back data plus a provenance tag.

**Providers (V1 → V2+):**

| Provider | Access pattern | Capabilities it serves | Status |
| --- | --- | --- | --- |
| **Composio (Instagram Graph API)** | OAuth-authenticated, official Meta Graph API via Composio's managed integration | Own-account profile insights, reels/post insights, engagement metrics, comments, posting-time history, publishing (future) — accounts the user administers only | V1, first-class |
| **Curated Library** | Manually maintained, per-niche seed data | Niche-wide reel discovery (bootstrap quality) | V1 |
| **User-Imported** | User pastes a URL / uploads a screenshot/CSV | Niche-wide reel discovery, one item at a time | V1 |
| **Browser Automation MCP** (Playwright, official) | User's own logged-in session, rate-limited, opt-in "research mode" | Niche-wide reel discovery, public-page metadata | V1, off by default — see §5 |
| **Commercial Social Data Provider** (Phyllo / HypeAuditor / Social Blade API, etc.) | Licensed vendor API | Niche-wide reel discovery at scale, reliable historical/trend data | V2+, not yet integrated |

**Capability-based automatic selection.** Each provider declares the capabilities it supports (e.g. `own-account-insights`, `own-account-comments`, `niche-discovery`, `trend-history`). When a module needs data, it asks a provider registry for the best available provider for that specific capability — never a single hardcoded source:

- **Own-account analytics / comments / posting-time data** → **Composio**, always, whenever the account is connected. No other provider is ever asked for this, because Composio is the only one with authorized access to that private data — this is a hard capability boundary, not a preference.
- **Niche-wide Reel discovery** → the registry tries providers in a priority order that degrades gracefully: Commercial provider (if configured, V2+) → Curated Library → User-Imported → Browser Automation (only if the user has explicitly opted in). The first provider that returns results wins; every result keeps its source tag through to the UI.
- If a requested capability has no eligible provider available (e.g. discovery requested with an empty library and research mode off), the UI states that plainly rather than silently returning nothing or fabricating data.

Composio is therefore not "one option among several for the same job" — it is the sole, correct provider for anything requiring authenticated access to the user's own account, while the discovery providers compete/fall back for the separate job of finding other people's content. That boundary is enforced by declared capability, not by convention, so it can't quietly blur as providers are added later.

### 7.2 MCP / integration mapping

Per the Master Prompt, MCP is preferred over custom code wherever it fits. Realistic mapping:

| Capability | MCP / integration choice | Notes |
| --- | --- | --- |
| Own-account Instagram Graph API access | **Composio MCP** | OAuth-managed connection to the user's Instagram Business/Creator account; backs §6.1, §6.6, §6.7 |
| Browser automation (research-mode discovery, oEmbed/public page fetch) | Playwright MCP (official) | User's own session, rate-limited, "research mode" only — see §5 |
| Content/URL extraction to clean text/markdown | Firecrawl MCP or a lightweight Fetch MCP | For turning a pasted Reel/article URL into structured text for the AI to reason over |
| Web/trend search (e.g. "why did X format trend", competitor research) | Exa MCP or Tavily MCP | Free-tier keys available |
| Local file/library storage in V1 (local-first) | Filesystem MCP | Saved reels, generated content, exports — before a hosted DB is introduced |
| Licensed social-data provider (V2+, once adopted) | Custom connector, not MCP | These vendors don't currently ship MCP servers; wrapped as a normal API client behind the same `ContentDiscoveryProvider` interface so it's a drop-in swap |
| AI generation (script/caption/etc.) | Direct Gemini API, not MCP | MCP is for tools/data access; the generation calls themselves are plain LLM calls behind a provider-abstraction layer for future multi-provider support |
| Orchestration | Application-level job queue, not MCP | "Orchestration" here means chaining scrape → extract → analyze → generate steps within one request/job; this is normal backend logic, MCP servers are the tools that logic calls, not the orchestrator itself |

Architecture stays modular so new providers/MCP servers can be added later without refactoring the module interfaces — new entries only need to implement `ContentDiscoveryProvider` and declare their capabilities.

---

## 8. V1 Scope (free, local-first)

- **Runtime:** Next.js app, local dev/self-hosted, no forced cloud spend.
- **DB:** Postgres via Prisma — Supabase free tier for hosted (Vercel) deployment, or self-hosted Postgres via Docker for local/offline use. Originally scoped to local-file SQLite; switched to Postgres once the deployment target became Vercel (its serverless filesystem can't host a SQLite file) — see `docs/DEPLOYMENT.md`.
- **AI:** Gemini API free tier, behind a provider-abstraction interface (`AIProvider`) so a paid/alternate model can be swapped later.
- **Discovery:** import + curated library (§5 tiers 1 & 4) on by default; research-mode (tier 3) behind an explicit opt-in toggle with a rate limit and a visible disclaimer.
- **Auth:** single local user for V1 (no multi-tenant billing yet).
- **Deployment:** Docker Compose for local run; deployment guide covers a free-tier host (e.g., Vercel free + Supabase free) as the "V1.5" hosted option.

## 9. Future (V2+, out of scope now but architected for)
- Licensed data-provider integration for true cross-account niche discovery at scale.
- Multi-account/agency mode, team seats, billing.
- Scheduled/automated posting.
- Historical trend tracking (fastest-growing sort becomes fully reliable once reels are tracked over multiple snapshots).

---

## 10. Non-Functional Requirements
- **UI language:** 100% Persian, RTL layout throughout. All code/comments/filenames in English (per Master Prompt).
- **Design:** Apple/iOS-inspired — minimal, premium, glass effects, dark/light mode, smooth animation, responsive, chart-forward.
- **Performance:** AI generation actions return in <15s; dashboard loads cached data instantly, refresh is explicit/on-demand to control API/AI cost.
- **Security:** no credential/session data for scraped accounts persisted in plaintext; rate limiting on any browser-automation path; clear data-provenance labeling everywhere metrics are shown.
- **Scalability:** module boundaries (discovery provider, AI provider, storage) built as swappable interfaces from day one, even though V1 ships the simplest implementation of each.

---

## 11. Open Questions for Sina (need answers before Architecture phase)
1. Confirm the tiered legal approach in §5 (import/curated first, research-mode opt-in, paid provider later) — proceed on this basis, or do you want research-mode browser automation to be the V1 default instead, accepting the higher risk?
2. Is this tool for your own/team use only, or is a hosted multi-user SaaS (with billing) an actual near-term goal? This affects how much auth/billing scaffolding is worth building into V1 vs. deferring.
3. Any specific niches/languages beyond Persian-market Instagram to prioritize for the seed/curated library?
4. Do you already have Instagram Business/Creator account access (yours or a client's) to test the Account Intelligence module against real Graph API data, or should V1 assume no live account connection and work from imported/exported data only?

---

## 12. Approval Gate

Per the Master Prompt: no application code until this PRD is approved. Next phase on approval: **System Architecture** (module boundaries, `ContentDiscoveryProvider` / `AIProvider` interfaces, MCP wiring, request/job flow) → Database schema → UI/UX → Roadmap → Backend → Frontend → Prompt library → Testing → Deployment guide → README, in that order, without skipping phases.
