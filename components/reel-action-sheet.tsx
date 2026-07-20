"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { poster } from "@/lib/fetcher";
import type { RankedReel } from "@/src/domain/entities/reel";

const ACTIONS: { key: string; label: string }[] = [
  { key: "script", label: "تولید اسکریپت مشابه" },
  { key: "hook", label: "هوک بهتر" },
  { key: "caption", label: "تولید کپشن" },
  { key: "hashtags", label: "تولید هشتگ" },
  { key: "story-sequence", label: "تولید سکانس استوری" },
  { key: "carousel", label: "تولید کروسل" },
  { key: "why-viral", label: "چرا وایرال شد؟" },
  { key: "audience-analysis", label: "تحلیل مخاطب" },
  { key: "save-to-library", label: "ذخیره در کتابخانه" },
];

interface ActionState {
  loading: boolean;
  error?: string;
  output?: unknown;
}

export function ReelActionSheet({
  reel,
  open,
  onOpenChange,
}: {
  reel: RankedReel | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, setState] = useState<Record<string, ActionState>>({});

  if (!reel) return null;

  async function run(actionKey: string) {
    setState((s) => ({ ...s, [actionKey]: { loading: true } }));
    try {
      const result = await poster<{ generated?: { content: string }; story?: unknown; saved?: unknown }>(
        `/api/reels/${reel!.id}/actions/${actionKey}`
      );
      const output = result.generated ? JSON.parse(result.generated.content) : result.story ?? result.saved;
      setState((s) => ({ ...s, [actionKey]: { loading: false, output } }));
      if (actionKey === "save-to-library") toast.success("در کتابخانه ذخیره شد");
    } catch (error) {
      const message = error instanceof Error ? error.message : "خطا در اجرای عملیات";
      setState((s) => ({ ...s, [actionKey]: { loading: false, error: message } }));
      toast.error(message);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full data-[side=right]:sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>@{reel.creatorUsername}</SheetTitle>
          <SheetDescription>حوزه: {reel.niche}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 pt-0">
          <div className="grid grid-cols-2 gap-2">
            {ACTIONS.map((action) => (
              <Button
                key={action.key}
                variant="outline"
                size="sm"
                disabled={state[action.key]?.loading}
                onClick={() => run(action.key)}
              >
                {action.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            {ACTIONS.map((action) => {
              const s = state[action.key];
              if (!s) return null;
              return (
                <Card key={action.key}>
                  <CardContent className="pt-4">
                    <div className="mb-2 text-sm font-medium">{action.label}</div>
                    {s.loading && <Skeleton className="h-16 w-full" />}
                    {s.error && <p className="text-sm text-destructive">{s.error}</p>}
                    {!s.loading && !s.error && s.output !== undefined && (
                      <ActionOutput output={s.output} />
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ActionOutput({ output }: { output: unknown }) {
  if (output === null || output === undefined) return null;

  if (typeof output === "object" && "savedAt" in (output as Record<string, unknown>)) {
    return <p className="text-sm text-muted-foreground">ذخیره شد.</p>;
  }

  if (typeof output === "object" && "frames" in (output as Record<string, unknown>)) {
    const frames = (output as { frames: { text?: string; visualIdea?: string; cta?: string }[] }).frames;
    return (
      <ol className="flex flex-col gap-2 text-sm">
        {frames.map((frame, i) => (
          <li key={i} className="rounded-md border p-2">
            <div className="font-medium">فریم {i + 1}</div>
            {frame.text && <div>{frame.text}</div>}
            {frame.visualIdea && <div className="text-muted-foreground">ایده‌ی تصویری: {frame.visualIdea}</div>}
            {frame.cta && <div className="text-muted-foreground">CTA: {frame.cta}</div>}
          </li>
        ))}
      </ol>
    );
  }

  return (
    <pre dir="rtl" className="whitespace-pre-wrap break-words text-sm">
      {JSON.stringify(output, null, 2)}
    </pre>
  );
}
