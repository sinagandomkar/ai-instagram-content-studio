import type { NextRequest } from "next/server";
import { accountInsightsService } from "@/src/application/account-insights-service";

/** Separate from /api/dashboard so changing the chart's time range doesn't re-run the full dashboard fetch (incl. the Gemini suggestions call). */
export async function GET(request: NextRequest) {
  const daysParam = request.nextUrl.searchParams.get("days");
  const days = Math.min(Math.max(Number(daysParam) || 30, 1), 729);

  try {
    const growthHistory = await accountInsightsService.getGrowthHistory(days);
    return Response.json({ growthHistory });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to load growth history" },
      { status: 400 }
    );
  }
}
