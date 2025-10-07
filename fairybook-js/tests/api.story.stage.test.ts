import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/story/stage/route";
import * as gemini from "@/lib/server/gemini";

describe("/api/story/stage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a stage payload", async () => {
    vi.spyOn(gemini, "generateText").mockResolvedValueOnce(
      '{"title":"Generated","paragraphs":["첫 단락","둘째 단락"]}',
    );
    vi.spyOn(gemini, "generateImage").mockResolvedValue({
      base64: "stage-image",
      mimeType: "image/png",
    });

    const request = new Request("http://localhost/api/story/stage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        age: "7-9",
        topic: "용기",
        title: "우리들의 모험",
        storyType: { name: "빛나는 모험", prompt: "모험 설명" },
        stage: { name: "발단", index: 0, total: 5 },
        storyCard: {
          id: "card-1",
          name: "달빛 속으로",
          prompt: "달빛 아래 모험을 묘사해줘",
          stage: "발단",
        },
        previousSections: [],
        synopsis: "시놉시스",
        protagonist: "주인공",
        style: { name: "은은한 수채화", style: "soft watercolor" },
      }),
    });

    const response = await POST(request);
    const payload = (await response.json()) as {
      stage: { story: { paragraphs: string[] }; image?: { dataUrl?: string | null } };
    };

    expect(response.status).toBe(200);
    expect(payload.stage.story.paragraphs).toHaveLength(2);
    expect(payload.stage.image?.dataUrl).toContain("stage-image");
  });

  it("validates payload", async () => {
    const request = new Request("http://localhost/api/story/stage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title: "" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("surfaces Gemini errors", async () => {
    vi.spyOn(gemini, "generateText").mockRejectedValue(
      new gemini.GeminiGenerationError("mock failure"),
    );

    const request = new Request("http://localhost/api/story/stage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "우리들의 모험",
        storyCard: { name: "카드", prompt: "설명" },
        storyType: { name: "모험", prompt: "설명" },
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(502);
  });
});
