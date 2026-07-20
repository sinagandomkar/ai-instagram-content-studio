# System Architecture — AI Instagram Content Studio

**Status:** Approved for build (PRD approved 2026-07-19; Composio decision locked)
**Depends on:** `PRD.md` §5, §6, §7

---

## 1. Architectural Style

Clean Architecture / hexagonal, adapted to a Next.js app router monolith:

```
┌─────────────────────────────────────────────────────────────┐
│  Presentation  — app/(routes)/*  React Server/Client Comps   │
├─────────────────────────────────────────────────────────────┤
│  API Layer     — app/api/**/route.ts (thin, validates + calls│
│                   application services)                       │
├─────────────────────────────────────────────────────────────┤
│  Application    — src/application/*  use-cases / services    │
│  (orchestration, no framework or vendor imports)              │
├─────────────────────────────────────────────────────────────┤
│  Domain         — src/domain/*  entities, value objects,      │
│                   provider interfaces (ports)                 │
├─────────────────────────────────────────────────────────────┤
│  Infrastructure — src/infrastructure/*  provider              │
│  implementations (adapters): Composio, Curated, Imported,     │
│  Playwright MCP, Gemini, Prisma repositories                  │
└─────────────────────────────────────────────────────────────┘
```

Dependency rule: inner layers (domain, application) never import from infrastructure or Next.js. Infrastructure implements domain-defined interfaces (ports). This is what makes the provider swap in §7.1 of the PRD actually work — the application layer only ever calls `ContentDiscoveryProvider` and `AIProvider` interfaces, never a concrete vendor SDK.

---

## 2. Core Interfaces (Domain Layer)

### 2.1 `ContentDiscoveryProvider`

```ts
// src/domain/ports/content-discovery-provider.ts

export type ProviderCapability =
  | "own-account-insights"
  | "own-account-comments"
  | "own-account-posting-history"
  | "niche-discovery"
  | "trend-history"
  | "publish"; // reserved, V2+

export interface ProviderResult<T> {
  data: T;
  source: ProviderId;         // which provider actually answered
  fetchedAt: string;          // ISO timestamp
  confidence: "verified" | "estimated"; // official API vs. scraped/imported
}

export type ProviderId =
  | "composio"
  | "curated-library"
  | "user-imported"
  | "browser-automation"
  | "commercial-provider";

export interface ContentDiscoveryProvider {
  readonly id: ProviderId;
  readonly capabilities: ProviderCapability[];
  isAvailable(): Promise<boolean>; // e.g. Composio only "available" if account connected

  getAccountInsights?(accountId: string): Promise<ProviderResult<AccountInsights>>;
  getAccountComments?(accountId: string, postId: string): Promise<ProviderResult<Comment[]>>;
  getPostingHistory?(accountId: string): Promise<ProviderResult<PostingEvent[]>>;
  discoverReelsByNiche?(niche: string, opts: DiscoveryOptions): Promise<ProviderResult<Reel[]>>;
}
```

### 2.2 Provider Registry (capability-based selection — PRD §7.1)

```ts
// src/domain/services/provider-registry.ts

export class ProviderRegistry {
  constructor(private providers: ContentDiscoveryProvider[]) {}

  async resolve(capability: ProviderCapability): Promise<ContentDiscoveryProvider[]> {
    // Fixed priority per capability, filtered to providers that declare it AND are available.
    const priority = PRIORITY_BY_CAPABILITY[capability]; // e.g. niche-discovery: [commercial, curated, imported, browser-automation]
    const candidates = priority
      .map(id => this.providers.find(p => p.id === id))
      .filter((p): p is ContentDiscoveryProvider => !!p && p.capabilities.includes(capability));

    const available: ContentDiscoveryProvider[] = [];
    for (const p of candidates) if (await p.isAvailable()) available.push(p);
    return available; // caller tries in order, first non-empty result wins
  }
}
```

`own-account-*` capabilities have exactly one entry in `PRIORITY_BY_CAPABILITY`: `["composio"]`. This is enforced at the constant level, not left to runtime chance — encodes the PRD's "hard capability boundary."

### 2.3 `AIProvider`

```ts
// src/domain/ports/ai-provider.ts

export interface AIProvider {
  readonly id: "gemini" | string;
  generate(prompt: GenerationRequest): Promise<GenerationResult>;
}

export interface GenerationRequest {
  task: ReelActionType; // "script" | "hook" | "caption" | "hashtags" | "story-sequence" | ...
  context: ReelContext;  // transcript/description/metrics/niche, all optional
  language: "fa"; // Persian output, always, for V1
}
```

One Gemini-backed implementation in V1 (`src/infrastructure/ai/gemini-provider.ts`); the interface is what allows a second provider later without touching application code.

---

## 3. Module → Layer Mapping

| PRD Module | Application service | Domain ports used | Primary infra adapters |
| --- | --- | --- | --- |
| 6.1 Main Dashboard | `AccountInsightsService` | `own-account-insights` | Composio |
| 6.2 Viral Content Engine | `DiscoveryService` | `niche-discovery`, `trend-history` | Curated, Imported, Browser Automation, (Commercial V2+) |
| 6.3 Reel Actions | `ReelActionService` | `AIProvider` | Gemini |
| 6.4 AI Content Generation | `ContentGenerationService` | `AIProvider` | Gemini |
| 6.5 Story Generator | `StoryGenerationService` | `AIProvider` | Gemini |
| 6.6 Comment Intelligence | `CommentIntelligenceService` | `own-account-comments`, `AIProvider` | Composio (data) + Gemini (analysis) |
| 6.7 Posting Recommendations | `PostingRecommendationService` | `own-account-posting-history`, `AIProvider` | Composio (data) + Gemini (reasoning) |

Each service lives in `src/application/*`, is framework-agnostic, and is the only thing API routes call.

---

## 4. Request Flows

### 4.1 Niche discovery (`POST /api/discovery`)

1. API route validates `{ niche, sort }`, calls `DiscoveryService.discover(niche, sort)`.
2. Service asks `ProviderRegistry.resolve("niche-discovery")`.
3. Iterates candidates in priority order; on the first provider that returns ≥1 result, stops and tags every `Reel` with `source` + `confidence`.
4. If Browser Automation is a candidate but the user hasn't opted in (checked via a settings flag, not a capability), it's excluded before the registry call — opt-in is a policy gate, not a capability gate.
5. Results persisted to `Reel` table (upsert by `externalId`) so re-sorting/"fastest growing" can use historical snapshots later.
6. If zero providers return data, API responds `200` with `{ reels: [], reason: "no-provider-available" }` — UI renders the explicit empty state from PRD §7.1, never a silent empty grid.

### 4.2 Reel Action (`POST /api/reels/:id/actions/:action`)

1. Load `Reel` + any cached transcript/context from DB.
2. `ReelActionService` builds a `GenerationRequest` from the prompt library (see §8) for the requested action.
3. Calls `AIProvider.generate()`, streams or returns the Persian result.
4. Result stored under `GeneratedContent` linked to the `Reel`, editable and re-runnable (new row per run, not overwritten — keeps history).

### 4.3 Account dashboard (`GET /api/dashboard`)

1. If no Composio connection exists for the session → return a "connect account" state; dashboard falls back to any imported/exported data present, clearly labeled per PRD §6.1.
2. If connected → `AccountInsightsService` calls Composio adapter for profile, growth, engagement, top posts/reels, posting history; assembles a single `DashboardSnapshot` DTO; caches it (see §6) so repeat loads don't re-hit the API.

---

## 5. MCP Wiring

| Adapter | Mechanism |
| --- | --- |
| `ComposioProvider` | Calls Composio's Instagram Graph API tools via its MCP/tool-calling integration; OAuth token stored server-side (encrypted at rest, §7), never exposed to the client |
| `BrowserAutomationProvider` | Wraps Playwright MCP calls; every invocation rate-limited (token bucket, per-session) and logged with a "research-mode" flag |
| `FetchExtractionService` | Wraps Firecrawl/Fetch MCP for turning a pasted URL into clean text, used by `user-imported` provider and by Reel Actions when a transcript isn't otherwise available |
| `TrendSearchService` | Wraps Exa/Tavily MCP, used by "Explain Why It Went Viral" to pull outside context (articles, format trends) when useful |

MCP clients are constructed once at the infrastructure boundary and injected into the relevant provider adapter — application/domain code never talks to an MCP client directly, only to the `ContentDiscoveryProvider`/`AIProvider` port.

---

## 6. Caching & Cost Control

- `DashboardSnapshot` and `Reel` discovery results cached in SQLite with a `fetchedAt`; UI shows "last updated" and a manual refresh button rather than polling, to keep Composio/AI calls low (PRD NFR: on-demand refresh).
- AI generations are cached per `(reelId, action, promptVersion)` — re-opening a Reel card doesn't regenerate unless the user explicitly asks to.

## 7. Security

- Composio OAuth tokens and any provider credentials: stored server-side only (Prisma `Credential` table, encrypted with a local key in V1, KMS-backed in hosted V2), never sent to the client.
- Browser Automation provider never stores the user's Instagram password; it drives a session the user authenticates interactively, scoped to research use only (PRD §5).
- All API routes validate input with Zod before touching a service.

## 8. Prompt Library Location

`src/infrastructure/ai/prompts/*.ts` — one module per Reel Action / generation task, each exporting a typed prompt-builder function consumed by `ContentGenerationService`. Documented in full in `docs/PROMPT_LIBRARY.md` once drafted (Deliverable 8).

## 9. Folder Structure (target)

```
app/
  (dashboard)/page.tsx
  (discovery)/page.tsx
  (library)/page.tsx
  api/
    dashboard/route.ts
    discovery/route.ts
    reels/[id]/actions/[action]/route.ts
    comments/route.ts
    posting-recommendations/route.ts
src/
  domain/
    entities/
    ports/
    services/provider-registry.ts
  application/
    account-insights-service.ts
    discovery-service.ts
    reel-action-service.ts
    content-generation-service.ts
    story-generation-service.ts
    comment-intelligence-service.ts
    posting-recommendation-service.ts
  infrastructure/
    providers/
      composio-provider.ts
      curated-library-provider.ts
      user-imported-provider.ts
      browser-automation-provider.ts
    ai/
      gemini-provider.ts
      prompts/
    persistence/
      prisma/
  components/  (shadcn/ui-based, RTL)
  lib/
prisma/
  schema.prisma
docs/
```
