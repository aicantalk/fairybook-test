import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StepSixRecap } from "@/app/create/_components/step-six-recap";
import { resetWizardStore, useWizardStore } from "@/lib/client/wizard-store";
import type { StoryStageResult } from "@/types";

describe("StepSixRecap", () => {
  beforeEach(() => {
    resetWizardStore();
    const store = useWizardStore.getState();
    const stage: StoryStageResult = {
      stage: "도입",
      card: { id: "card-1", name: "첫 만남", prompt: "첫 만남 묘사" },
      story: {
        title: "달빛 아래 만남",
        paragraphs: ["모의 단락"],
        summary: "달빛이 비추는 첫 만남",
      },
      image: {
        dataUrl: null,
        mimeType: "image/png",
        prompt: "첫 만남 묘사",
        style: "은은한 수채화",
      },
      generatedAt: new Date().toISOString(),
    };
    store.setStoryTitle("Mock Story");
    store.setSynopsisText("Mock synopsis");
    store.setProtagonistText("Mock protagonist");
    store.setStyleChoiceName("은은한 수채화");
    store.setAgeInput("6-8");
    store.setTopicInput("달빛 모험");
    store.setStages([stage]);
    store.setStep(6);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows recap details and mock export flow", async () => {
    vi.useFakeTimers();
    render(<StepSixRecap />);

    expect(screen.getByText("Mock Story")).toBeInTheDocument();
    expect(screen.getByText(/달빛 아래 만남/)).toBeInTheDocument();

    const exportButton = screen.getByRole("button", { name: "HTML 내보내기 (Mock)" });
    fireEvent.click(exportButton);

    act(() => {
      vi.runAllTimers();
    });

    expect(
      screen.getByRole("button", { name: "모의 HTML 생성 완료" }),
    ).toBeInTheDocument();
  });

  it("resets wizard when starting a new story", () => {
    render(<StepSixRecap />);

    const restartButton = screen.getByRole("button", { name: "새 이야기 시작하기" });
    fireEvent.click(restartButton);

    expect(useWizardStore.getState().step).toBe(1);
    expect(useWizardStore.getState().storyTitle).toBeNull();
  });
});
