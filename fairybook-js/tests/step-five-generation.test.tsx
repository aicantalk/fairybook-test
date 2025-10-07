import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StepFiveGeneration } from "@/app/create/_components/step-five-generation";
import { resetWizardStore, useWizardStore } from "@/lib/client/wizard-store";

describe("StepFiveGeneration", () => {
  beforeEach(() => {
    resetWizardStore();
    const store = useWizardStore.getState();
    store.setStoryCards([
      {
        id: "card-1",
        name: "달빛 속으로",
        prompt: "달빛 아래 모험을 묘사해줘",
        stage: "도입",
      },
    ]);
    store.setSelectedCardIndex(0);
    store.setStyleChoice({
      name: "은은한 수채화",
      style: "soft watercolor",
      thumbnailPath: null,
    });
    store.setStyleChoiceName("은은한 수채화");
    store.setStoryTitle("테스트 동화");
    store.setSynopsisText("테스트 시놉시스");
    store.setProtagonistText("테스트 주인공");
    store.setAgeInput("7-9세");
    store.setTopicInput("용기");
    store.setStoryTypeCandidates([
      { id: "type-1", name: "빛나는 모험", prompt: "밝은 모험 이야기" },
    ]);
    store.setSelectedTypeIndex(0);
    store.setStep(5);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        stage: {
          stage: "발단",
          card: {
            id: "card-1",
            name: "달빛 속으로",
            prompt: "달빛 아래 모험을 묘사해줘",
          },
          story: {
            title: "테스트 동화",
            paragraphs: ["첫 단락", "둘째 단락"],
            summary: null,
          },
          image: {
            dataUrl: "data:image/png;base64,stage",
            mimeType: "image/png",
            prompt: "prompt",
            style: "은은한 수채화",
            error: null,
          },
          generatedAt: new Date().toISOString(),
        },
      }),
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("generates a stage and prepares the next phase", async () => {
    render(<StepFiveGeneration />);

    const generateButton = screen.getByRole("button", { name: /스테이지 만들기|스테이지 다시 만들기|생성 중/ });
    fireEvent.click(generateButton);

    expect(useWizardStore.getState().isGenerating).toBe(true);

    await waitFor(() => {
      expect(useWizardStore.getState().stages).toHaveLength(1);
    });
    expect(fetch).toHaveBeenCalledWith(
      "/api/story/stage",
      expect.objectContaining({ method: "POST" }),
    );
    expect(useWizardStore.getState().pendingStages).toHaveLength(4);
    expect(useWizardStore.getState().step).toBe(4);
    expect(useWizardStore.getState().coverReady).toBe(true);
  });
});
