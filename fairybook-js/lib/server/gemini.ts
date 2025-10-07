import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim();
const GEMINI_TEXT_MODEL = process.env.GEMINI_TEXT_MODEL?.trim() || "models/gemini-2.0-flash-exp";
const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL?.trim() || "models/gemini-2.0-flash-exp";

export class GeminiConfigError extends Error {
  constructor(message = "Gemini API 구성이 누락되었습니다.") {
    super(message);
    this.name = "GeminiConfigError";
  }
}

export class GeminiGenerationError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "GeminiGenerationError";
  }
}

let textModel: GenerativeModel | null = null;
let imageModel: GenerativeModel | null = null;

function ensureApiKey(): string {
  if (!GEMINI_API_KEY) {
    throw new GeminiConfigError();
  }
  return GEMINI_API_KEY;
}

function getGenAI(): GoogleGenerativeAI {
  const apiKey = ensureApiKey();
  return new GoogleGenerativeAI(apiKey);
}

function ensureTextModel(): GenerativeModel {
  if (textModel) {
    return textModel;
  }
  const client = getGenAI();
  textModel = client.getGenerativeModel({ model: GEMINI_TEXT_MODEL });
  return textModel;
}

function ensureImageModel(): GenerativeModel {
  if (imageModel) {
    return imageModel;
  }
  const client = getGenAI();
  imageModel = client.getGenerativeModel({ model: GEMINI_IMAGE_MODEL });
  return imageModel;
}

export interface GenerateTextOptions {
  prompt: string;
  temperature?: number;
  topP?: number;
  topK?: number;
}

const DEFAULT_GENERATION_CONFIG = {
  temperature: 0.7,
  topP: 0.95,
  topK: 32,
  maxOutputTokens: 2048,
};

async function runTextOnce({ prompt, temperature, topP, topK }: GenerateTextOptions): Promise<string> {
  const model = ensureTextModel();
  const response = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      ...DEFAULT_GENERATION_CONFIG,
      ...(typeof temperature === "number" ? { temperature } : {}),
      ...(typeof topP === "number" ? { topP } : {}),
      ...(typeof topK === "number" ? { topK } : {}),
    },
  });

  const raw = response.response;
  if (!raw) {
    throw new GeminiGenerationError("Gemini 응답을 읽지 못했습니다.");
  }
  const text = raw.text();
  if (!text.trim()) {
    throw new GeminiGenerationError("모델이 빈 응답을 반환했습니다. (세이프티 차단 가능)");
  }
  return text;
}

export interface GenerateImageOptions {
  prompt: string;
  referenceImageBase64?: string | null;
  referenceImageMimeType?: string;
}

const DEFAULT_IMAGE_CONFIG = {
  responseMimeType: "image/png",
};

async function runImageOnce({
  prompt,
  referenceImageBase64,
  referenceImageMimeType,
}: GenerateImageOptions): Promise<{ base64: string; mimeType: string }>
{
  const model = ensureImageModel();
  type PromptPart = { text: string } | { inlineData: { data: string; mimeType: string } };
  const promptParts: PromptPart[] = [];
  if (referenceImageBase64) {
    promptParts.push({
      inlineData: {
        data: referenceImageBase64,
        mimeType: referenceImageMimeType ?? "image/png",
      },
    });
  }
  promptParts.push({ text: prompt });

  const response = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: promptParts,
      },
    ],
    generationConfig: DEFAULT_IMAGE_CONFIG,
  });

  const candidates = response.response?.candidates ?? [];
  const responseParts = candidates.flatMap((candidate) => candidate.content?.parts ?? []);
  const inlinePart = responseParts.find(
    (part): part is { inlineData: { data: string; mimeType?: string } } =>
      "inlineData" in part && Boolean(part.inlineData?.data),
  );

  const inlineData = inlinePart?.inlineData;
  if (!inlineData?.data) {
    throw new GeminiGenerationError("이미지 응답이 비어 있습니다.");
  }

  return {
    base64: inlineData.data,
    mimeType: inlineData.mimeType ?? "image/png",
  };
}

async function retry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown = null;
  for (let index = 0; index < attempts; index += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (index === attempts - 1) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 250 * (index + 1)));
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new GeminiGenerationError("Gemini 호출에 실패했습니다.", lastError);
}

export async function generateText(options: GenerateTextOptions): Promise<string> {
  try {
    return await retry(() => runTextOnce(options));
  } catch (error) {
    if (error instanceof GeminiConfigError || error instanceof GeminiGenerationError) {
      throw error;
    }
    throw new GeminiGenerationError("Gemini 호출 중 오류가 발생했습니다.", error);
  }
}

export async function generateImage(options: GenerateImageOptions): Promise<{ base64: string; mimeType: string }> {
  try {
    return await retry(() => runImageOnce(options));
  } catch (error) {
    if (error instanceof GeminiConfigError || error instanceof GeminiGenerationError) {
      throw error;
    }
    throw new GeminiGenerationError("이미지 생성 중 오류가 발생했습니다.", error);
  }
}

export function stripJsonCodeFence(rawText: string): string {
  const trimmed = rawText.trim();
  if (!trimmed.startsWith("```")) {
    return trimmed;
  }
  const fenceStripped = trimmed
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "```" && !line.toLowerCase().startsWith("json"))
    .join("\n");
  return fenceStripped.trim();
}

export function extractFirstJsonObject(rawText: string): string | null {
  const text = rawText.trim();
  const start = text.indexOf("{");
  if (start === -1) {
    return null;
  }
  let depth = 0;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, index + 1);
      }
    }
  }
  return null;
}

export function parseJsonFromText<T>(rawText: string, allowFallback = false): T {
  const stripped = stripJsonCodeFence(rawText);
  try {
    return JSON.parse(stripped) as T;
  } catch (error) {
    if (!allowFallback) {
      throw error;
    }
    const fallback = extractFirstJsonObject(rawText);
    if (!fallback) {
      throw error;
    }
    return JSON.parse(fallback) as T;
  }
}

export const GEMINI_CONFIG = {
  apiKey: GEMINI_API_KEY ?? null,
  textModel: GEMINI_TEXT_MODEL,
  imageModel: GEMINI_IMAGE_MODEL,
};
