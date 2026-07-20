"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ReelCard } from "@/components/reel-card";
import { ReelActionSheet } from "@/components/reel-action-sheet";
import { ImportReelDialog } from "@/components/import-reel-dialog";
import { poster } from "@/lib/fetcher";
import type { RankedReel, ReelSortOption } from "@/src/domain/entities/reel";

const SORT_OPTIONS: { value: ReelSortOption; label: string }[] = [
  { value: "most-viewed", label: "پربازدیدترین" },
  { value: "highest-engagement", label: "بیشترین تعامل" },
  { value: "newest", label: "جدیدترین" },
  { value: "fastest-growing", label: "سریع‌الرشدترین" },
];

export default function DiscoveryPage() {
  const [niche, setNiche] = useState("");
  const [sort, setSort] = useState<ReelSortOption>("most-viewed");
  const [reels, setReels] = useState<RankedReel[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [noProvider, setNoProvider] = useState(false);
  const [selectedReel, setSelectedReel] = useState<RankedReel | null>(null);

  async function search() {
    if (!niche.trim()) return;
    setLoading(true);
    setNoProvider(false);
    try {
      const result = await poster<{ reels: RankedReel[]; reason?: string }>("/api/discovery", {
        niche,
        sort,
      });
      setReels(result.reels);
      setNoProvider(result.reason === "no-provider-available");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">موتور محتوای وایرال</h1>
        <p className="text-sm text-muted-foreground">
          یک حوزه وارد کن تا بهترین ریلزهای آن حوزه را پیدا کنیم.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="مثلاً: هوش مصنوعی، فیتنس، املاک..."
            className="pe-9"
          />
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as ReelSortOption)}>
          <SelectTrigger className="sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={search} disabled={loading || !niche.trim()}>
          جستجو
        </Button>
        {niche.trim() && <ImportReelDialog niche={niche} onImported={search} />}
      </div>

      {loading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[9/16] w-full" />
          ))}
        </div>
      )}

      {!loading && reels !== null && reels.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <p className="font-medium">
            {noProvider
              ? "هیچ منبعی برای این حوزه در دسترس نیست."
              : "چیزی برای این حوزه پیدا نشد."}
          </p>
          <p className="max-w-md text-sm text-muted-foreground">
            یک ریلز را با لینک وارد کن، یا در تنظیمات «حالت پژوهشی» را روشن کن تا جستجوی زنده هم فعال شود.
          </p>
        </div>
      )}

      {!loading && reels && reels.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {reels.map((reel) => (
            <ReelCard key={reel.id} reel={reel} onClick={() => setSelectedReel(reel)} />
          ))}
        </div>
      )}

      <ReelActionSheet
        reel={selectedReel}
        open={!!selectedReel}
        onOpenChange={(open) => !open && setSelectedReel(null)}
      />
    </div>
  );
}
