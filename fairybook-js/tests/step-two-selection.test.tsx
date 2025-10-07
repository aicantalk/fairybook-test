import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StepTwoSelection } from "@/app/create/_components/step-two-selection";
import { resetWizardStore, useWizardStore } from "@/lib/client/wizard-store";

const mockStoryTypes = [
  { id: "1", name: "테스트 타입 A", prompt: "설명 A" },
  { id: "2", name: "테스트 타입 B", prompt: "설명 B" },
];

const mockGenerateResponse = {
  title: "mock title",
  synopsis: "mock synopsis",
  protagonist: "mock protagonist",
  style: {
    name: "테스트 스타일",
    style: "상세 스타일",
    thumbnailPath: null,
  },
  generatedAt: new Date().toISOString(),
};

const mockImageResponse = {
  character: {
    dataUrl: "data:image/png;base64,character",
    prompt: "캐릭터 프롬프트",
    error: null,
  },
  cover: {
    dataUrl: "data:image/png;base64,cover",
    prompt: "커버 프롬프트",
    error: null,
  },
};

describe("StepTwoSelection", () => {
  beforeEach(() => {
    resetWizardStore();
    useWizardStore.getState().setStoryTypeCandidates(mockStoryTypes);
    useWizardStore.getState().setSelectedTypeIndex(0);
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("allows selecting a story type", () => {
    render(<StepTwoSelection />);

    const button = screen.getByText("테스트 타입 B");
    fireEvent.click(button);

    expect(useWizardStore.getState().selectedTypeIndex).toBe(1);
  });

  it("fetches new cards when refreshing", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ storyTypes: mockStoryTypes }),
    });

    render(<StepTwoSelection />);

    const refreshButton = screen.getByRole("button", { name: "카드 다시 뽑기" });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/story/types?count=8");
    });
  });

  it("calls mock generation and updates store", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation((url: RequestInfo | URL, options?: RequestInit) => {
      if (typeof url === "string") {
        if (url.startsWith("/api/story/generate")) {
          return Promise.resolve({
            ok: true,
            json: async () => mockGenerateResponse,
          });
        }
        if (url.startsWith("/api/story/images")) {
          return Promise.resolve({
            ok: true,
            json: async () => mockImageResponse,
          });
        }
        if (url.startsWith("/api/story/types")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ storyTypes: mockStoryTypes }),
          });
        }
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ storyTypes: mockStoryTypes }),
      });
    });

    render(<StepTwoSelection />);

    const generateButton = screen.getByRole("button", { name: /제목 만들기/ });
    fireEvent.click(generateButton);

    await waitFor(() => {
      const state = useWizardStore.getState();
      expect(state.storyTitle).toBe(mockGenerateResponse.title);
      expect(state.styleChoiceName).toBe(mockGenerateResponse.style.name);
      expect(state.styleChoice?.style).toBe(mockGenerateResponse.style.style);
      expect(state.coverImageDataUrl).toBe(mockImageResponse.cover.dataUrl);
      expect(state.characterImageDataUrl).toBe(mockImageResponse.character.dataUrl);
    });
  });
});
