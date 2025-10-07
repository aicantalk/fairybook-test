"use client";

import type { GenerationTokenStatus } from "@/types";
import { useWizardStore } from "@/lib/client/wizard-store";
import { useEffect, useMemo } from "react";
import { CreateIntro } from "./create-intro";
import { StepOneForm } from "./step-one-form";
import { StepTwoSelection } from "./step-two-selection";
import { StepThreeReview } from "./step-three-review";
import { StepFourCards } from "./step-four-cards";
import { StepFiveGeneration } from "./step-five-generation";
import { StepSixRecap } from "./step-six-recap";

interface CreatePageClientProps {
  tokenStatus: GenerationTokenStatus | null;
}

export function CreatePageClient({ tokenStatus }: CreatePageClientProps) {
  const step = useWizardStore((state) => state.step);
  const setMode = useWizardStore((state) => state.setMode);

  useEffect(() => {
    setMode("create");
  }, [setMode]);

  const content = useMemo(() => {
    switch (step) {
      case 0:
        return <CreateIntro tokenStatus={tokenStatus} />;
      case 1:
        return <StepOneForm />;
      case 2:
        return <StepTwoSelection />;
      case 3:
        return <StepThreeReview />;
      case 4:
        return <StepFourCards />;
      case 5:
        return <StepFiveGeneration />;
      default:
        return <StepSixRecap />;
    }
  }, [step, tokenStatus]);

  return <section className="flex flex-col gap-6">{content}</section>;
}
