import { z } from "zod";
import type { NextRequest } from "next/server";
import { reelActionService } from "@/src/application/reel-action-service";
import { storyGenerationService } from "@/src/application/story-generation-service";

const GENERATION_TASKS = [
  "script",
  "hook",
  "caption",
  "hashtags",
  "recording-tips",
  "cover-title",
  "keywords",
  "why-viral",
  "audience-analysis",
  "carousel",
] as const;

const saveToLibraryBody = z.object({ notes: z.string().optional() }).optional();

export async function POST(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string; action: string }> }
) {
  const { id, action } = await ctx.params;

  try {
    if (action === "save-to-library") {
      const body = saveToLibraryBody.parse(await _request.json().catch(() => undefined));
      const saved = await reelActionService.saveToLibrary(id, body?.notes);
      return Response.json({ saved });
    }

    if (action === "story-sequence") {
      const story = await storyGenerationService.generate(id);
      return Response.json({ story });
    }

    if (!(GENERATION_TASKS as readonly string[]).includes(action)) {
      return Response.json({ error: `Unknown reel action: ${action}` }, { status: 400 });
    }

    const generated = await reelActionService.run(id, action as (typeof GENERATION_TASKS)[number]);
    return Response.json({ generated });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Reel action failed" },
      { status: 400 }
    );
  }
}

export async function GET(_request: NextRequest, ctx: { params: Promise<{ id: string; action: string }> }) {
  const { id } = await ctx.params;
  const history = await reelActionService.history(id);
  return Response.json({ history });
}
