import type { GenerationRequest, GenerationResult } from "@/src/domain/entities/generation";

/**
 * Port for any LLM backend. V1 has one implementation (Gemini,
 * src/infrastructure/ai/gemini-provider.ts); this interface is what lets a
 * second provider be added later without touching application services
 * (PRD §8, Architecture §2.3).
 */
export interface AIProvider {
  readonly id: string;
  generate(request: GenerationRequest): Promise<GenerationResult>;
}
