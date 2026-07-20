import type { NextRequest } from "next/server";
import { accountInsightsService } from "@/src/application/account-insights-service";
import { getPublicOrigin } from "@/lib/request-origin";

export async function GET(request: NextRequest) {
  const callbackUrl = new URL("/api/dashboard/connect/callback", getPublicOrigin(request)).toString();

  try {
    const { redirectUrl, connectionId } = await accountInsightsService.getConnectUrl(callbackUrl);
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
