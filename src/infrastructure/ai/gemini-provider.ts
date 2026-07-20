import { GoogleGenAI } from "@google/genai";
import type { AIProvider } from "@/src/domain/ports/ai-provider";
import type { GenerationRequest, GenerationResult } from "@/src/domain/entities/generation";
import { buildGenerationPrompt, PROMPT_VERSION } from "./prompts";

/** Free-tier-friendly default; swappable per request if a task ever needs the heavier model. */
const DEFAULT_MODEL = "gemini-2.5-flash";

let client: GoogleGenAI | undefined;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
  if (!client) client = new GoogleGenAI({ apiKey });
  return client;
}

/** V1's sole AIProvider implementation (PRD §8) — swapping in a second provider later is an addition, not a rewrite, of this file. */
export class GeminiProvider implements AIProvider {
  readonly id = "gemini";

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    const { systemInstruction, prompt, responseSchema } = buildGenerationPrompt(
      request.task,
      request.context
    );

    const response = await getClient().models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.8,
      },
    });

    const raw = response.text ?? "{}";
    let output: unknown;
    try {
      output = JSON.parse(raw);
    } catch {
      output = { raw };
    }

    return { task: request.task, output, promptVersion: PROMPT_VERSION, raw };
  }
}
