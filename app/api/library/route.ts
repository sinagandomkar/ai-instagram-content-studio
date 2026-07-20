import { prisma } from "@/lib/prisma";

/** PRD §6.3 "Save to Library" + UI §4.3 — saved reels plus everything generated for them. */
export async function GET() {
  const items = await prisma.savedLibraryItem.findMany({
    orderBy: { savedAt: "desc" },
    include: {
      reel: {
        include: {
          generatedContent: { orderBy: { createdAt: "desc" } },
          storySequences: { include: { frames: { orderBy: { order: "asc" } } } },
        },
      },
    },
  });
  return Response.json({ items });
}
