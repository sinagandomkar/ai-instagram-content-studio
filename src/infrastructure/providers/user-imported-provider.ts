import type {
  ContentDiscoveryProvider,
  ProviderCapability,
} from "@/src/domain/ports/content-discovery-provider";
import type { DiscoveredReel, DiscoveryOptions, RankedReel } from "@/src/domain/entities/reel";
import type { ProviderResult } from "@/src/domain/entities/provider-result";
import { prisma } from "@/lib/prisma";
import { normalizeNiche, toDiscoveredReel, toRankedReel, toPrismaOrderBy } from "./reel-mapping";

function extractMeta(html: string, property: string): string | undefined {
  const match = html.match(
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, "i")
  );
  return match?.[1];
}

/**
 * Best-effort metadata extraction for a pasted public Reel URL — Open Graph
 * tags only, no login, no bulk crawling (PRD §5 tier 1, zero scraping risk).
 * Instagram pages are heavily client-rendered, so OG tags are frequently all
 * a plain fetch can see; whatever isn't found, the user fills in by hand —
 * this never fabricates a number it couldn't read.
 */
async function extractOgMetadata(url: string) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; AIInstagramContentStudio/0.1)" },
  });
  const html = await res.text();
  return {
    thumbnailUrl: extractMeta(html, "og:image"),
    caption: extractMeta(html, "og:description") ?? extractMeta(html, "og:title"),
  };
}

export class UserImportedProvider implements ContentDiscoveryProvider {
  readonly id = "user-imported" as const;
  readonly capabilities: ProviderCapability[] = ["niche-discovery"];

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
    });

    return {
      data: reels.map(toDiscoveredReel),
      source: this.id,
      fetchedAt: new Date().toISOString(),
      confidence: "estimated",
    };
  }

  /**
   * Not part of ContentDiscoveryProvider — this is the write-side "paste a
   * URL" action (PRD §6.2 import flow), called directly by DiscoveryService,
   * not resolved through the provider registry.
   */
  async importFromUrl(params: {
    url: string;
    niche: string;
    creatorUsername: string;
    views?: number;
    likes?: number;
    comments?: number;
  }): Promise<RankedReel> {
    let thumbnailUrl: string | undefined;
    let caption: string | undefined;
    try {
      ({ thumbnailUrl, caption } = await extractOgMetadata(params.url));
    } catch {
      // Extraction is best-effort; the reel is still saved with what the user provided.
    }

    const reel = await prisma.reel.upsert({
      where: { externalId: params.url },
      create: {
        externalId: params.url,
        niche: normalizeNiche(params.niche),
        source: this.id,
        confidence: "estimated",
        creatorUsername: params.creatorUsername,
        thumbnailUrl,
        videoUrl: params.url,
        views: params.views,
        likes: params.likes,
        comments: params.comments,
        transcript: caption,
      },
      update: {
        views: params.views,
        likes: params.likes,
        comments: params.comments,
      },
    });

    return toRankedReel(reel);
  }
}
