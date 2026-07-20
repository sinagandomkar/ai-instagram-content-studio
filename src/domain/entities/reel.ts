import type { Confidence, ProviderId } from "./provider-result";

/**
 * A Reel as returned by a discovery provider, before persistence.
 * Mirrors prisma `Reel` fields the application actually needs to write;
 * see docs/DATABASE.md for the persisted shape.
 */
export interface DiscoveredReel {
  externalId: string;
  niche: string;
  source: ProviderId;
  confidence: Confidence;
  creatorUsername: string;
  thumbnailUrl?: string;
  videoUrl: string;
  views?: number;
  likes?: number;
  comments?: number;
  publishDate?: string; // ISO date
  estimatedEngagement?: number;
  transcript?: string;
}

export type ReelSortOption =
  | "most-viewed"
  | "highest-engagement"
  | "newest"
  | "fastest-growing";

export interface DiscoveryOptions {
  sort: ReelSortOption;
  limit?: number;
  /** Whether the caller has opted in to the browser-automation "research mode" provider. */
  allowResearchMode: boolean;
}

/** A DiscoveredReel after persistence — `id` is what the frontend needs to call /api/reels/[id]/* (Reel Actions). */
export type RankedReel = DiscoveredReel & { id: string };
