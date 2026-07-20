import { prisma } from "@/lib/prisma";
import { aiProvider } from "@/src/infrastructure/ai";

interface StoryFrameOutput {
  text?: string;
  visualIdea?: string;
  poll?: { question?: string; options?: string[] };
  questionBox?: string;
  cta?: string;
  sticker?: string;
}

/** PRD §6.5 — persisted as parent + ordered children so one frame can be edited without touching the rest (docs/DATABASE.md). */
export class StoryGenerationService {
  async generate(reelId: string) {
    const reel = await prisma.reel.findUniqueOrThrow({ where: { id: reelId } });

    const result = await aiProvider.generate({
      task: "story-sequence",
      context: {
        niche: reel.niche,
        creatorUsername: reel.creatorUsername,
        caption: reel.transcript ?? undefined,
        transcript: reel.transcript ?? undefined,
      },
      language: "fa",
    });

    const frames = (result.output as { frames?: StoryFrameOutput[] }).frames ?? [];

    return prisma.storySequence.create({
      data: {
        reelId,
        frames: {
          create: frames.map((frame, index) => ({
            order: index,
            text: frame.text,
            visualIdea: frame.visualIdea,
            poll: frame.poll ? JSON.stringify(frame.poll) : undefined,
            questionBox: frame.questionBox,
            cta: frame.cta,
            sticker: frame.sticker,
          })),
        },
      },
      include: { frames: { orderBy: { order: "asc" } } },
    });
  }
}

export const storyGenerationService = new StoryGenerationService();
