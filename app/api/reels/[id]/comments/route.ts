import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { commentIntelligenceService } from "@/src/application/comment-intelligence-service";

export async function POST(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const insight = await commentIntelligenceService.analyze(id);
    return Response.json({ insight });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Comment analysis failed" },
      { status: 400 }
    );
  }
}

export async function GET(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const [comments, insight] = await Promise.all([
    prisma.comment.findMany({ where: { reelId: id } }),
    prisma.commentInsight.findUnique({ where: { reelId: id } }),
  ]);
  return Response.json({ comments, insight });
}
