import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { StepThreeReview } from "@/app/create/_components/step-three-review";
import { resetWizardStore, useWizardStore } from "@/lib/client/wizard-store";

describe("StepThreeReview", () => {
  beforeEach(() => {
    resetWizardStore();
    const store = useWizardStore.getState();
    store.setSynopsisText("synopsis mock");
    store.setProtagonistText("protagonist mock");
    store.setStoryTitle("title mock");
    store.setStyleChoiceName("style mock");
    store.setStep(3);
  });

  it("renders generated content", () => {
    render(<StepThreeReview />);

    expect(screen.getAllByText("title mock").length).toBeGreaterThan(0);
    expect(screen.getByText("synopsis mock")).toBeInTheDocument();
    expect(screen.getByText("protagonist mock")).toBeInTheDocument();
    expect(screen.getAllByText(/style mock/).length).toBeGreaterThan(0);
  });

  it("navigates between steps", () => {
    render(<StepThreeReview />);

    fireEvent.click(screen.getByRole("button", { name: /Step 4로 이동/ }));
    expect(useWizardStore.getState().step).toBe(4);

    fireEvent.click(screen.getByRole("button", { name: /Step 2로 돌아가기/ }));
    expect(useWizardStore.getState().step).toBe(2);
  });
});
