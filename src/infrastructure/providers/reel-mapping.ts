import type { DiscoveredReel, RankedReel, ReelSortOption } from "@/src/domain/entities/reel";
import type { Confidence, ProviderId } from "@/src/domain/entities/provider-result";
import type { Reel as PrismaReel, ReelSnapshot } from "@/lib/generated/prisma/client";

/** SQLite has no case-insensitive `mode` filter (Postgres/MySQL only) — normalize instead. */
export function normalizeNiche(niche: string): string {
  return niche.trim().toLowerCase();
}

export function toDiscoveredReel(reel: PrismaReel & { snapshots?: ReelSnapshot[] }): DiscoveredReel {
  return {
    externalId: reel.externalId,
    niche: reel.niche,
    source: reel.source as ProviderId,
    confidence: reel.confidence as Confidence,
    creatorUsername: reel.creatorUsername,
    thumbnailUrl: reel.thumbnailUrl ?? undefined,
    videoUrl: reel.videoUrl,
    views: reel.views ?? undefined,
    likes: reel.likes ?? undefined,
    comments: reel.comments ?? undefined,
    publishDate: reel.publishDate?.toISOString(),
    estimatedEngagement: reel.estimatedEngagement ?? undefined,
    transcript: reel.transcript ?? undefined,
  };
}

export function toRankedReel(reel: PrismaReel & { snapshots?: ReelSnapshot[] }): RankedReel {
  return { ...toDiscoveredReel(reel), id: reel.id };
}

/**
 * "Fastest Growing" has no direct DB column — it's derived from ReelSnapshot
 * deltas (PRD §6.2), so it's handled by the caller (DiscoveryService) after
 * fetching with at least two snapshots, not here.
 */
export function toPrismaOrderBy(sort: ReelSortOption) {
  switch (sort) {
    case "most-viewed":
      return { views: "desc" as const };
    case "highest-engagement":
      return { estimatedEngagement: "desc" as const };
    case "newest":
      return { publishDate: "desc" as const };
    case "fastest-growing":
      return { fetchedAt: "desc" as const }; // provisional; refined post-fetch
  }
}
