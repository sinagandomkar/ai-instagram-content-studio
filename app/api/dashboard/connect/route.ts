import type { NextRequest } from "next/server";
import { accountInsightsService } from "@/src/application/account-insights-service";
import { getPublicOrigin } from "@/lib/request-origin";

export async function GET(request: NextRequest) {
  const origin = getPublicOrigin(request);
  const callbackUrl = new URL("/api/dashboard/connect/callback", origin).toString();
  const dashboardUrl = new URL("/", origin).toString();

  try {
    const { redirectUrl, connectionId } = await accountInsightsService.getConnectUrl(
      dashboardUrl,
      callbackUrl
    );

    // No connectionId means getConnectUrl found and completed an existing Composio
    // connection directly (see account-insights-service.ts) — nothing to round-trip
    // through the callback route, so no cookie needed.
    if (!connectionId) {
      return Response.json({ redirectUrl });
    }

    return Response.json(
      { redirectUrl },
      {
        headers: {
          "Set-Cookie": `composio_connection_id=${connectionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`,
        },
      }
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to start Composio connection" },
      { status: 400 }
    );
  }
}
