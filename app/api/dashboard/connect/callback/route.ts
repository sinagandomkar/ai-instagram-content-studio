import { NextResponse, type NextRequest } from "next/server";
import { accountInsightsService } from "@/src/application/account-insights-service";
import { getPublicOrigin } from "@/lib/request-origin";

export async function GET(request: NextRequest) {
  const connectionId = request.cookies.get("composio_connection_id")?.value;
  const dashboardUrl = new URL("/", getPublicOrigin(request));

  if (!connectionId) {
    dashboardUrl.searchParams.set("connect_error", "missing_connection");
    return NextResponse.redirect(dashboardUrl);
  }

  try {
    await accountInsightsService.completeConnection(connectionId);
  } catch (error) {
    console.error("Composio connection completion failed:", error);
    dashboardUrl.searchParams.set("connect_error", "connection_failed");
    return NextResponse.redirect(dashboardUrl);
  }

  // NextResponse (not the raw Response.redirect() helper) — its .cookies API is
  // mutable; a plain Response from Response.redirect() has read-only headers, so
  // appending Set-Cookie onto it threw "TypeError: immutable" here in practice,
  // right after a real Instagram connection had just succeeded.
  const response = NextResponse.redirect(dashboardUrl);
  response.cookies.delete("composio_connection_id");
  return response;
}
