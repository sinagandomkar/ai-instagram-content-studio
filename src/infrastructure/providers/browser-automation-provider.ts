import type {
  ContentDiscoveryProvider,
  ProviderCapability,
} from "@/src/domain/ports/content-discovery-provider";
import type { DiscoveredReel, DiscoveryOptions } from "@/src/domain/entities/reel";
import type { ProviderResult } from "@/src/domain/entities/provider-result";
import { prisma } from "@/lib/prisma";
import {
  assertWithinResearchModeRateLimit,
  getPlaywrightMcpClient,
} from "@/src/infrastructure/mcp/playwright-mcp-client";

interface ExtractedPost {
  url?: string;
  thumbnail?: string;
  caption?: string;
}

/**
 * "Research mode" discovery — the user's own authenticated browser session,
 * driven via the Playwright MCP server, navigating public Instagram pages
 * (hashtag/explore surfaces) to collect what's visibly public.
 *
 * Off by default; only ever consulted by the ProviderRegistry when
 * `Settings.researchModeEnabled` is true (checked in isAvailable(), and
 * again by the caller before resolving "niche-discovery" — see
 * docs/ARCHITECTURE.md §4.1). Rate-limited so this never becomes bulk
 * scraping (PRD §5) — every result is tagged `confidence: "estimated"` and
 * `source: "browser-automation"`, never presented as verified.
 */
export class BrowserAutomationProvider implements ContentDiscoveryProvider {
  readonly id = "browser-automation" as const;
  readonly capabilities: ProviderCapability[] = ["niche-discovery"];

  async isAvailable(): Promise<boolean> {
    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    return settings?.researchModeEnabled ?? false;
  }

  async discoverReelsByNiche(
    niche: string,
    opts: DiscoveryOptions
  ): Promise<ProviderResult<DiscoveredReel[]>> {
    if (!opts.allowResearchMode) {
      return { data: [], source: this.id, fetchedAt: new Date().toISOString(), confidence: "estimated" };
    }

    assertWithinResearchModeRateLimit();

    const client = await getPlaywrightMcpClient();
    const hashtag = encodeURIComponent(niche.replace(/\s+/g, ""));

    await client.callTool({
      name: "browser_navigate",
      arguments: { url: `https://www.instagram.com/explore/tags/${hashtag}/` },
    });

    // Best-effort extraction of whatever the logged-out/public DOM exposes
    // (post permalinks + thumbnails). Instagram's public tag pages render
    // client-side and often gate full data behind a login wall — this
    // intentionally degrades to an empty list rather than fabricating data
    // when the page doesn't expose what we're looking for.
    const evalResult = await client.callTool({
      name: "browser_evaluate",
      arguments: {
        function: `() => Array.from(document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]'))
          .slice(0, 24)
          .map((a) => ({
            url: a.href,
            thumbnail: a.querySelector('img')?.getAttribute('src') ?? undefined,
            caption: a.querySelector('img')?.getAttribute('alt') ?? undefined,
          }))`,
      },
    });

    const extracted = parseEvaluateResult(evalResult);

    const reels: DiscoveredReel[] = extracted
      .filter((post) => post.url)
      .map((post) => ({
        externalId: post.url as string,
        niche,
        source: this.id,
        confidence: "estimated",
        creatorUsername: "unknown",
        thumbnailUrl: post.thumbnail,
        videoUrl: post.url as string,
        transcript: post.caption,
      }));

    return { data: reels, source: this.id, fetchedAt: new Date().toISOString(), confidence: "estimated" };
  }
}

function parseEvaluateResult(result: unknown): ExtractedPost[] {
  try {
    const content = (result as { content?: { type: string; text?: string }[] }).content ?? [];
    const textBlock = content.find((c) => c.type === "text");
    if (!textBlock?.text) return [];
    const parsed = JSON.parse(textBlock.text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
