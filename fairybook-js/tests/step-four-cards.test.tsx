import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StepFourCards } from "@/app/create/_components/step-four-cards";
import { resetWizardStore, useWizardStore } from "@/lib/client/wizard-store";

const mockCards = [
  { id: "card-1", name: "첫 만남", prompt: "첫 만남 장면", stage: "도입", image: "story_friendship.png" },
  { id: "card-2", name: "갈등", prompt: "갈등이 찾아온다", stage: "전개", image: "story_courage.png" },
  { id: "card-3", name: "전환", prompt: "전환점", image: null },
  { id: "card-4", name: "절정", prompt: "절정으로 향한다", image: "story_growth.png" },
];

describe("StepFourCards", () => {
  beforeEach(() => {
    resetWizardStore();
    vi.stubGlobal("fetch", vi.fn());
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ cards: mockCards }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads cards on mount", async () => {
    render(<StepFourCards />);

    await waitFor(() => {
      expect(useWizardStore.getState().storyCards).toHaveLength(4);
    });
  });

  it("selects a card", async () => {
    render(<StepFourCards />);

    await waitFor(() => screen.getByText("갈등"));
    fireEvent.click(screen.getByText("갈등"));
    expect(useWizardStore.getState().selectedCardIndex).toBe(1);
  });

  it("navigates to next step", async () => {
    render(<StepFourCards />);

    await waitFor(() => screen.getByText("갈등"));
    fireEvent.click(screen.getByRole("button", { name: /Step 5로 이동/ }));
    expect(useWizardStore.getState().step).toBe(5);
  });
});
