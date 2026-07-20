import { GoogleGenAI } from "@google/genai";
import type { AIProvider } from "@/src/domain/ports/ai-provider";
import type { GenerationRequest, GenerationResult } from "@/src/domain/entities/generation";
import { buildGenerationPrompt, PROMPT_VERSION } from "./prompts";

// "gemini-2.5-flash" is still listed by the models.list endpoint but returns a 404
// ("no longer available to new users") on generateContent for keys created after
// Google's cutover — found live, with a real key, while testing this build. The
// "-latest" alias avoids re-hardcoding a model name that can be deprecated later;
// Google keeps it pointed at their current recommended flash model.
const DEFAULT_MODEL = "gemini-flash-latest";

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
        // Fails fast instead of hanging the whole request — hit Gemini's real
        // "high demand" 503s taking ~30s to eventually resolve while testing this.
        httpOptions: { timeout: 15_000 },
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
