import { z } from "zod";
import type { NextRequest } from "next/server";
import { discoveryService } from "@/src/application/discovery-service";
import { settingsService } from "@/src/application/settings-service";

const bodySchema = z.object({
  niche: z.string().min(1).max(100),
  sort: z.enum(["most-viewed", "highest-engagement", "newest", "fastest-growing"]).default("most-viewed"),
  limit: z.number().int().positive().max(50).optional(),
});

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const settings = await settingsService.get();
  const result = await discoveryService.discover({
    niche: parsed.data.niche,
    sort: parsed.data.sort,
    limit: parsed.data.limit,
    allowResearchMode: settings.researchModeEnabled,
  });

  return Response.json(result);
}
