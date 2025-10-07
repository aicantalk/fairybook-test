import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StepOneForm } from "@/app/create/_components/step-one-form";
import { CreateIntro } from "@/app/create/_components/create-intro";
import { resetWizardStore, useWizardStore } from "@/lib/client/wizard-store";
import type { GenerationTokenStatus } from "@/types";

describe("CreateStepOne", () => {
  beforeEach(() => {
    resetWizardStore();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("updates store when topic input changes", () => {
    render(<StepOneForm />);

    const textarea = screen.getByLabelText("이야기 아이디어");
    fireEvent.change(textarea, { target: { value: "용감한 고양이 이야기" } });

    expect(useWizardStore.getState().topicInput).toBe("용감한 고양이 이야기");
  });

  it("submits form and advances to step 2", async () => {
    render(<StepOneForm />);

    const submitButton = screen.getByRole("button", { name: /다음 단계로/ });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(useWizardStore.getState().step).toBeGreaterThanOrEqual(2);
    });
  });
});

describe("CreateIntro", () => {
  beforeEach(() => {
    resetWizardStore();
  });

  const zeroTokenStatus: GenerationTokenStatus = {
    tokens: 0,
    autoCap: 10,
    createdAt: null,
    updatedAt: null,
    lastLoginAt: null,
    lastRefillAt: null,
    lastConsumedAt: null,
    lastConsumedSignature: null,
  };

  it("disables start button when tokens are exhausted", () => {
    render(<CreateIntro tokenStatus={zeroTokenStatus} />);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });

  it("moves to step 1 when start is clicked", () => {
    const status: GenerationTokenStatus = { ...zeroTokenStatus, tokens: 5 };
    render(<CreateIntro tokenStatus={status} />);

    const button = screen.getByRole("button", { name: /동화 만들기 시작하기/ });
    fireEvent.click(button);

    expect(useWizardStore.getState().step).toBe(1);
  });
});
