"use client";

import { useEffect, useMemo, useState } from "react";
import { useWizardStore } from "@/lib/client/wizard-store";
import { STORY_STAGE_SEQUENCE } from "@/lib/shared/story";
import type { StoryCard, StoryStageResult, StoryTypeSummary } from "@/types";

function resolveStageIndex(stageName: string | undefined | null): number {
  const order = ["발단", "전개", "위기", "절정", "결말"];
  const index = stageName ? order.indexOf(stageName) : -1;
  return index >= 0 ? index : 0;
}

function getSelectedStoryType(
  types: StoryTypeSummary[],
  selectedIndex: number,
): StoryTypeSummary | null {
  if (types.length === 0) {
    return null;
  }
  return types[Math.min(selectedIndex, types.length - 1)] ?? types[0] ?? null;
}

export function StepFiveGeneration() {
  const storyCards = useWizardStore((state) => state.storyCards);
  const selectedCardIndex = useWizardStore((state) => state.selectedCardIndex);
  const stages = useWizardStore((state) => state.stages);
  const styleChoice = useWizardStore((state) => state.styleChoice);
  const styleChoiceName = useWizardStore((state) => state.styleChoiceName);
  const isGenerating = useWizardStore((state) => state.isGenerating);
  const setGenerating = useWizardStore((state) => state.setGenerating);
  const upsertStage = useWizardStore((state) => state.upsertStage);
  const setCoverReady = useWizardStore((state) => state.setCoverReady);
  const setStep = useWizardStore((state) => state.setStep);
  const setError = useWizardStore((state) => state.setError);
  const setStoryCards = useWizardStore((state) => state.setStoryCards);
  const pendingStages = useWizardStore((state) => state.pendingStages);
  const advanceStage = useWizardStore((state) => state.advanceStage);
  const ageInput = useWizardStore((state) => state.ageInput);
  const topicInput = useWizardStore((state) => state.topicInput);
  const storyTypeCandidates = useWizardStore((state) => state.storyTypeCandidates);
  const selectedTypeIndex = useWizardStore((state) => state.selectedTypeIndex);
  const synopsisText = useWizardStore((state) => state.synopsisText);
  const protagonistText = useWizardStore((state) => state.protagonistText);
  const storyTitle = useWizardStore((state) => state.storyTitle);
  const characterImageDataUrl = useWizardStore((state) => state.characterImageDataUrl);

  const [status, setStatus] = useState<"idle" | "pending" | "done">("idle");
  const styleLabel = styleChoiceName ?? "기본 스타일";
  const currentStage = pendingStages[0] ?? null;
  const totalStages = STORY_STAGE_SEQUENCE.length;
  const completedStages = totalStages - pendingStages.length;
  const stageCounter = Math.min(completedStages + 1, totalStages);

  useEffect(() => {
    if (!currentStage && pendingStages.length === 0 && stages.length > 0) {
      setStep(6);
    }
  }, [currentStage, pendingStages.length, setStep, stages.length]);

  const selectedCard = useMemo<StoryCard | null>(() => {
    if (storyCards.length === 0) {
      return null;
    }
    return storyCards[selectedCardIndex] ?? storyCards[0] ?? null;
  }, [selectedCardIndex, storyCards]);

  const existingStage = useMemo(() => {
    if (!currentStage) {
      return null;
    }
    return stages.find((item) => item.stage === currentStage) ?? null;
  }, [currentStage, stages]);

  const handleBack = () => setStep(4);

  const handleGenerate = () => {
    if (!currentStage) {
      setError("생성할 단계가 없습니다. 생성 흐름을 다시 시작해 주세요.");
      return;
    }
    if (!selectedCard) {
      setError("선택된 카드가 없어 스테이지를 생성할 수 없습니다.");
      return;
    }
    if (!storyTitle) {
      setError("동화 제목이 준비되지 않았습니다. Step 2를 먼저 완료해 주세요.");
      return;
    }
    setError(null);
    setStatus("pending");
    setGenerating(true);

    const storyType = getSelectedStoryType(storyTypeCandidates, selectedTypeIndex);
    const stageName = currentStage;
    const stageIndex = resolveStageIndex(stageName);
    const previousSections = stages
      .filter((item) => item.card.id !== selectedCard.id)
      .map((item) => ({
        stage: item.stage,
        card_name: item.card.name,
        paragraphs: item.story.paragraphs,
      }));

    const characterPayload = (() => {
      if (!characterImageDataUrl) {
        return { base64: null, mimeType: null };
      }
      const [header, data] = characterImageDataUrl.split(",");
      const mime = header?.startsWith("data:") ? header.split(";")[0]?.replace("data:", "") : null;
      return { base64: data ?? null, mimeType: mime };
    })();

    fetch("/api/story/stage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        age: ageInput,
        topic: topicInput,
        title: storyTitle,
        storyType: storyType
          ? { name: storyType.name, prompt: storyType.prompt }
          : null,
        stage: {
          name: stageName,
          index: stageIndex,
          total: 5,
        },
        storyCard: selectedCard,
        previousSections,
        synopsis: synopsisText,
        protagonist: protagonistText,
        style: styleChoice
          ? { name: styleChoice.name, style: styleChoice.style }
          : null,
        characterImage: characterPayload.base64,
        characterImageMimeType: characterPayload.mimeType,
      }),
    })
      .then(async (response) => {
        if (!response.ok) {
          const errorPayload = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(
            errorPayload?.error ?? `스테이지 생성 실패 (${response.status})`,
          );
        }
        return response.json() as Promise<{ stage: StoryStageResult }>;
      })
      .then((payload) => {
        const stage = payload.stage;
        upsertStage(stage);
        setCoverReady(true);
        setStatus("done");
        const remainingCount = Math.max(pendingStages.length - 1, 0);
        advanceStage();
        if (remainingCount > 0) {
          setStoryCards([]);
          setSelectedCardIndex(0);
          setError(null);
          setStep(4);
        } else {
          setStep(6);
        }
      })
      .catch((error) => {
        console.error(error);
        setError(
          error instanceof Error
            ? error.message
            : "스테이지를 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        );
        setStatus("idle");
      })
      .finally(() => {
        setGenerating(false);
      });
  };

  return (
    <section className="space-y-6 rounded-2xl border border-white/10 bg-white/5 p-6">
      <header className="space-y-2">
        <h2 className="text-xl font-semibold text-white">
          5단계. {currentStage ?? "모든"} 스테이지를 생성하고 검토해요 ({stageCounter}/{totalStages})
        </h2>
        <p className="text-sm text-white/70">
          선택한 이야기 카드와 스타일을 바탕으로 한 스테이지를 미리 체험해 볼 수 있는 자리예요. 지금은 모의 데이터를 보여주지만,
          실제 연동 시에는 Gemini 응답을 표시하고 재시도 버튼으로 흐름을 이어갑니다.
        </p>
      </header>

      <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-white">
        {selectedCard ? (
          <>
            <p className="text-base font-semibold text-white">선택된 카드</p>
            <p className="mt-1 text-sm text-white/80">{selectedCard.name}</p>
            {selectedCard.prompt && (
              <p className="mt-2 text-xs text-white/60">프롬프트: {selectedCard.prompt}</p>
            )}
            <p className="mt-3 text-xs text-white/50">
              이 카드를 기반으로 한 스테이지가 생성되며, 선택된 스타일({styleLabel})이 일러스트 묘사에도 반영됩니다.
            </p>
          </>
        ) : (
          <p className="text-sm text-white/70">
            아직 선택된 카드가 없어요. Step 4로 돌아가 마음에 드는 카드를 먼저 선택해 주세요.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="rounded-full border border-white/40 px-5 py-2 text-sm text-white/80 hover:bg-white/10"
        >
          ← Step 4로 돌아가기
        </button>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!selectedCard || isGenerating}
          className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isGenerating ? "생성 중…" : existingStage ? "스테이지 다시 만들기" : "✨ 스테이지 만들기"}
        </button>
      </div>

      <div className="space-y-3 rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-white/80">
        <p className="text-sm font-semibold text-white">생성 로그</p>
        <ul className="space-y-2 text-xs text-white/60">
          <li>상태: {status === "idle" ? "대기 중" : status === "pending" ? "생성 중" : "생성 완료"}</li>
          <li>생성된 스테이지 수: {stages.length}</li>
          <li>
          일러스트 스타일: <span className="text-white/80">{styleLabel}</span>
        </li>
        <li>
          생성 진행: {completedStages}/{totalStages}
        </li>
      </ul>
    </div>

    {existingStage && (
      <div className="space-y-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          <p className="text-base font-semibold text-emerald-200">모의 스테이지 결과</p>
          <p className="text-sm text-white">{existingStage.story.title}</p>
          <ul className="space-y-2 text-sm text-white/80">
            {existingStage.story.paragraphs.map((paragraph, index) => (
              <li key={index}>• {paragraph}</li>
            ))}
          </ul>
          {existingStage.image?.dataUrl && (
            <img
              src={existingStage.image.dataUrl}
              alt={`${existingStage.stage} 일러스트`}
              className="rounded-lg border border-white/10"
            />
          )}
          <p className="text-xs text-emerald-200/70">Step 6에서 전체 요약과 함께 다시 확인할 수 있어요.</p>
        </div>
      )}
    </section>
  );
}
