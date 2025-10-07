import { NextResponse } from "next/server";
import {
  buildImagePromptText,
  buildStoryPrompt,
} from "@/lib/server/prompts";
import {
  GeminiConfigError,
  GeminiGenerationError,
  generateImage,
  generateText,
  parseJsonFromText,
} from "@/lib/server/gemini";
import type { StoryCard, StoryStageResult } from "@/types";

interface StageRequestBody {
  age?: string | null;
  topic?: string | null;
  title?: string | null;
  storyType?: {
    name?: string;
    prompt?: string;
  } | null;
  stage?: {
    name?: string;
    index?: number;
    total?: number;
  } | null;
  storyCard?: {
    id?: string;
    name?: string;
    prompt?: string;
    stage?: string | null;
  } | null;
  previousSections?: Array<{
    stage?: string | null;
    stage_name?: string | null;
    card_name?: string | null;
    card?: string | null;
    paragraphs?: unknown;
  }> | null;
  synopsis?: string | null;
  protagonist?: string | null;
  style?: {
    name?: string;
    style?: string;
  } | null;
  characterImage?: string | null;
  characterImageMimeType?: string | null;
}

interface StageJsonResponse {
  title?: string;
  paragraphs?: unknown;
}

function sanitiseCard(card: StageRequestBody["storyCard"]): StoryCard {
  return {
    id: card?.id ?? "story-card",
    name: card?.name ?? "이야기 카드",
    prompt: card?.prompt ?? "",
    stage: card?.stage ?? undefined,
  };
}

function validateStagePayload(body: StageRequestBody) {
  const stageName = body.stage?.name?.toString().trim() ?? body.storyCard?.stage ?? "";
  const stageIndex = Number(body.stage?.index ?? 0);
  const totalStages = Math.max(Number(body.stage?.total ?? 5) || 5, stageIndex + 1);

  if (!body.storyCard?.name || !body.storyCard?.prompt) {
    return { error: "이야기 카드 정보가 필요합니다." } as const;
  }

  const title = (body.title ?? "").toString().trim();
  if (!title) {
    return { error: "동화 제목이 필요합니다." } as const;
  }

  const storyTypeName = body.storyType?.name?.toString().trim() ?? "";
  const storyTypePrompt = body.storyType?.prompt?.toString().trim() ?? "";
  if (!storyTypeName || !storyTypePrompt) {
    return { error: "이야기 유형 정보가 필요합니다." } as const;
  }

  return {
    age: (body.age ?? "").toString().trim() || "",
    topic: (body.topic ?? "").toString().trim() || null,
    title,
    storyTypeName,
    storyTypePrompt,
    stageName: stageName || "이야기 단계",
    stageIndex: Number.isInteger(stageIndex) ? stageIndex : 0,
    totalStages,
    storyCard: sanitiseCard(body.storyCard),
    previousSections: body.previousSections ?? [],
    synopsis: (body.synopsis ?? "").toString().trim() || null,
    protagonist: (body.protagonist ?? "").toString().trim() || null,
    style: body.style ?? null,
    characterImage: body.characterImage ?? null,
    characterImageMimeType: body.characterImageMimeType ?? null,
  } as const;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as StageRequestBody;
    const payload = validateStagePayload(body);
    if ("error" in payload) {
      return NextResponse.json({ error: payload.error }, { status: 400 });
    }

    const raw = await generateText({
      prompt: buildStoryPrompt({
        age: payload.age,
        topic: payload.topic,
        title: payload.title,
        storyTypeName: payload.storyTypeName,
        stageName: payload.stageName,
        stageIndex: payload.stageIndex,
        totalStages: payload.totalStages,
        storyCardName: payload.storyCard.name,
        storyCardPrompt: payload.storyCard.prompt ?? "",
        previousSections: payload.previousSections,
        synopsisText: payload.synopsis,
        protagonistText: payload.protagonist,
      }),
    });

    const storyJson = parseJsonFromText<StageJsonResponse>(raw, true);
    const paragraphsSource = Array.isArray(storyJson.paragraphs)
      ? storyJson.paragraphs
      : [];
    const paragraphs = paragraphsSource
      .map((paragraph) => String(paragraph ?? "").trim())
      .filter(Boolean);

    if (paragraphs.length === 0) {
      return NextResponse.json(
        { error: "동화 본문을 생성하지 못했습니다." },
        { status: 502 },
      );
    }

    const imagePrompt = payload.style
      ? buildImagePromptText({
          storyTitle: payload.title,
          storyParagraphs: paragraphs,
          age: payload.age,
          topic: payload.topic,
          storyTypeName: payload.storyTypeName,
          storyCardName: payload.storyCard.name,
          stageName: payload.stageName,
          styleName: payload.style.name ?? "",
          styleText: payload.style.style ?? "",
          protagonistText: payload.protagonist,
          useReferenceImage: Boolean(payload.characterImage),
        })
      : null;

    let imageDataUrl: string | null = null;
    let imageMimeType = "image/png";
    let imageError: string | null = null;

    if (payload.style && imagePrompt) {
      try {
        const imageResponse = await generateImage({
          prompt: imagePrompt,
          referenceImageBase64: payload.characterImage ?? undefined,
          referenceImageMimeType: payload.characterImageMimeType ?? undefined,
        });
        imageDataUrl = `data:${imageResponse.mimeType};base64,${imageResponse.base64}`;
        imageMimeType = imageResponse.mimeType;
      } catch (error) {
        if (error instanceof GeminiGenerationError) {
          imageError = error.message;
        } else {
          throw error;
        }
      }
    }

    const stageResult: StoryStageResult = {
      stage: payload.stageName,
      card: payload.storyCard,
      story: {
        title: storyJson.title?.trim() || payload.title,
        paragraphs,
        summary: null,
      },
      image: payload.style
        ? {
            dataUrl: imageDataUrl,
            mimeType: imageMimeType,
            prompt: imagePrompt ?? "",
            style: payload.style.name ?? null,
            error: imageError,
          }
        : undefined,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json({ stage: stageResult });
  } catch (error) {
    if (error instanceof GeminiConfigError) {
      return NextResponse.json(
        { error: "Gemini API 키가 설정되지 않았습니다." },
        { status: 503 },
      );
    }
    if (error instanceof GeminiGenerationError) {
      console.error("Gemini generation failed", error);
      return NextResponse.json(
        { error: error.message },
        { status: 502 },
      );
    }
    console.error("Unexpected error in /api/story/stage", error);
    return NextResponse.json(
      { error: "알 수 없는 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
