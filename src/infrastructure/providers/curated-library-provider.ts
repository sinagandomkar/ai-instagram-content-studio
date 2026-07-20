import type {
  ContentDiscoveryProvider,
  ProviderCapability,
} from "@/src/domain/ports/content-discovery-provider";
import type { DiscoveredReel, DiscoveryOptions } from "@/src/domain/entities/reel";
import type { ProviderResult } from "@/src/domain/entities/provider-result";
import { prisma } from "@/lib/prisma";
import { normalizeNiche, toDiscoveredReel, toPrismaOrderBy } from "./reel-mapping";

/**
 * The manually-maintained seed set (PRD §5 tier 4 / §7.1). Reels land here
 * either via a future "promote to library" action on a SavedLibraryItem, or
 * via a one-off seed script — V1 has no automated writer for this provider,
 * only a reader, which is intentional (curation is a human act).
 */
export class CuratedLibraryProvider implements ContentDiscoveryProvider {
  readonly id = "curated-library" as const;
  readonly capabilities: ProviderCapability[] = ["niche-discovery", "trend-history"];

  async isAvailable(): Promise<boolean> {
    return true; // pure DB read, always available
  }

  async discoverReelsByNiche(
    niche: string,
    opts: DiscoveryOptions
  ): Promise<ProviderResult<DiscoveredReel[]>> {
    const reels = await prisma.reel.findMany({
      where: { niche: normalizeNiche(niche), source: this.id },
      orderBy: toPrismaOrderBy(opts.sort),
      take: opts.limit ?? 24,
      include: { snapshots: true },
    });

    return {
      data: reels.map(toDiscoveredReel),
      source: this.id,
      fetchedAt: new Date().toISOString(),
      confidence: "estimated",
    };
  }
}
