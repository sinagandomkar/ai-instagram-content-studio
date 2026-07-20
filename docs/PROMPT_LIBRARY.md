# Prompt Library — AI Instagram Content Studio

**Implementation:** `src/infrastructure/ai/prompts/index.ts` (`buildGenerationPrompt`), consumed by `GeminiProvider` (`src/infrastructure/ai/gemini-provider.ts`).
**Model:** `gemini-2.5-flash` (free tier, V1 default — see PRD §8).
**Output contract:** every task requests `responseMimeType: "application/json"` with an explicit `responseSchema`, so callers get structured data, not prose to re-parse.

## Shared system instruction

Every task shares one system instruction (`BASE_SYSTEM`): answer in fluent, natural Persian, no mixed-in English except unavoidable technical terms, and be concrete to the supplied context rather than generic. This is what keeps output consistent across all nine Reel Actions without repeating the instruction nine times.

## Shared context block

`contextBlock()` turns whatever's known about a Reel (niche, creator, caption, transcript, views/likes/comments, free-form user notes) into a compact Persian-labeled block appended to every prompt. Fields are optional — a Reel with no transcript still produces a prompt, just a shorter one — and the model is told explicitly to fall back to general best practice when context is thin, rather than the app silently sending an empty prompt.

## Task → prompt map

| Task | Produces | Notes |
| --- | --- | --- |
| `script` | hook, body (array of lines), cta, estimated duration | "inspired by, not copied" is stated explicitly in the prompt — this is a springboard, not a duplicate |
| `hook` | 3 alternative hooks | For "Generate Better Hook" |
| `caption` | one caption | Hook sentence + short body + explicit CTA |
| `hashtags` | 15–20 hashtags | Mix of high-volume and niche-specific |
| `recording-tips` | array of concrete filming tips | Framing, lighting, camera movement, location |
| `cover-title` | 3 thumbnail-title options | Short, curiosity-driving |
| `keywords` | array of in-app SEO keywords | For alt text / Instagram search |
| `why-viral` | reasons (array) + one replicable pattern | Feeds "Explain Why It Went Viral" |
| `audience-analysis` | audience summary, pain points, motivations | Feeds "Analyze Audience" |
| `story-sequence` | 4–6 frames, each with text/visualIdea/poll/questionBox/cta/sticker | Maps directly to `StorySequence`/`StoryFrame` (docs/DATABASE.md) |
| `carousel` | 5–8 slides, each with title/body | Feeds "Generate Carousel" |
| `comment-insights` | pain points, repeated questions, desired topics, sentiment split | Feeds Comment Intelligence (§6.6); input is raw comment text via `ReelContext.commentTexts`, not a single caption |
| `posting-recommendations` | best days, best hours, frequency, reasoning | Feeds Posting Recommendations (§6.7); input is a posting-history summary via `ReelContext.postingHistorySummary` |
| `account-suggestions` | 3–5 suggestions | Feeds the Dashboard's "Suggested Improvements" (§6.1); input is `ReelContext.accountSummary` |

## Versioning

`PROMPT_VERSION` (currently `2026-07-19.1`) is stamped on every `GeneratedContent` row at creation time. Bump it whenever a prompt's wording or `responseSchema` changes in a way that would make old and new output meaningfully different — this is what lets the Library screen (PRD §6.3/UI §4.3) show which prompt version produced a given draft, per Architecture §8.

## Extending

Adding a new generation task means: add it to `GenerationTask` (`src/domain/entities/generation.ts`), add a `case` in `buildGenerationPrompt`, and — if it needs new persisted shape beyond `GeneratedContent.content` JSON — extend `docs/DATABASE.md`. No other layer needs to change; `ReelActionService`/`ContentGenerationService` call `AIProvider.generate()` generically by task name.
