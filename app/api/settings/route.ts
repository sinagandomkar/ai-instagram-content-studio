import { z } from "zod";
import type { NextRequest } from "next/server";
import { settingsService } from "@/src/application/settings-service";

const patchSchema = z.object({
  researchModeEnabled: z.boolean().optional(),
  theme: z.enum(["system", "light", "dark"]).optional(),
});

export async function GET() {
  const settings = await settingsService.get();
  // The toggle still saves either way, but research mode can never actually run on
  // a serverless host (see BrowserAutomationProvider.isAvailable) — surfaced to the
  // UI so the setting doesn't look broken when it's really just inapplicable here.
  const researchModeSupported = !process.env.VERCEL;
  return Response.json({ settings, researchModeSupported });
}

export async function PATCH(request: NextRequest) {
  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.researchModeEnabled !== undefined) {
    await settingsService.setResearchMode(parsed.data.researchModeEnabled);
  }
  if (parsed.data.theme !== undefined) {
    await settingsService.setTheme(parsed.data.theme);
  }

  const settings = await settingsService.get();
  return Response.json({ settings });
}
