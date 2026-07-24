"use client";

import { useState } from "react";
import useSWR from "swr";
import Image from "next/image";
import { toast } from "sonner";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { fetcher } from "@/lib/fetcher";
import { formatCompactNumber, formatPercent, formatDate } from "@/lib/format";
import type { DashboardSnapshot, GrowthPoint } from "@/src/application/account-insights-service";

const chartConfig = {
  followers: { label: "دنبال‌کننده", color: "var(--chart-1)" },
} satisfies ChartConfig;

const RANGE_OPTIONS = [
  { days: 30, label: "۱ ماه اخیر" },
  { days: 90, label: "۳ ماه اخیر" },
  { days: 180, label: "۶ ماه اخیر" },
  { days: 365, label: "یک‌ساله" },
  { days: 729, label: "دو ساله" },
];

export default function DashboardPage() {
  const { data, isLoading } = useSWR<DashboardSnapshot>("/api/dashboard", fetcher);

  if (isLoading) return <DashboardSkeleton />;

  if (!data?.connected) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
        <h1 className="text-xl font-semibold">حساب اینستاگرام متصل نیست</h1>
        <p className="text-sm text-muted-foreground">
          برای دیدن آمار رشد، تعامل و پیشنهادهای هوش مصنوعی، حساب بیزینسی یا کریتور اینستاگرامت را وصل کن.
        </p>
        <Button
          onClick={async () => {
            const res = await fetch("/api/dashboard/connect");
            const json = await res.json();
            if (json.redirectUrl) {
              window.location.href = json.redirectUrl;
            } else {
              toast.error(json.error ?? "اتصال به Composio تنظیم نشده — در تنظیمات .env کلیدها را وارد کن.");
            }
          }}
        >
          اتصال حساب اینستاگرام
        </Button>
      </div>
    );
  }

  const { insights, growthHistory, suggestions } = data;
  if (!insights) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Avatar className="size-12">
          <AvatarImage src={insights.profilePictureUrl} />
          <AvatarFallback>{insights.username.slice(0, 2)}</AvatarFallback>
        </Avatar>
        <div>
          <div className="font-semibold">{insights.displayName ?? insights.username}</div>
          <div className="text-sm text-muted-foreground">@{insights.username}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="دنبال‌کننده" value={formatCompactNumber(insights.followers)} />
        <StatCard label="نرخ تعامل" value={formatPercent(insights.engagementRate)} />
        <StatCard label="تعداد پست" value={formatCompactNumber(insights.postsCount)} />
      </div>

      <GrowthChart initialData={growthHistory} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ContentGrid title="پربازدیدترین پست‌ها" items={insights.topPosts} />
        <ContentGrid title="پربازدیدترین ریلزها" items={insights.topReels} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>پیشنهادهای بهبود</CardTitle>
        </CardHeader>
        <CardContent>
          {suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">فعلاً پیشنهادی موجود نیست.</p>
          ) : (
            <ul className="list-disc space-y-2 pr-5 text-sm">
              {suggestions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function GrowthChart({ initialData }: { initialData: GrowthPoint[] }) {
  const [days, setDays] = useState(30);
  // The dashboard fetch already computed the 30-day range — reuse it as SWR's
  // fallback so picking the default range doesn't trigger a visible reload.
  const { data, isLoading } = useSWR<{ growthHistory: GrowthPoint[] }>(
    `/api/dashboard/growth?days=${days}`,
    fetcher,
    { fallbackData: days === 30 ? { growthHistory: initialData } : undefined }
  );
  const growthHistory = data?.growthHistory ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>روند رشد دنبال‌کننده‌ها</CardTitle>
          <CardDescription>داده‌ی واقعی اینستاگرام، تا ۲ سال قابل‌دریافت است</CardDescription>
        </div>
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGE_OPTIONS.map((opt) => (
              <SelectItem key={opt.days} value={String(opt.days)}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : growthHistory.length < 2 ? (
          <p className="text-sm text-muted-foreground">داده‌ی کافی برای این بازه موجود نیست.</p>
        ) : (
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <LineChart data={growthHistory}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="capturedAt" tickFormatter={(v) => formatDate(v)} tickLine={false} axisLine={false} />
              {/* Without an explicit domain, Recharts defaults the Y-axis to start at 0 —
                  for a metric like followers, where the day-to-day change is tiny relative
                  to the absolute value, that renders as a flat line pinned near the top.
                  Zooming to the actual data range is what makes the trend visible. */}
              <YAxis
                tickLine={false}
                axisLine={false}
                width={48}
                domain={["dataMin", "dataMax"]}
                tickFormatter={(v) => formatCompactNumber(v)}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="followers" stroke="var(--color-followers)" strokeWidth={2} dot={false} />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-2xl font-semibold">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

function ContentGrid({
  title,
  items,
}: {
  title: string;
  items: { externalId: string; thumbnailUrl?: string; likes: number; comments: number }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-2">
        {items.length === 0 && <p className="col-span-3 text-sm text-muted-foreground">داده‌ای موجود نیست</p>}
        {items.slice(0, 6).map((item) => (
          <div key={item.externalId} className="overflow-hidden rounded-lg border">
            {item.thumbnailUrl ? (
              <Image src={item.thumbnailUrl} alt="" width={120} height={120} className="aspect-square w-full object-cover" unoptimized />
            ) : (
              <div className="aspect-square w-full bg-muted" />
            )}
            <div className="p-1.5 text-[11px] text-muted-foreground">
              {formatCompactNumber(item.likes)} لایک · {formatCompactNumber(item.comments)} کامنت
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-12 w-64" />
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
