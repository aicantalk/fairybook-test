import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/story/generate/route";
import * as gemini from "@/lib/server/gemini";

describe("/api/story/generate", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns generated story setup", async () => {
    const spy = vi
      .spyOn(gemini, "generateText")
      .mockResolvedValueOnce("synopsis text")
      .mockResolvedValueOnce("protagonist text")
      .mockResolvedValueOnce('{"title":"Generated Title"}');

    const request = new Request("http://localhost/api/story/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        age: "7-9",
        topic: "용기",
        storyType: {
          name: "빛나는 모험",
          prompt: "용기 있는 모험에 대한 설명",
        },
      }),
    });

    const response = await POST(request);
    const payload = (await response.json()) as {
      title: string;
      synopsis: string;
      protagonist: string;
      style: { name: string; style: string };
    };

    expect(response.status).toBe(200);
    expect(payload.title).toBe("Generated Title");
    expect(payload.synopsis).toBe("synopsis text");
    expect(payload.protagonist).toBe("protagonist text");
    expect(payload.style?.name).toBeTruthy();
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it("returns 502 when title payload cannot be parsed", async () => {
    vi.spyOn(gemini, "generateText")
      .mockResolvedValueOnce("synopsis text")
      .mockResolvedValueOnce("protagonist text")
      .mockResolvedValueOnce("not-a-json-response");

    const request = new Request("http://localhost/api/story/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        age: "7-9",
        topic: "용기",
        storyType: {
          name: "빛나는 모험",
          prompt: "용기 있는 모험에 대한 설명",
        },
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(502);
  });

  it("returns 400 when payload is invalid", async () => {
    const request = new Request("http://localhost/api/story/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ age: "" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("handles Gemini failures with 502", async () => {
    vi.spyOn(gemini, "generateText").mockRejectedValue(
      new gemini.GeminiGenerationError("mock failure"),
    );

    const request = new Request("http://localhost/api/story/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        age: "7-9",
        storyType: { name: "빛나는 모험", prompt: "설명" },
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(502);
  });
});
