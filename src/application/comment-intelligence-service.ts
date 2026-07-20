import { prisma } from "@/lib/prisma";
import { aiProvider } from "@/src/infrastructure/ai";
import { composioProvider } from "@/src/infrastructure/providers";

interface SentimentSplit {
  positive: number;
  negative: number;
  neutral: number;
}

/**
 * PRD §6.6. For a Reel that came from the user's own connected account
 * (source === "composio"), comments are pulled live; otherwise it relies on
 * whatever `Comment` rows already exist for that Reel (imported/manual —
 * PRD §6.6's honest limit for other people's content).
 */
export class CommentIntelligenceService {
  async analyze(reelId: string) {
    const reel = await prisma.reel.findUniqueOrThrow({ where: { id: reelId } });

    if (reel.source === "composio") {
      const account = await prisma.account.findFirst();
      if (account && (await composioProvider.isAvailable())) {
        const result = await composioProvider.getAccountComments!(account.id, reel.externalId);
        for (const comment of result.data) {
          await prisma.comment.upsert({
            where: { id: comment.externalId },
            create: {
              id: comment.externalId,
              reelId,
              authorUsername: comment.authorUsername,
              text: comment.text,
              source: "composio",
            },
            update: { text: comment.text },
          });
        }
      }
    }

    const comments = await prisma.comment.findMany({ where: { reelId } });
    if (comments.length === 0) {
      throw new Error("No comments available for this reel yet — import some or connect the account.");
    }

    const result = await aiProvider.generate({
      task: "comment-insights",
      context: { commentTexts: comments.map((c) => c.text) },
      language: "fa",
    });

    const output = result.output as {
      painPoints?: string[];
      repeatedQuestions?: string[];
      desiredTopics?: string[];
      sentimentSplit?: SentimentSplit;
    };

    return prisma.commentInsight.upsert({
      where: { reelId },
      create: {
        reelId,
        painPoints: JSON.stringify(output.painPoints ?? []),
        repeatedQuestions: JSON.stringify(output.repeatedQuestions ?? []),
        desiredTopics: JSON.stringify(output.desiredTopics ?? []),
        sentimentSplit: JSON.stringify(output.sentimentSplit ?? { positive: 0, negative: 0, neutral: 0 }),
      },
      update: {
        painPoints: JSON.stringify(output.painPoints ?? []),
        repeatedQuestions: JSON.stringify(output.repeatedQuestions ?? []),
        desiredTopics: JSON.stringify(output.desiredTopics ?? []),
        sentimentSplit: JSON.stringify(output.sentimentSplit ?? { positive: 0, negative: 0, neutral: 0 }),
        generatedAt: new Date(),
      },
    });
  }
}

export const commentIntelligenceService = new CommentIntelligenceService();
