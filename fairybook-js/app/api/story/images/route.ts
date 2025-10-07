import { NextResponse } from "next/server";
import {
  buildImagePromptText,
} from "@/lib/server/prompts";
import {
  GeminiConfigError,
  GeminiGenerationError,
  generateImage,
} from "@/lib/server/gemini";

interface ImageRequestBody {
  title?: string | null;
  synopsis?: string | null;
  protagonist?: string | null;
  age?: string | null;
  topic?: string | null;
  storyType?: {
    name?: string;
  } | null;
  style?: {
    name?: string;
    style?: string;
  } | null;
}

function toDataUrl(base64: string | null | undefined, mimeType: string) {
  if (!base64) {
    return null;
  }
  return `data:${mimeType};base64,${base64}`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ImageRequestBody;

    const title = (body.title ?? "").trim();
    const synopsis = (body.synopsis ?? "").trim();
    const protagonist = (body.protagonist ?? "").trim();
    const age = (body.age ?? "").trim() || "6-8";
    const topic = (body.topic ?? "").trim();
    const storyTypeName = body.storyType?.name?.toString().trim() || "이야기";
    const styleName = body.style?.name?.toString().trim() ?? "";
    const styleText = body.style?.style?.toString().trim() ?? "";

    if (!styleName || !styleText) {
      return NextResponse.json(
        { error: "삽화 스타일 정보가 필요합니다." },
        { status: 400 },
      );
    }

    const synopsisParagraphs = synopsis ? [synopsis] : [];
    const protagonistParagraphs = protagonist ? [protagonist] : [];

    const characterPrompt = buildImagePromptText({
      storyTitle: title || "Character Sheet",
      storyParagraphs: protagonistParagraphs.length > 0 ? protagonistParagraphs : [""],
      age,
      topic,
      storyTypeName,
      storyCardName: "Character Blueprint",
      stageName: "캐릭터 설정화",
      styleName,
      styleText,
      isCharacterSheet: true,
      protagonistText: protagonist || null,
    });

    let characterDataUrl: string | null = null;
    let characterMime: string | null = null;
    let characterError: string | null = null;

    try {
      const characterImage = await generateImage({ prompt: characterPrompt });
      characterDataUrl = toDataUrl(characterImage.base64, characterImage.mimeType);
      characterMime = characterImage.mimeType;
    } catch (error) {
      if (error instanceof GeminiGenerationError) {
        characterError = error.message;
      } else {
        throw error;
      }
    }

    const coverPrompt = buildImagePromptText({
      storyTitle: title || "표지",
      storyParagraphs: [...synopsisParagraphs, ...protagonistParagraphs].filter(Boolean),
      age,
      topic,
      storyTypeName,
      storyCardName: "표지 컨셉",
      stageName: "표지",
      styleName,
      styleText,
      useReferenceImage: Boolean(characterDataUrl),
      protagonistText: protagonist || null,
    });

    let coverDataUrl: string | null = null;
    let coverMime: string | null = null;
    let coverError: string | null = null;

    try {
      const coverImage = await generateImage({
        prompt: coverPrompt,
        referenceImageBase64: characterDataUrl ? characterDataUrl.split(",")[1] ?? null : null,
        referenceImageMimeType: characterMime ?? undefined,
      });
      coverDataUrl = toDataUrl(coverImage.base64, coverImage.mimeType);
      coverMime = coverImage.mimeType;
    } catch (error) {
      if (error instanceof GeminiGenerationError) {
        coverError = error.message;
      } else {
        throw error;
      }
    }

    if (!characterDataUrl && !coverDataUrl) {
      return NextResponse.json(
        { error: characterError ?? coverError ?? "이미지를 생성하지 못했습니다." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      character: {
        dataUrl: characterDataUrl,
        mimeType: characterMime ?? "image/png",
        prompt: characterPrompt,
        error: characterError,
      },
      cover: {
        dataUrl: coverDataUrl,
        mimeType: coverMime ?? "image/png",
        prompt: coverPrompt,
        error: coverError,
      },
    });
  } catch (error) {
    if (error instanceof GeminiConfigError) {
      return NextResponse.json(
        { error: "Gemini API 키가 설정되지 않았습니다." },
        { status: 503 },
      );
    }
    if (error instanceof GeminiGenerationError) {
      console.error("Gemini image generation failed", error);
      return NextResponse.json(
        { error: error.message },
        { status: 502 },
      );
    }
    console.error("Unexpected error in /api/story/images", error);
    return NextResponse.json(
      { error: "이미지를 생성하지 못했습니다." },
      { status: 500 },
    );
  }
}

