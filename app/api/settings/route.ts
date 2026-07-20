import { z } from "zod";
import type { NextRequest } from "next/server";
import { settingsService } from "@/src/application/settings-service";

const patchSchema = z.object({
  researchModeEnabled: z.boolean().optional(),
  theme: z.enum(["system", "light", "dark"]).optional(),
});

export async function GET() {
  const settings = await settingsService.get();
  return Response.json({ settings });
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
