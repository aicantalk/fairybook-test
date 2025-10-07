import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/story/images/route";
import * as gemini from "@/lib/server/gemini";

describe("/api/story/images", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns character and cover images", async () => {
    vi.spyOn(gemini, "generateImage")
      .mockResolvedValueOnce({ base64: "character", mimeType: "image/png" })
      .mockResolvedValueOnce({ base64: "cover", mimeType: "image/png" });

    const request = new Request("http://localhost/api/story/images", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "테스트 동화",
        synopsis: "간단한 시놉시스",
        protagonist: "주인공 설명",
        age: "7-9",
        topic: "용기",
        storyType: { name: "빛나는 모험" },
        style: { name: "은은한 수채화", style: "soft" },
      }),
    });

    const response = await POST(request);
    const payload = (await response.json()) as {
      character?: { dataUrl?: string | null };
      cover?: { dataUrl?: string | null };
    };

    expect(response.status).toBe(200);
    expect(payload.character?.dataUrl).toContain("character");
    expect(payload.cover?.dataUrl).toContain("cover");
  });

  it("validates missing style", async () => {
    const request = new Request("http://localhost/api/story/images", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title: "동화" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});

