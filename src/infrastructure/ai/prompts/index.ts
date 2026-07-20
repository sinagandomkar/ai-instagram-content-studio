import type { GenerationTask, ReelContext } from "@/src/domain/entities/generation";

/** Bumped whenever a prompt's wording or schema changes meaningfully — stored on every GeneratedContent row (docs/DATABASE.md). */
export const PROMPT_VERSION = "2026-07-19.1";

export interface PromptSpec {
  systemInstruction: string;
  prompt: string;
  /** JSON Schema (subset Gemini supports) describing the required output shape. */
  responseSchema: Record<string, unknown>;
}

const BASE_SYSTEM =
  "You are a senior Persian-language Instagram content strategist working inside AI Instagram Content Studio. " +
  "Always answer in fluent, natural Persian (Farsi), written for an Iranian Instagram audience. " +
  "Never mix in English words except for irreplaceable brand/technical terms. Be concrete and specific to the " +
  "supplied context — never generic filler that could apply to any niche.";

function contextBlock(context: ReelContext): string {
  const lines = [
    context.niche && `حوزه: ${context.niche}`,
    context.creatorUsername && `سازنده: ${context.creatorUsername}`,
    context.caption && `کپشن اصلی: ${context.caption}`,
    context.transcript && `متن گفته‌شده در ویدیو: ${context.transcript}`,
    typeof context.views === "number" && `بازدید: ${context.views}`,
    typeof context.likes === "number" && `لایک: ${context.likes}`,
    typeof context.comments === "number" && `کامنت: ${context.comments}`,
    context.notes && `یادداشت اضافه از کاربر: ${context.notes}`,
    context.commentTexts?.length && `کامنت‌ها:\n${context.commentTexts.map((c) => `- ${c}`).join("\n")}`,
    context.postingHistorySummary && `تاریخچه‌ی انتشار: ${context.postingHistorySummary}`,
    context.accountSummary && `خلاصه‌ی عملکرد حساب: ${context.accountSummary}`,
  ].filter(Boolean);
  return lines.length ? lines.join("\n") : "زمینه‌ی خاصی ارائه نشده — بر اساس بهترین شیوه‌های عمومی عمل کن.";
}

const stringSchema = { type: "string" };
const stringArraySchema = { type: "array", items: stringSchema };

export function buildGenerationPrompt(task: GenerationTask, context: ReelContext): PromptSpec {
  const ctx = contextBlock(context);

  switch (task) {
    case "script":
      return {
        systemInstruction: BASE_SYSTEM,
        prompt: `با الهام از این ریلز، یک اسکریپت کامل و اجرایی برای ریلز جدید (نه کپی، نسخه‌ی بهتر و بومی‌شده) بنویس.\n${ctx}`,
        responseSchema: {
          type: "object",
          properties: {
            hook: stringSchema,
            body: stringArraySchema,
            cta: stringSchema,
            estimatedDurationSeconds: { type: "integer" },
          },
          required: ["hook", "body", "cta"],
        },
      };

    case "hook":
      return {
        systemInstruction: BASE_SYSTEM,
        prompt: `سه هوک (۳ ثانیه‌ی اول) قوی‌تر از این ریلز پیشنهاد بده که مخاطب را از اسکرول رد شدن منصرف کند.\n${ctx}`,
        responseSchema: { type: "object", properties: { hooks: stringArraySchema }, required: ["hooks"] },
      };

    case "caption":
      return {
        systemInstruction: BASE_SYSTEM,
        prompt: `یک کپشن فارسی جذاب برای این محتوا بنویس؛ شامل جمله‌ی اول قلاب‌دار، بدنه‌ی کوتاه و یک CTA واضح.\n${ctx}`,
        responseSchema: { type: "object", properties: { caption: stringSchema }, required: ["caption"] },
      };

    case "hashtags":
      return {
        systemInstruction: BASE_SYSTEM,
        prompt: `۱۵ تا ۲۰ هشتگ فارسی و انگلیسی مرتبط (ترکیبی از پرجست‌وجو و نیش خاص) برای این محتوا پیشنهاد بده.\n${ctx}`,
        responseSchema: { type: "object", properties: { hashtags: stringArraySchema }, required: ["hashtags"] },
      };

    case "recording-tips":
      return {
        systemInstruction: BASE_SYSTEM,
        prompt: `نکات عملی فیلم‌برداری (کادر، نور، حرکت دوربین، لوکیشن) برای بازسازی این نوع ریلز را فهرست کن.\n${ctx}`,
        responseSchema: { type: "object", properties: { tips: stringArraySchema }, required: ["tips"] },
      };

    case "cover-title":
      return {
        systemInstruction: BASE_SYSTEM,
        prompt: `سه گزینه برای عنوان کاور ریلز (متنی که روی تامبنیل نوشته می‌شود، کوتاه و پرکنجکاوی) پیشنهاد بده.\n${ctx}`,
        responseSchema: { type: "object", properties: { titles: stringArraySchema }, required: ["titles"] },
      };

    case "keywords":
      return {
        systemInstruction: BASE_SYSTEM,
        prompt: `کلمات کلیدی سئوی داخل‌اپلیکیشنی اینستاگرام (برای جست‌وجو و alt text) مرتبط با این محتوا را فهرست کن.\n${ctx}`,
        responseSchema: { type: "object", properties: { keywords: stringArraySchema }, required: ["keywords"] },
      };

    case "why-viral":
      return {
        systemInstruction: BASE_SYSTEM,
        prompt: `تحلیل کن چرا این ریلز احتمالاً وایرال شده — به قلاب، ریتم، فرمت، صدا/موزیک و لحظه‌ی روایی اشاره کن.\n${ctx}`,
        responseSchema: {
          type: "object",
          properties: {
            reasons: stringArraySchema,
            replicablePattern: stringSchema,
          },
          required: ["reasons", "replicablePattern"],
        },
      };

    case "audience-analysis":
      return {
        systemInstruction: BASE_SYSTEM,
        prompt: `بر اساس این محتوا، مخاطب هدف محتمل (دغدغه، سن تقریبی، انگیزه‌ی تماشا) را تحلیل کن.\n${ctx}`,
        responseSchema: {
          type: "object",
          properties: {
            audienceSummary: stringSchema,
            painPoints: stringArraySchema,
            motivations: stringArraySchema,
          },
          required: ["audienceSummary", "painPoints", "motivations"],
        },
      };

    case "story-sequence":
      return {
        systemInstruction: BASE_SYSTEM,
        prompt: `یک سکانس ۴ تا ۶ فریمی استوری اینستاگرام برای تبلیغ/تکمیل این محتوا طراحی کن.\n${ctx}`,
        responseSchema: {
          type: "object",
          properties: {
            frames: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  text: stringSchema,
                  visualIdea: stringSchema,
                  poll: { type: "object", properties: { question: stringSchema, options: stringArraySchema } },
                  questionBox: stringSchema,
                  cta: stringSchema,
                  sticker: stringSchema,
                },
              },
            },
          },
          required: ["frames"],
        },
      };

    case "carousel":
      return {
        systemInstruction: BASE_SYSTEM,
        prompt: `یک کروسل ۵ تا ۸ اسلایدی (عنوان هر اسلاید + متن کوتاه آن) بر اساس این محتوا طراحی کن.\n${ctx}`,
        responseSchema: {
          type: "object",
          properties: {
            slides: {
              type: "array",
              items: { type: "object", properties: { title: stringSchema, body: stringSchema } },
            },
          },
          required: ["slides"],
        },
      };

    case "comment-insights":
      return {
        systemInstruction: BASE_SYSTEM,
        prompt: `این کامنت‌های واقعی زیر یک پست/ریلز را تحلیل کن و دغدغه‌ها، سوالات تکراری، محصولات/موضوعات مورد درخواست و نسبت احساس مثبت/منفی/خنثی را استخراج کن.\n${ctx}`,
        responseSchema: {
          type: "object",
          properties: {
            painPoints: stringArraySchema,
            repeatedQuestions: stringArraySchema,
            desiredTopics: stringArraySchema,
            sentimentSplit: {
              type: "object",
              properties: {
                positive: { type: "number" },
                negative: { type: "number" },
                neutral: { type: "number" },
              },
              required: ["positive", "negative", "neutral"],
            },
          },
          required: ["painPoints", "repeatedQuestions", "desiredTopics", "sentimentSplit"],
        },
      };

    case "posting-recommendations":
      return {
        systemInstruction: BASE_SYSTEM,
        prompt: `بر اساس این تاریخچه‌ی انتشار و تعامل، بهترین روزها، بهترین ساعت‌ها و تناوب پیشنهادی انتشار را مشخص کن و دلیل هرکدام را توضیح بده.\n${ctx}`,
        responseSchema: {
          type: "object",
          properties: {
            bestDays: stringArraySchema,
            bestHours: stringArraySchema,
            frequency: stringSchema,
            reasoning: stringSchema,
          },
          required: ["bestDays", "bestHours", "frequency", "reasoning"],
        },
      };

    case "account-suggestions":
      return {
        systemInstruction: BASE_SYSTEM,
        prompt: `بر اساس این خلاصه‌ی عملکرد حساب اینستاگرام، ۳ تا ۵ پیشنهاد عملی و مشخص برای بهبود رشد و تعامل ارائه بده.\n${ctx}`,
        responseSchema: {
          type: "object",
          properties: { suggestions: stringArraySchema },
          required: ["suggestions"],
        },
      };
  }
}
