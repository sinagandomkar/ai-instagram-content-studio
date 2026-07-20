"use client";

import Image from "next/image";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ReelProvenanceBadge } from "@/components/reel-provenance-badge";
import { formatCompactNumber, formatDate } from "@/lib/format";
import type { DiscoveredReel } from "@/src/domain/entities/reel";

export function ReelCard({ reel, onClick }: { reel: DiscoveredReel; onClick: () => void }) {
  return (
    <Card
      className="cursor-pointer overflow-hidden py-0 transition-shadow hover:shadow-lg"
      onClick={onClick}
    >
      <div className="relative aspect-[9/16] w-full bg-muted">
        {reel.thumbnailUrl ? (
          <Image src={reel.thumbnailUrl} alt="" fill unoptimized className="object-cover" />
        ) : null}
        <div className="absolute top-2 right-2">
          <ReelProvenanceBadge source={reel.source} confidence={reel.confidence} />
        </div>
      </div>
      <CardContent className="px-3 pt-3">
        <div className="truncate text-sm font-medium">@{reel.creatorUsername}</div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {reel.views !== undefined && <span>{formatCompactNumber(reel.views)} بازدید</span>}
          {reel.likes !== undefined && <span>{formatCompactNumber(reel.likes)} لایک</span>}
          {reel.comments !== undefined && <span>{formatCompactNumber(reel.comments)} کامنت</span>}
        </div>
      </CardContent>
      <CardFooter className="px-3 pb-3 text-[11px] text-muted-foreground">
        {reel.publishDate ? formatDate(reel.publishDate) : "تاریخ نامشخص"}
      </CardFooter>
    </Card>
  );
}
