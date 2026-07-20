import type { NextRequest } from "next/server";
import { accountInsightsService } from "@/src/application/account-insights-service";

export async function GET(request: NextRequest) {
  const connectionId = request.cookies.get("composio_connection_id")?.value;
  const dashboardUrl = new URL("/", request.nextUrl.origin);

  if (!connectionId) {
    dashboardUrl.searchParams.set("connect_error", "missing_connection");
    return Response.redirect(dashboardUrl);
  }

  try {
    await accountInsightsService.completeConnection(connectionId);
  } catch {
    dashboardUrl.searchParams.set("connect_error", "connection_failed");
    return Response.redirect(dashboardUrl);
  }

  const response = Response.redirect(dashboardUrl);
  response.headers.append("Set-Cookie", "composio_connection_id=; Path=/; HttpOnly; Max-Age=0");
  return response;
}
