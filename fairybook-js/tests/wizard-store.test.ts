import { beforeEach, describe, expect, it } from "vitest";
import { resetWizardStore, useWizardStore } from "@/lib/client/wizard-store";
import type { StoryStageResult } from "@/types";

describe("wizard store", () => {
  beforeEach(() => {
    resetWizardStore();
  });

  it("updates mode and step", () => {
    useWizardStore.getState().setMode("create");
    useWizardStore.getState().setStep(2);

    expect(useWizardStore.getState().mode).toBe("create");
    expect(useWizardStore.getState().step).toBe(2);
  });

  it("pushes new stage into the list", () => {
    const stage: StoryStageResult = {
      stage: "도입",
      card: { id: "card", name: "카드", prompt: "", stage: "도입" },
      story: {
        title: "테스트 제목",
        paragraphs: ["단락"],
        summary: null,
      },
      generatedAt: new Date().toISOString(),
    };

    useWizardStore.getState().pushStage(stage);

    expect(useWizardStore.getState().stages).toHaveLength(1);
    expect(useWizardStore.getState().stages[0].story.title).toBe("테스트 제목");
  });

  it("resets to initial state", () => {
    useWizardStore.getState().setCoverReady(true);
    useWizardStore.getState().reset();

    expect(useWizardStore.getState().coverReady).toBe(false);
    expect(useWizardStore.getState().stages).toHaveLength(0);
    expect(useWizardStore.getState().pendingStages).toHaveLength(5);
  });
});
