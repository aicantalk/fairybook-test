"use client";

import { useEffect, useState } from "react";
import { useEffect, useMemo, useState } from "react";
import { useWizardStore } from "@/lib/client/wizard-store";
import { STORY_STAGE_SEQUENCE } from "@/lib/shared/story";
import type { StoryCard } from "@/types";

const CARD_COUNT = 4;

export function StepFourCards() {
  const storyCards = useWizardStore((state) => state.storyCards);
  const selectedCardIndex = useWizardStore((state) => state.selectedCardIndex);
  const setStoryCards = useWizardStore((state) => state.setStoryCards);
  const setSelectedCardIndex = useWizardStore((state) => state.setSelectedCardIndex);
  const pendingStages = useWizardStore((state) => state.pendingStages);
  const setError = useWizardStore((state) => state.setError);
  const setStep = useWizardStore((state) => state.setStep);

  const [isLoading, setIsLoading] = useState(false);

  const activeStage = useMemo(() => pendingStages[0] ?? STORY_STAGE_SEQUENCE[0], [pendingStages]);

  const fetchCards = async (stageName: string | undefined) => {
    setIsLoading(true);
    setError(null);
    try {
      const stageParam = stageName ? `&stage=${encodeURIComponent(stageName)}` : "";
      const response = await fetch(`/api/story/cards?count=${CARD_COUNT}${stageParam}`);
      if (!response.ok) {
        throw new Error(`이야기 카드를 불러오지 못했습니다 (${response.status})`);
      }
      const payload = (await response.json()) as { cards?: StoryCard[] };
      setStoryCards(payload.cards ?? []);
      setSelectedCardIndex(0);
    } catch (error) {
      console.error(error);
      setError("이야기 카드를 불러오는 중 문제가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (storyCards.length === 0) {
      void fetchCards(activeStage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStage]);

  const handleNext = () => setStep(5);
  const handleBack = () => setStep(3);

  return (
    <section className="space-y-6 rounded-2xl border border-white/10 bg-white/5 p-6">
      <header className="space-y-2">
        <h2 className="text-xl font-semibold text-white">
          4단계. {activeStage} 스테이지에 사용할 이야기를 골라요
        </h2>
        <p className="text-sm text-white/70">
          Streamlit에서는 매 스테이지마다 4장의 이야기 카드를 제안합니다. 지금은 1단계 (도입) 카드를 선택하는 연습으로,
          Mock 데이터에 기반한 프롬프트를 보여줍니다.
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void fetchCards(activeStage)}
          disabled={isLoading}
          className="rounded-full border border-white/30 px-4 py-2 text-sm text-white/80 hover:bg-white/10 disabled:opacity-40"
        >
          카드 다시 뽑기
        </button>
        <button
          type="button"
          onClick={handleBack}
          className="rounded-full border border-white/30 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
        >
          ← Step 3
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition hover:bg-white/80"
        >
          Step 5로 이동 →
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {storyCards.map((card, index) => {
          const isSelected = index === selectedCardIndex;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => setSelectedCardIndex(index)}
              className={`flex h-full flex-col rounded-xl border p-4 text-left text-sm transition ${
                isSelected
                  ? "border-white bg-white/20 text-white"
                  : "border-white/10 bg-black/30 text-white/70 hover:border-white/30"
              }`}
            >
              <span className="text-base font-semibold text-white">{card.name}</span>
              {card.stage && (
                <span className="mt-2 text-xs text-white/60">단계: {card.stage}</span>
              )}
              {card.mood && (
                <span className="text-[11px] text-white/50">분위기: {card.mood}</span>
              )}
              {card.image && (
                <img
                  src={`/illust/${card.image}`}
                  alt={`${card.name} 대표 이미지`}
                  className="mt-3 h-28 w-full rounded-lg object-cover"
                  loading="lazy"
                />
              )}
              <span className="mt-3 text-xs leading-5 text-white/80">{card.prompt}</span>
            </button>
          );
        })}
        {storyCards.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/20 bg-black/40 p-6 text-center text-sm text-white/60">
            이야기 카드를 불러오는 중입니다…
          </div>
        )}
      </div>

      <p className="rounded-xl border border-white/10 bg-black/40 p-4 text-xs text-white/60">
        실제 구현에서는 스테이지 진행 순서에 따라 카드 리스트가 바뀌고, 선택한 카드는 Step 5에 전달되어 Gemini 프롬프트에
        반영됩니다. 지금은 Mock 데이터를 통해 선택 경험만 제공해요.
      </p>
    </section>
  );
}
