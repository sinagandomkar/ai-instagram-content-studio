import { z } from "zod";
import type { NextRequest } from "next/server";
import { discoveryService } from "@/src/application/discovery-service";

const bodySchema = z.object({
  url: z.string().url(),
  niche: z.string().min(1).max(100),
  creatorUsername: z.string().min(1).max(100),
  views: z.number().int().nonnegative().optional(),
  likes: z.number().int().nonnegative().optional(),
  comments: z.number().int().nonnegative().optional(),
});

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const reel = await discoveryService.importFromUrl(parsed.data);
  return Response.json({ reel });
}
