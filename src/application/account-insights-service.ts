import { prisma } from "@/lib/prisma";
import type { AccountInsights } from "@/src/domain/entities/account-insights";
import { aiProvider } from "@/src/infrastructure/ai";
import { composioProvider } from "@/src/infrastructure/providers";
import {
  getComposioClient,
  INSTAGRAM_TOOLKIT_SLUG,
  LOCAL_COMPOSIO_USER_ID,
} from "@/src/infrastructure/providers/composio-client";

export interface DashboardSnapshot {
  connected: boolean;
  insights?: AccountInsights;
  growthHistory: { capturedAt: string; followers: number; engagementRate: number }[];
  suggestions: string[];
}

/**
 * Orchestrates PRD §6.1 (Main Dashboard). All data comes from Composio —
 * the only provider that declares `own-account-insights` (see
 * provider-registry.ts) — this service never touches another provider.
 */
export class AccountInsightsService {
  async getDashboard(): Promise<DashboardSnapshot> {
    const account = await prisma.account.findFirst();
    if (!account || !(await composioProvider.isAvailable())) {
      return { connected: false, growthHistory: [], suggestions: [] };
    }

    const result = await composioProvider.getAccountInsights(account.id);

    await prisma.accountSnapshot.create({
      data: {
        accountId: account.id,
        followers: result.data.followers,
        following: result.data.following,
        postsCount: result.data.postsCount,
        engagementRate: result.data.engagementRate,
      },
    });

    const history = await prisma.accountSnapshot.findMany({
      where: { accountId: account.id },
      orderBy: { capturedAt: "asc" },
      take: 90,
    });

    // AI suggestions are a nice-to-have on top of real account data — a Gemini
    // hiccup (rate limit, transient 503, etc.; hit live while testing this) must
    // not take down the whole dashboard when the actual Instagram data is fine.
    let suggestions: string[] = [];
    try {
      const summary =
        `دنبال‌کننده: ${result.data.followers}، نرخ تعامل: ${(result.data.engagementRate * 100).toFixed(1)}٪، ` +
        `تعداد پست: ${result.data.postsCount}، برترین ریلز: ${result.data.topReels[0]?.likes ?? 0} لایک`;
      const suggestionResult = await aiProvider.generate({
        task: "account-suggestions",
        context: { accountSummary: summary },
        language: "fa",
      });
      suggestions = (suggestionResult.output as { suggestions?: string[] }).suggestions ?? [];
    } catch (error) {
      console.error("Account suggestions generation failed (non-fatal):", error);
    }

    return {
      connected: true,
      insights: result.data,
      growthHistory: history.map((h) => ({
        capturedAt: h.capturedAt.toISOString(),
        followers: h.followers,
        engagementRate: h.engagementRate,
      })),
      suggestions,
    };
  }

  /**
   * Composio refuses to `.link()` a second time for the same (userId, authConfigId)
   * pair — throws "Multiple connected accounts found ... use allowMultiple" — once
   * one connection already exists (found live: happened after reconnecting during
   * local dev, then again against a fresh DB after switching to Postgres, since the
   * *Composio-side* connection had already been made and outlives our own DB reset).
   * V1 is single-account, so the right move isn't allowMultiple (piling up duplicate
   * connections) — it's reusing the existing one.
   */
  private async findExistingConnection(client: NonNullable<ReturnType<typeof getComposioClient>>) {
    const { items } = await client.connectedAccounts.list({
      userIds: [LOCAL_COMPOSIO_USER_ID],
      toolkitSlugs: [INSTAGRAM_TOOLKIT_SLUG],
    });
    return items.find((account) => account.status === "ACTIVE");
  }

  /**
   * Starts the Composio-hosted OAuth flow for connecting an Instagram
   * Business/Creator account (PRD §7.1), or — if one is already connected on
   * Composio's side for this user — completes it immediately without a new
   * OAuth round-trip. `COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID` is created once in
   * the Composio dashboard for the "instagram" toolkit — see docs/DEPLOYMENT.md.
   */
  async getConnectUrl(dashboardUrl: string, callbackUrl: string): Promise<{ redirectUrl: string; connectionId?: string }> {
    const client = getComposioClient();
    if (!client) throw new Error("Composio is not configured (COMPOSIO_API_KEY missing)");
    const authConfigId = process.env.COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID;
    if (!authConfigId) throw new Error("COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID is not configured");

    const existing = await this.findExistingConnection(client);
    if (existing) {
      await this.completeConnection(existing.id);
      return { redirectUrl: dashboardUrl };
    }

    const connectionRequest = await client.connectedAccounts.link(
      LOCAL_COMPOSIO_USER_ID,
      authConfigId,
      { callbackUrl }
    );
    // Composio's own redirect back to `callbackUrl` isn't documented to carry a
    // stable query param we can rely on, so the connection id is round-tripped
    // via an httpOnly cookie instead (set by the /connect route) rather than
    // parsed from the callback URL.
    return { redirectUrl: connectionRequest.redirectUrl ?? "", connectionId: connectionRequest.id };
  }

  /** Called from the OAuth callback route once Composio reports the connection as active. */
  async completeConnection(connectedAccountId: string): Promise<void> {
    const client = getComposioClient();
    if (!client) throw new Error("Composio is not configured");

    await client.connectedAccounts.waitForConnection(connectedAccountId);
    const result = await composioProvider.getAccountInsights("pending");

    await prisma.account.upsert({
      where: { instagramUserId: result.data.instagramUserId },
      create: {
        instagramUserId: result.data.instagramUserId,
        username: result.data.username,
        displayName: result.data.displayName,
        profilePictureUrl: result.data.profilePictureUrl,
        // Composio custodies the actual OAuth secret server-side; we only store its
        // connectedAccountId reference here, never a raw token (see Architecture §7).
        credential: { create: { provider: "composio", encryptedToken: connectedAccountId } },
      },
      update: {
        username: result.data.username,
        displayName: result.data.displayName,
        profilePictureUrl: result.data.profilePictureUrl,
      },
    });
  }
}

export const accountInsightsService = new AccountInsightsService();
