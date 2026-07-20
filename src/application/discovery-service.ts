import { prisma } from "@/lib/prisma";
import type { DiscoveredReel, RankedReel, ReelSortOption } from "@/src/domain/entities/reel";
import { providerRegistry, userImportedProvider } from "@/src/infrastructure/providers";
import { normalizeNiche, toRankedReel } from "@/src/infrastructure/providers/reel-mapping";

export interface DiscoveryResult {
  reels: RankedReel[];
  /** Present only when no provider could serve the request at all (Architecture §4.1). */
  reason?: "no-provider-available";
}

/**
 * Orchestrates the Viral Content Engine's discovery flow (PRD §6.2). Tries
 * providers in the registry's priority order for "niche-discovery" and stops
 * at the first one that returns results; persists whatever it finds so
 * "Fastest Growing" has snapshot history to compute from over time.
 */
export class DiscoveryService {
  async discover(params: {
    niche: string;
    sort: ReelSortOption;
    allowResearchMode: boolean;
    limit?: number;
  }): Promise<DiscoveryResult> {
    const niche = normalizeNiche(params.niche);
    const candidates = await providerRegistry.resolve("niche-discovery");

    for (const provider of candidates) {
      if (!provider.discoverReelsByNiche) continue;
      const result = await provider.discoverReelsByNiche(niche, {
        sort: params.sort,
        allowResearchMode: params.allowResearchMode,
        limit: params.limit,
      });
      if (result.data.length === 0) continue;

      const saved = await this.persist(result.data);

      if (params.sort === "fastest-growing") {
        return { reels: await this.rankByGrowth(niche) };
      }
      return { reels: saved };
    }

    return { reels: [], reason: "no-provider-available" };
  }

  async importFromUrl(params: {
    url: string;
    niche: string;
    creatorUsername: string;
    views?: number;
    likes?: number;
    comments?: number;
  }): Promise<RankedReel> {
    return userImportedProvider.importFromUrl(params);
  }

  private async persist(reels: DiscoveredReel[]): Promise<RankedReel[]> {
    const savedReels: RankedReel[] = [];
    for (const reel of reels) {
      const saved = await prisma.reel.upsert({
        where: { externalId: reel.externalId },
        create: {
          externalId: reel.externalId,
          niche: normalizeNiche(reel.niche),
          source: reel.source,
          confidence: reel.confidence,
          creatorUsername: reel.creatorUsername,
          thumbnailUrl: reel.thumbnailUrl,
          videoUrl: reel.videoUrl,
          views: reel.views,
          likes: reel.likes,
          comments: reel.comments,
          publishDate: reel.publishDate ? new Date(reel.publishDate) : undefined,
          estimatedEngagement: reel.estimatedEngagement,
          transcript: reel.transcript,
        },
        update: {
          views: reel.views,
          likes: reel.likes,
          comments: reel.comments,
          estimatedEngagement: reel.estimatedEngagement,
        },
      });

      if (reel.views !== undefined || reel.likes !== undefined || reel.comments !== undefined) {
        await prisma.reelSnapshot.create({
          data: { reelId: saved.id, views: reel.views, likes: reel.likes, comments: reel.comments },
        });
      }

      savedReels.push(toRankedReel(saved));
    }
    return savedReels;
  }

  /** "Fastest Growing" (PRD §6.2) — only reels with ≥2 snapshots are ranked; a first-import reel has no growth to measure yet. */
  private async rankByGrowth(niche: string): Promise<RankedReel[]> {
    const reels = await prisma.reel.findMany({
      where: { niche },
      include: { snapshots: { orderBy: { capturedAt: "asc" } } },
    });

    const withGrowth = reels
      .filter((r) => r.snapshots.length >= 2)
      .map((r) => {
        const first = r.snapshots[0];
        const last = r.snapshots[r.snapshots.length - 1];
        const growth = (last.views ?? 0) - (first.views ?? 0);
        return { reel: r, growth };
      })
      .sort((a, b) => b.growth - a.growth);

    return withGrowth.map(({ reel }) => toRankedReel(reel));
  }
}

export const discoveryService = new DiscoveryService();
