import { prisma } from "@/lib/prisma";
import type { PostingEvent } from "@/src/domain/entities/account-insights";
import { aiProvider } from "@/src/infrastructure/ai";
import { composioProvider } from "@/src/infrastructure/providers";

const WEEKDAYS_FA = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"];

function summarizePostingHistory(events: PostingEvent[]): string {
  if (events.length === 0) return "بدون سابقه‌ی انتشار.";

  const byWeekday = new Map<string, { count: number; engagement: number }>();
  for (const event of events) {
    const day = WEEKDAYS_FA[new Date(event.publishedAt).getDay()];
    const entry = byWeekday.get(day) ?? { count: 0, engagement: 0 };
    entry.count += 1;
    entry.engagement += event.likes + event.comments;
    byWeekday.set(day, entry);
  }

  return Array.from(byWeekday.entries())
    .map(([day, { count, engagement }]) => `${day}: ${count} پست، مجموع تعامل ${engagement}`)
    .join("\n");
}

/** PRD §6.7 — recommendations are grounded in the connected account's own posting history, via Composio (own-account-posting-history capability). */
export class PostingRecommendationService {
  async generate() {
    const account = await prisma.account.findFirstOrThrow();
    const historyResult = await composioProvider.getPostingHistory!(account.id);
    const summary = summarizePostingHistory(historyResult.data);

    const result = await aiProvider.generate({
      task: "posting-recommendations",
      context: { postingHistorySummary: summary },
      language: "fa",
    });

    const output = result.output as {
      bestDays?: string[];
      bestHours?: string[];
      frequency?: string;
      reasoning?: string;
    };

    return prisma.postingRecommendation.create({
      data: {
        accountId: account.id,
        bestDays: JSON.stringify(output.bestDays ?? []),
        bestHours: JSON.stringify(output.bestHours ?? []),
        frequency: output.frequency ?? "",
        reasoning: output.reasoning ?? "",
      },
    });
  }
}

export const postingRecommendationService = new PostingRecommendationService();
