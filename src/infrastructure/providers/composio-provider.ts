import type {
  ContentDiscoveryProvider,
  ProviderCapability,
} from "@/src/domain/ports/content-discovery-provider";
import type {
  AccountInsights,
  PostingEvent,
  RawComment,
  TopContentItem,
} from "@/src/domain/entities/account-insights";
import type { ProviderResult } from "@/src/domain/entities/provider-result";
import {
  getComposioClient,
  INSTAGRAM_ACTIONS,
  INSTAGRAM_TOOLKIT_SLUG,
  LOCAL_COMPOSIO_USER_ID,
} from "./composio-client";

/** Raw Instagram Graph API media item shape, as returned (unwrapped) by INSTAGRAM_GET_IG_USER_MEDIA. */
interface IgMediaItem {
  id: string;
  media_type?: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_product_type?: "FEED" | "REELS" | "STORY";
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  caption?: string;
  like_count?: number;
  comments_count?: number;
  timestamp?: string;
}

/**
 * The Graph API's `total_value` insights shape isn't pinned down further than what
 * Composio's docs describe ("returns a total_value object instead of values" — see
 * composio-client.ts), so this reads defensively across the couple of plausible
 * wrapper shapes rather than assuming one; returns undefined (never throws) if the
 * "reach" metric isn't where expected, since the caller already treats this as
 * optional and falls back to a follower-based estimate.
 */
function extractReachMetric(data: unknown): number | undefined {
  const entries = (data as { data?: unknown[] })?.data;
  if (!Array.isArray(entries)) return undefined;

  const reachEntry = entries.find(
    (entry): entry is { name: string; total_value?: { value?: number }; values?: { value?: number }[] } =>
      typeof entry === "object" && entry !== null && (entry as { name?: string }).name === "reach"
  );
  return reachEntry?.total_value?.value ?? reachEntry?.values?.[0]?.value;
}

function toTopContentItem(item: IgMediaItem): TopContentItem {
  return {
    externalId: item.id,
    type: item.media_product_type === "REELS" ? "reel" : "post",
    thumbnailUrl: item.thumbnail_url ?? item.media_url,
    caption: item.caption,
    likes: item.like_count ?? 0,
    comments: item.comments_count ?? 0,
    publishDate: item.timestamp ?? new Date().toISOString(),
  };
}

/**
 * Official Instagram Graph API access, brokered through Composio (PRD §7.1).
 * The sole provider for `own-account-*` capabilities — see provider-registry.ts
 * for why nothing else is ever asked for this data.
 */
export class ComposioProvider implements ContentDiscoveryProvider {
  readonly id = "composio" as const;
  readonly capabilities: ProviderCapability[] = [
    "own-account-insights",
    "own-account-comments",
    "own-account-posting-history",
  ];

  async isAvailable(): Promise<boolean> {
    const client = getComposioClient();
    if (!client) return false;
    try {
      const { items } = await client.connectedAccounts.list({
        userIds: [LOCAL_COMPOSIO_USER_ID],
        toolkitSlugs: [INSTAGRAM_TOOLKIT_SLUG],
      });
      return items.some((account) => account.status === "ACTIVE");
    } catch {
      return false;
    }
  }

  private async fetchMedia(limit = 25): Promise<IgMediaItem[]> {
    const client = getComposioClient();
    if (!client) throw new Error("Composio client not configured");

    const result = await client.tools.execute(INSTAGRAM_ACTIONS.getUserMedia, {
      userId: LOCAL_COMPOSIO_USER_ID,
      arguments: { ig_user_id: "me", limit },
      // V1 doesn't pin toolkit versions (docs/PROMPT_LIBRARY.md-style version pinning is
      // for prompts, not this) — Composio requires either an explicit version or this flag
      // for manual tool execution; found live when a real OAuth connection completion
      // threw TS-SDK::TOOL_VERSION_REQUIRED. Revisit if toolkit updates ever break a call.
      dangerouslySkipVersionCheck: true,
    });
    if (!result.successful) throw new Error(result.error ?? "INSTAGRAM_GET_IG_USER_MEDIA failed");

    // result.data is Composio's envelope; its own .data field is the Instagram Graph
    // API's standard {data: [...], paging: {...}} response, so the array is one level
    // down — not double-nested under data.data.data as an earlier assumption had it
    // (Composio's docs describe that double-nesting for a *different*, deprecated
    // action). Confirmed against a real response from a live connected account.
    const raw = (result.data as { data?: IgMediaItem[] }).data ?? [];
    return raw;
  }

  async getAccountInsights(accountId: string): Promise<ProviderResult<AccountInsights>> {
    void accountId; // V1 is single-account; Composio scopes by LOCAL_COMPOSIO_USER_ID, not this id.
    const client = getComposioClient();
    if (!client) throw new Error("Composio client not configured");

    const [profileResult, insightsResult, media] = await Promise.all([
      client.tools.execute(INSTAGRAM_ACTIONS.getUserInfo, {
        userId: LOCAL_COMPOSIO_USER_ID,
        arguments: { ig_user_id: "me" },
        dangerouslySkipVersionCheck: true,
      }),
      client.tools.execute(INSTAGRAM_ACTIONS.getUserInsights, {
        userId: LOCAL_COMPOSIO_USER_ID,
        arguments: {
          ig_user_id: "me",
          metric: ["reach", "profile_views", "follower_count"],
          period: "day",
          metric_type: "total_value",
        },
        dangerouslySkipVersionCheck: true,
      }),
      this.fetchMedia(50),
    ]);

    if (!profileResult.successful) {
      throw new Error(profileResult.error ?? "INSTAGRAM_GET_USER_INFO failed");
    }

    const profile = profileResult.data as {
      id?: string;
      username?: string;
      name?: string;
      profile_picture_url?: string;
      followers_count?: number;
      follows_count?: number;
      media_count?: number;
    };

    const sortedByLikes = [...media].sort((a, b) => (b.like_count ?? 0) - (a.like_count ?? 0));
    const topPosts = sortedByLikes
      .filter((m) => m.media_product_type !== "REELS")
      .slice(0, 10)
      .map(toTopContentItem);
    const topReels = sortedByLikes
      .filter((m) => m.media_product_type === "REELS")
      .slice(0, 10)
      .map(toTopContentItem);

    const totalLikes = media.reduce((sum, m) => sum + (m.like_count ?? 0), 0);
    const totalComments = media.reduce((sum, m) => sum + (m.comments_count ?? 0), 0);
    const followers = profile.followers_count ?? 0;

    // Prefer reach-based engagement (likes+comments / actual reach) when the insights
    // call succeeds — it's the more accurate denominator than follower count, which
    // overcounts (not every follower sees every post). Insights can fail (e.g. under
    // 1,000 followers per Composio's documented threshold), so this degrades to the
    // follower-based approximation rather than failing the whole dashboard.
    const reach = insightsResult.successful ? extractReachMetric(insightsResult.data) : undefined;
    const denominator = reach ?? followers;
    const engagementRate =
      denominator > 0 && media.length > 0 ? (totalLikes + totalComments) / media.length / denominator : 0;

    const insights: AccountInsights = {
      instagramUserId: profile.id ?? "me",
      username: profile.username ?? "",
      displayName: profile.name,
      profilePictureUrl: profile.profile_picture_url,
      followers,
      following: profile.follows_count ?? 0,
      postsCount: profile.media_count ?? media.length,
      engagementRate,
      topPosts,
      topReels,
    };

    return {
      data: insights,
      source: this.id,
      fetchedAt: new Date().toISOString(),
      confidence: "verified",
    };
  }

  async getAccountComments(
    accountId: string,
    postExternalId: string
  ): Promise<ProviderResult<RawComment[]>> {
    void accountId;
    const client = getComposioClient();
    if (!client) throw new Error("Composio client not configured");

    const result = await client.tools.execute(INSTAGRAM_ACTIONS.getMediaComments, {
      userId: LOCAL_COMPOSIO_USER_ID,
      arguments: { ig_media_id: postExternalId },
      dangerouslySkipVersionCheck: true,
    });
    if (!result.successful) {
      throw new Error(result.error ?? "INSTAGRAM_GET_IG_MEDIA_COMMENTS failed");
    }

    // Same envelope shape as fetchMedia() above (result.data.data is the array
    // directly) — not verified live for this specific action yet, but inferred
    // from the confirmed shape of the sibling media-list action.
    const raw =
      (result.data as { data?: { id: string; username?: string; text: string }[] }).data ?? [];

    return {
      data: raw.map((c) => ({ externalId: c.id, authorUsername: c.username, text: c.text })),
      source: this.id,
      fetchedAt: new Date().toISOString(),
      confidence: "verified",
    };
  }

  async getPostingHistory(accountId: string): Promise<ProviderResult<PostingEvent[]>> {
    void accountId;
    const media = await this.fetchMedia(100);
    const events: PostingEvent[] = media
      .filter((m) => m.timestamp)
      .map((m) => ({
        publishedAt: m.timestamp as string,
        type: m.media_product_type === "REELS" ? "reel" : "post",
        likes: m.like_count ?? 0,
        comments: m.comments_count ?? 0,
      }));

    return {
      data: events,
      source: this.id,
      fetchedAt: new Date().toISOString(),
      confidence: "verified",
    };
  }
}
