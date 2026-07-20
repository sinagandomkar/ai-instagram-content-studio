import { describe, expect, it } from "vitest";
import { buildGenerationPrompt, PROMPT_VERSION } from "./index";
import type { GenerationTask } from "@/src/domain/entities/generation";

const ALL_TASKS: GenerationTask[] = [
  "script",
  "hook",
  "caption",
  "hashtags",
  "recording-tips",
  "cover-title",
  "keywords",
  "why-viral",
  "audience-analysis",
  "story-sequence",
  "carousel",
  "comment-insights",
  "posting-recommendations",
  "account-suggestions",
];

describe("buildGenerationPrompt", () => {
  it("returns a Persian system instruction and a schema for every task", () => {
    for (const task of ALL_TASKS) {
      const spec = buildGenerationPrompt(task, {});
      expect(spec.systemInstruction).toMatch(/Persian/i);
      expect(spec.prompt.length).toBeGreaterThan(0);
      expect(spec.responseSchema).toHaveProperty("type", "object");
    }
  });

  it("still produces a valid prompt with no context supplied", () => {
    const spec = buildGenerationPrompt("caption", {});
    expect(spec.prompt).toContain("زمینه‌ی خاصی ارائه نشده");
  });

  it("folds every supplied context field into the prompt", () => {
    const spec = buildGenerationPrompt("script", {
      niche: "فیتنس",
      creatorUsername: "sample_creator",
      views: 12000,
    });
    expect(spec.prompt).toContain("فیتنس");
    expect(spec.prompt).toContain("sample_creator");
    expect(spec.prompt).toContain("12000");
  });

  it("PROMPT_VERSION is a non-empty stamp used for provenance on GeneratedContent rows", () => {
    expect(PROMPT_VERSION.length).toBeGreaterThan(0);
  });
});
