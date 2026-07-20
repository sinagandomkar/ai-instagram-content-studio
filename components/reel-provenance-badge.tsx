import { Badge } from "@/components/ui/badge";

const LABELS: Record<string, string> = {
  composio: "تایید‌شده",
  "curated-library": "کتابخانه",
  "user-imported": "وارد‌شده",
  "browser-automation": "حالت پژوهشی",
  "commercial-provider": "منبع تجاری",
};

/** Always visible on every Reel card — PRD §5's provenance requirement, never hidden behind a tooltip (docs/UI_UX.md §4.2). */
export function ReelProvenanceBadge({ source, confidence }: { source: string; confidence: string }) {
  return (
    <Badge variant={confidence === "verified" ? "default" : "secondary"}>
      {LABELS[source] ?? source}
    </Badge>
  );
}
