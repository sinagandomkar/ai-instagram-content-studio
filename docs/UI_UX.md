# UI/UX Design — AI Instagram Content Studio

**Direction:** Apple/iOS-inspired, minimal, premium, glass where it earns its place, dark + light, RTL Persian throughout (PRD §10).

---

## 1. Language & Direction

- `<html lang="fa" dir="rtl">` at the root — the entire app is RTL, not just text blocks.
- Font: **Vazirmatn** (open-source, designed for Persian UI, has a full weight range and pairs cleanly with iOS-style type scales) loaded as the primary variable font; numerals rendered as Persian digits (۰-۹) throughout — charts, stats, dates — matching the Persian-writing convention already established for this project.
- No inline Latin/English strings in UI copy. Code identifiers, of course, stay English (PRD Language rule) — this is a UI-copy rule only.
- Icons and card layouts mirror correctly for RTL (chevrons, progress bars, chart axis order) — verified per-component, not assumed from a library default.

## 2. Design System

- **Base:** Tailwind CSS + shadcn/ui, themed rather than restyled — shadcn's primitives (Card, Dialog, Tabs, Sheet, Command, Badge, Skeleton) cover nearly every surface this product needs.
- **Color:** a small neutral-first palette (per the dataviz/design convention of this workspace) — one accent color for primary actions, semantic colors reserved for state (success/warning/destructive/info), never used decoratively. Dark and light are both first-class, not light-with-an-inverted-filter.
- **Elevation & glass:** glassmorphism (`backdrop-blur` + translucent surface) reserved for floating/overlay surfaces — the reel-action sheet, command palette, top nav — never for base page background or dense data tables, where it would hurt legibility.
- **Motion:** short (150–250ms), physically-plausible easing for state changes (card expand, sheet open, tab switch); no animation on data that updates in place (chart redraw, list refresh) beyond a subtle fade, to avoid feeling flickery on every refresh.
- **Charts:** line charts for growth/trend, bar for comparative post/reel performance, heatmap for posting-time consistency — consistent categorical/sequential palette, RTL-aware axis ordering (see Architecture note: chart component wraps a library like Recharts with an RTL-safe config, not raw defaults).

## 3. Navigation Structure

```
┌─ Top bar: logo · account switcher (V2+) · theme toggle
├─ Right-hand primary nav (RTL: nav rail sits on the right)
│   ├─ داشبورد (Dashboard)
│   ├─ موتور محتوای وایرال (Viral Content Engine)
│   ├─ کتابخانه (Library — saved reels + generated content)
│   ├─ تنظیمات (Settings — account connection, research-mode toggle)
```

Single-user V1: no workspace/team switcher. Structure leaves room for one without a rebuild (nav rail becomes scrollable list of workspaces in V2).

## 4. Key Screens

### 4.1 Dashboard (`/`)
- Header: connected account identity (avatar, username) or a "اتصال حساب اینستاگرام" (Connect Instagram Account) CTA if none connected — this is the Composio OAuth entry point.
- Stat cards row: followers, engagement rate, posting consistency score — each with a small trend sparkline.
- Growth chart (line, time range selector: ۷ روز / ۳۰ روز / ۹۰ روز).
- Two-column: top posts / top reels (card grid, thumbnail + key metric).
- Comment insights summary card (pain points / repeated questions, condensed — links to full Comment Intelligence view).
- Suggested improvements list (AI-generated, each item expandable for reasoning).
- Empty/disconnected state is a real designed state, not a blank page — explains what connecting unlocks.

### 4.2 Viral Content Engine (`/discovery`)
- Prominent niche input (combobox with recent/suggested niches) + sort control (Most Viewed / Highest Engagement / Newest / Fastest Growing).
- Reel grid: cards show thumbnail (video preview on hover/tap), creator, views, likes, comments, publish date, estimated engagement, and a **provenance badge** (`وارد‌شده` / `کتابخانه` / `حالت پژوهشی` / `تایید‌شده`) — always visible, never hidden behind a tooltip, per PRD §5's provenance requirement.
- Empty state when no provider has data: explicit message + shortcuts to "Import a Reel" or "Enable research mode" rather than a bare empty grid.
- Clicking a card opens the **Reel Action Sheet** (glass side sheet): all nine actions (§PRD 6.3) as a button group, each opening an editable, regenerate-able result panel below it. Multiple actions can be run and reviewed in the same sheet without closing it.

### 4.3 Library (`/library`)
- Saved reels + all generated content, filterable by type (script/caption/hashtags/story/carousel) and by source Reel.
- Story sequences render as a horizontal frame-by-frame strip (mirroring how Instagram Stories are actually consumed), each frame editable individually.

### 4.4 Settings (`/settings`)
- Instagram account connection status (via Composio) — connect/disconnect.
- Research-mode toggle (off by default) with the plain-language legal disclaimer from PRD §5 shown inline, not buried in a modal.
- Theme (system/light/dark), AI provider info (Gemini, V1 fixed).

## 5. Responsive Behavior

- Nav rail collapses to a bottom tab bar (iOS-style) under the `md` breakpoint.
- Reel grid: 1 col mobile → 2 col tablet → 3–4 col desktop.
- Reel Action Sheet becomes a full-screen sheet on mobile instead of a side panel.

## 6. Accessibility

- All interactive elements keyboard-reachable; focus rings visible in both themes (not suppressed for aesthetics).
- Color is never the only signal for sentiment/state — icon or label always paired with color-coded badges (e.g. sentiment split uses icon + label, not color alone).
- Charts include a text/table fallback for screen readers (data table toggle on each chart card).
