import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const reel = await prisma.reel.findUnique({
    where: { id },
    include: {
      generatedContent: { orderBy: { createdAt: "desc" } },
      storySequences: { include: { frames: { orderBy: { order: "asc" } } } },
      savedAs: true,
    },
  });

  if (!reel) return Response.json({ error: "Reel not found" }, { status: 404 });
  return Response.json({ reel });
}
