import { NextResponse } from "next/server";
import { loadIllustrationStyles } from "@/lib/server/illust-styles";
import {
  buildProtagonistPrompt,
  buildSynopsisPrompt,
  buildTitlePrompt,
} from "@/lib/server/prompts";
import {
  GeminiConfigError,
  GeminiGenerationError,
  generateText,
  parseJsonFromText,
} from "@/lib/server/gemini";
import type { IllustrationStyle } from "@/types";

interface GenerateRequestBody {
  age?: string | null;
  topic?: string | null;
  storyType?: {
    id?: string | number;
    name?: string;
    prompt?: string;
  } | null;
}

function pickStyle(styles: IllustrationStyle[]): IllustrationStyle | null {
  if (styles.length === 0) {
    return null;
  }
  const index = Math.floor(Math.random() * styles.length);
  return styles[index] ?? null;
}

function validatePayload(body: GenerateRequestBody) {
  const age = (body.age ?? "").toString().trim();
  const storyTypeName = body.storyType?.name?.toString().trim() ?? "";
  const storyTypePrompt = body.storyType?.prompt?.toString().trim() ?? "";

  if (!age) {
    return { error: "나이대가 필요합니다." } as const;
  }
  if (!storyTypeName || !storyTypePrompt) {
    return { error: "이야기 유형 정보가 올바르지 않습니다." } as const;
  }
  return {
    age,
    topic: (body.topic ?? "").toString().trim() || null,
    storyTypeName,
    storyTypePrompt,
  } as const;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateRequestBody;
    const valid = validatePayload(body);
    if ("error" in valid) {
      return NextResponse.json({ error: valid.error }, { status: 400 });
    }

    const synopsisPrompt = buildSynopsisPrompt({
      age: valid.age,
      topic: valid.topic,
      storyTypeName: valid.storyTypeName,
      storyTypePrompt: valid.storyTypePrompt,
    });

    const synopsisText = await generateText({ prompt: synopsisPrompt }).catch((error) => {
      console.error("Failed to generate synopsis", error);
      throw new GeminiGenerationError("시놉시스 생성에 실패했습니다.", error);
    });

    const synopsisClean = synopsisText.trim();
    if (!synopsisClean) {
      return NextResponse.json(
        { error: "시놉시스를 생성하지 못했습니다." },
        { status: 502 },
      );
    }

    const protagonistPrompt = buildProtagonistPrompt({
      age: valid.age,
      topic: valid.topic,
      storyTypeName: valid.storyTypeName,
      storyTypePrompt: valid.storyTypePrompt,
      synopsisText,
    });

    const protagonistText = await generateText({ prompt: protagonistPrompt }).catch((error) => {
      console.error("Failed to generate protagonist", error);
      throw new GeminiGenerationError("주인공 설정 생성에 실패했습니다.", error);
    });

    const protagonistClean = protagonistText.trim();
    if (!protagonistClean) {
      return NextResponse.json(
        { error: "주인공 설정을 생성하지 못했습니다." },
        { status: 502 },
      );
    }

    const titlePrompt = buildTitlePrompt({
      age: valid.age,
      topic: valid.topic,
      storyTypeName: valid.storyTypeName,
      storyTypePrompt: valid.storyTypePrompt,
      synopsisText,
      protagonistText,
    });

    let titlePayload: { title?: string };
    try {
      const titleRaw = await generateText({ prompt: titlePrompt });
      titlePayload = parseJsonFromText<{ title?: string }>(titleRaw, true);
    } catch (error) {
      console.error("Failed to parse title payload", error);
      return NextResponse.json(
        { error: "제목을 생성하지 못했습니다." },
        { status: 502 },
      );
    }

    const title = (titlePayload.title ?? "").trim();
    if (!title) {
      return NextResponse.json(
        { error: "제목을 생성하지 못했습니다." },
        { status: 502 },
      );
    }

    const styles = await loadIllustrationStyles();
    const styleChoice = pickStyle(styles);
    if (!styleChoice) {
      return NextResponse.json(
        { error: "사용 가능한 삽화 스타일을 찾을 수 없습니다." },
        { status: 503 },
      );
    }

    return NextResponse.json({
      title,
      synopsis: synopsisClean,
      protagonist: protagonistClean,
      style: styleChoice,
      generatedAt: new Date().toISOString(),
    });
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
    console.error("Unexpected error in /api/story/generate", error);
    return NextResponse.json(
      { error: "알 수 없는 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
