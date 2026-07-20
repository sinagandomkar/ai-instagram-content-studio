"use client";

import useSWR from "swr";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { fetcher } from "@/lib/fetcher";
import { formatDate } from "@/lib/format";
import type {
  SavedLibraryItem,
  Reel,
  GeneratedContent,
  StorySequence,
  StoryFrame,
} from "@/lib/generated/prisma/client";

type LibraryItem = SavedLibraryItem & {
  reel: Reel & {
    generatedContent: GeneratedContent[];
    storySequences: (StorySequence & { frames: StoryFrame[] })[];
  };
};

const TYPE_LABELS: Record<string, string> = {
  script: "اسکریپت",
  hook: "هوک",
  caption: "کپشن",
  hashtags: "هشتگ",
  "why-viral": "چرا وایرال شد",
  "audience-analysis": "تحلیل مخاطب",
  carousel: "کروسل",
};

export default function LibraryPage() {
  const { data, isLoading } = useSWR<{ items: LibraryItem[] }>("/api/library", fetcher);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  const items = data?.items ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">کتابخانه</h1>
        <p className="text-sm text-muted-foreground">ریلزهای ذخیره‌شده و محتوای تولیدشده برای هرکدام.</p>
      </div>

      {items.length === 0 && (
        <p className="py-16 text-center text-sm text-muted-foreground">
          هنوز چیزی ذخیره نکرده‌ای. از موتور محتوای وایرال، روی «ذخیره در کتابخانه» بزن.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {items.map((item) => (
          <Card key={item.id}>
            <CardHeader className="flex flex-row items-center gap-3">
              {item.reel.thumbnailUrl && (
                <div className="relative size-14 overflow-hidden rounded-lg">
                  <Image src={item.reel.thumbnailUrl} alt="" fill unoptimized className="object-cover" />
                </div>
              )}
              <div>
                <CardTitle className="text-base">@{item.reel.creatorUsername}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {item.reel.niche} · ذخیره‌شده در {formatDate(item.savedAt.toString())}
                </p>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {item.reel.generatedContent.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {item.reel.generatedContent.map((gc) => (
                    <Badge key={gc.id} variant="secondary">
                      {TYPE_LABELS[gc.type] ?? gc.type}
                    </Badge>
                  ))}
                </div>
              )}

              {item.reel.storySequences.map((story) => (
                <div key={story.id} className="flex gap-2 overflow-x-auto pb-2">
                  {story.frames.map((frame) => (
                    <div key={frame.id} className="w-32 shrink-0 rounded-lg border p-2 text-xs">
                      <div className="font-medium">فریم {frame.order + 1}</div>
                      {frame.text && <div className="mt-1 line-clamp-4 text-muted-foreground">{frame.text}</div>}
                    </div>
                  ))}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
