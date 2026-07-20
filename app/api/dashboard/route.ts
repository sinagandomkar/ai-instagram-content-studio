import { accountInsightsService } from "@/src/application/account-insights-service";

export async function GET() {
  const dashboard = await accountInsightsService.getDashboard();
  return Response.json(dashboard);
}
