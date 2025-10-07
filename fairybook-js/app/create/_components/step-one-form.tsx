"use client";

import { useEffect, useState } from "react";
import { useWizardStore } from "@/lib/client/wizard-store";

const AGE_OPTIONS = [
  { value: "6-8", label: "6-8세" },
  { value: "9-12", label: "9-12세" },
];

export function StepOneForm() {
  const mode = useWizardStore((state) => state.mode);
  const step = useWizardStore((state) => state.step);
  const ageInput = useWizardStore((state) => state.ageInput);
  const topicInput = useWizardStore((state) => state.topicInput);
  const setAgeInput = useWizardStore((state) => state.setAgeInput);
  const setTopicInput = useWizardStore((state) => state.setTopicInput);
  const setStep = useWizardStore((state) => state.setStep);
  const setMode = useWizardStore((state) => state.setMode);
  const reset = useWizardStore((state) => state.reset);
  const setStoryTypeCandidates = useWizardStore((state) => state.setStoryTypeCandidates);
  const setSelectedTypeIndex = useWizardStore((state) => state.setSelectedTypeIndex);
  const setSynopsisText = useWizardStore((state) => state.setSynopsisText);
  const setProtagonistText = useWizardStore((state) => state.setProtagonistText);
  const setStoryTitle = useWizardStore((state) => state.setStoryTitle);
  const setStyleChoiceName = useWizardStore((state) => state.setStyleChoiceName);
  const setStoryCards = useWizardStore((state) => state.setStoryCards);
  const setSelectedCardIndex = useWizardStore((state) => state.setSelectedCardIndex);

  const [submissionState, setSubmissionState] = useState<"idle" | "saving" | "ready">("idle");

  useEffect(() => {
    if (mode !== "create") {
      setMode("create");
    }
    if (step === 0) {
      setStep(1);
    }
  }, [mode, step, setMode, setStep]);

  useEffect(() => {
    if (ageInput === null) {
      setAgeInput("6-8");
    }
  }, [ageInput, setAgeInput]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmissionState("saving");
    // Step 2는 아직 구현되지 않았으므로 저장만 수행하고 안내 메시지를 보여준다.
    setStoryTypeCandidates([]);
    setSelectedTypeIndex(0);
    setSynopsisText(null);
    setProtagonistText(null);
    setStoryTitle(null);
    setStyleChoiceName(null);
    setStoryCards([]);
    setSelectedCardIndex(0);
    setTimeout(() => {
      setSubmissionState("ready");
      setStep(2);
    }, 200);
  };

  const handleReset = () => {
    reset();
    setMode("create");
    setStep(1);
    setStoryTypeCandidates([]);
    setSelectedTypeIndex(0);
    setStoryCards([]);
    setSelectedCardIndex(0);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-semibold text-white">1단계. 나이대와 이야기 아이디어를 입력하세요</h2>
        <p className="mt-2 text-sm text-white/70">
          Streamlit과 동일하게, 대상 연령을 고르고 이야기 아이디어를 간단히 적어주세요. 입력한 내용은 이후 Step 2에서
          전체 줄거리와 주인공 정보를 생성할 때 활용됩니다.
        </p>

        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-white">나이대</label>
          <div className="flex flex-wrap gap-2">
            {AGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setAgeInput(option.value)}
                className={`rounded-full px-4 py-2 text-sm transition-colors ${
                  ageInput === option.value
                    ? "bg-white text-black"
                    : "bg-white/10 text-white/70 hover:bg-white/20"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <label htmlFor="topicInput" className="block text-sm font-medium text-white">
              이야기 아이디어
            </label>
            <p className="text-xs text-white/60">
              예) 꼬마 제이가 동물 친구들과 함께 잃어버린 모자를 찾는 모험 이야기
            </p>
            <textarea
              id="topicInput"
              value={topicInput}
              onChange={(event) => setTopicInput(event.target.value)}
              className="h-28 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white shadow-inner focus:border-sky-400 focus:outline-none"
              placeholder="이야기의 분위기, 주요 인물, 갈등 등을 자유롭게 적어주세요."
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition-opacity hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={submissionState === "saving"}
            >
              다음 단계로 →
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-full border border-white/40 px-5 py-2 text-sm text-white/80 hover:bg-white/10"
            >
              입력 초기화
            </button>
          </div>

          {submissionState === "ready" && (
            <p className="text-sm text-emerald-300">
              입력 내용이 저장되었습니다. Step 2 UI가 준비되면 이어서 진행할 수 있어요.
            </p>
          )}
        </form>
      </section>

    </div>
  );
}
