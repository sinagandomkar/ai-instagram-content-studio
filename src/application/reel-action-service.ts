import { prisma } from "@/lib/prisma";
import type { GenerationTask } from "@/src/domain/entities/generation";
import { aiProvider } from "@/src/infrastructure/ai";

/**
 * Every generation-based Reel Action (PRD §6.3) except Story Generator
 * (see story-generation-service.ts, which needs its own persistence shape).
 * "Save to Library" is here too since it's a Reel Action but not a
 * generation call.
 */
export class ReelActionService {
  async run(reelId: string, task: GenerationTask) {
    const reel = await prisma.reel.findUniqueOrThrow({ where: { id: reelId } });

    const result = await aiProvider.generate({
      task,
      context: {
        niche: reel.niche,
        creatorUsername: reel.creatorUsername,
        caption: reel.transcript ?? undefined,
        transcript: reel.transcript ?? undefined,
        views: reel.views ?? undefined,
        likes: reel.likes ?? undefined,
        comments: reel.comments ?? undefined,
      },
      language: "fa",
    });

    const saved = await prisma.generatedContent.create({
      data: {
        reelId,
        type: task,
        content: JSON.stringify(result.output),
        promptVersion: result.promptVersion,
      },
    });

    return saved;
  }

  async history(reelId: string) {
    return prisma.generatedContent.findMany({ where: { reelId }, orderBy: { createdAt: "desc" } });
  }

  async saveToLibrary(reelId: string, notes?: string) {
    return prisma.savedLibraryItem.upsert({
      where: { reelId },
      create: { reelId, notes },
      update: { notes },
    });
  }
}

export const reelActionService = new ReelActionService();
