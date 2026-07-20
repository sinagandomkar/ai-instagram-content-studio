"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { fetcher } from "@/lib/fetcher";
import type { Settings } from "@/lib/generated/prisma/client";

export default function SettingsPage() {
  const { data, mutate } = useSWR<{ settings: Settings }>("/api/settings", fetcher);

  async function toggleResearchMode(enabled: boolean) {
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ researchModeEnabled: enabled }),
    });
    mutate();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">تنظیمات</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>حالت پژوهشی</CardTitle>
          <CardDescription>
            وقتی روشن است، برای کشف ریلزهای یک حوزه، از یک نشست مرورگر شخصی و محدودشده (حداکثر چند بار در
            دقیقه) برای دیدن صفحات عمومی اینستاگرام استفاده می‌شود. این کار خلاف شرایط استفاده‌ی اینستاگرام
            است و ممکن است با ریسک محدودیت حساب همراه باشد — فقط برای پژوهش شخصی و کم‌حجم روشنش کن، نه برای
            استخراج انبوه داده.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <Switch
            id="research-mode"
            checked={data?.settings.researchModeEnabled ?? false}
            onCheckedChange={toggleResearchMode}
          />
          <Label htmlFor="research-mode">روشن کردن حالت پژوهشی</Label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>هوش مصنوعی</CardTitle>
          <CardDescription>مدل فعلی: Gemini (رایگان، نسخه‌ی یک)</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
