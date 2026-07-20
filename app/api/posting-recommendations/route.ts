import { prisma } from "@/lib/prisma";
import { postingRecommendationService } from "@/src/application/posting-recommendation-service";

export async function POST() {
  try {
    const recommendation = await postingRecommendationService.generate();
    return Response.json({ recommendation });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not generate recommendations" },
      { status: 400 }
    );
  }
}

export async function GET() {
  const latest = await prisma.postingRecommendation.findFirst({ orderBy: { generatedAt: "desc" } });
  return Response.json({ recommendation: latest });
}
