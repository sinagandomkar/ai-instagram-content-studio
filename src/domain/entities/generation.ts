/** Every generation task the product offers (PRD §6.3, §6.4, §6.5, §6.6, §6.7). */
export type GenerationTask =
  | "script"
  | "hook"
  | "caption"
  | "hashtags"
  | "recording-tips"
  | "cover-title"
  | "keywords"
  | "why-viral"
  | "audience-analysis"
  | "story-sequence"
  | "carousel"
  | "comment-insights"
  | "posting-recommendations"
  | "account-suggestions";

/** Context handed to the AI provider — everything is optional except the task, since not
 * every Reel has a transcript, and account-level tasks have no Reel at all. */
export interface ReelContext {
  niche?: string;
  creatorUsername?: string;
  caption?: string;
  transcript?: string;
  views?: number;
  likes?: number;
  comments?: number;
  /** Free-form extra instructions from the user (e.g. brand voice notes). */
  notes?: string;
  /** Raw comment text, for the `comment-insights` task only. */
  commentTexts?: string[];
  /** Posting history summary, for the `posting-recommendations` task only. */
  postingHistorySummary?: string;
  /** Account performance summary, for the `account-suggestions` task only. */
  accountSummary?: string;
}

export interface GenerationRequest {
  task: GenerationTask;
  context: ReelContext;
  language: "fa";
}

export interface GenerationResult {
  task: GenerationTask;
  /** Structured payload — shape depends on `task`; see docs/PROMPT_LIBRARY.md */
  output: unknown;
  promptVersion: string;
  raw: string;
}
