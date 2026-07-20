import { prisma } from "@/lib/prisma";
import type { AccountInsights } from "@/src/domain/entities/account-insights";
import { aiProvider } from "@/src/infrastructure/ai";
import { composioProvider } from "@/src/infrastructure/providers";
import { getComposioClient, LOCAL_COMPOSIO_USER_ID } from "@/src/infrastructure/providers/composio-client";

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

    const summary =
      `دنبال‌کننده: ${result.data.followers}، نرخ تعامل: ${(result.data.engagementRate * 100).toFixed(1)}٪، ` +
      `تعداد پست: ${result.data.postsCount}، برترین ریلز: ${result.data.topReels[0]?.likes ?? 0} لایک`;
    const suggestionResult = await aiProvider.generate({
      task: "account-suggestions",
      context: { accountSummary: summary },
      language: "fa",
    });
    const suggestions = (suggestionResult.output as { suggestions?: string[] }).suggestions ?? [];

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
   * Starts the Composio-hosted OAuth flow for connecting an Instagram
   * Business/Creator account (PRD §7.1). `COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID`
   * is created once in the Composio dashboard for the "instagram" toolkit —
   * see docs/DEPLOYMENT.md.
   */
  async getConnectUrl(callbackUrl: string): Promise<{ redirectUrl: string; connectionId: string }> {
    const client = getComposioClient();
    if (!client) throw new Error("Composio is not configured (COMPOSIO_API_KEY missing)");
    const authConfigId = process.env.COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID;
    if (!authConfigId) throw new Error("COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID is not configured");

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
