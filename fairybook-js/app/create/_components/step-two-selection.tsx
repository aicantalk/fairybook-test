"use client";

import { useEffect, useMemo, useState } from "react";
import { useWizardStore } from "@/lib/client/wizard-store";
import { STORY_STAGE_SEQUENCE } from "@/lib/shared/story";
import type { IllustrationStyle, StoryTypeSummary } from "@/types";

interface GenerationResult {
  title: string;
  synopsis: string;
  protagonist: string;
  style: IllustrationStyle;
  generatedAt: string;
}

const CARD_MAX = 8;

export function StepTwoSelection() {
  const age = useWizardStore((state) => state.ageInput);
  const topic = useWizardStore((state) => state.topicInput);
  const storyTypes = useWizardStore((state) => state.storyTypeCandidates);
  const selectedTypeIndex = useWizardStore((state) => state.selectedTypeIndex);
  const setStoryTypeCandidates = useWizardStore((state) => state.setStoryTypeCandidates);
  const setSelectedTypeIndex = useWizardStore((state) => state.setSelectedTypeIndex);
  const setGenerating = useWizardStore((state) => state.setGenerating);
  const isGenerating = useWizardStore((state) => state.isGenerating);
  const setSynopsisText = useWizardStore((state) => state.setSynopsisText);
  const setProtagonistText = useWizardStore((state) => state.setProtagonistText);
  const setStoryTitle = useWizardStore((state) => state.setStoryTitle);
  const setStyleChoiceName = useWizardStore((state) => state.setStyleChoiceName);
  const setStyleChoice = useWizardStore((state) => state.setStyleChoice);
  const setCoverImage = useWizardStore((state) => state.setCoverImage);
  const setCharacterImage = useWizardStore((state) => state.setCharacterImage);
  const setPendingStages = useWizardStore((state) => state.setPendingStages);
  const setError = useWizardStore((state) => state.setError);
  const setStep = useWizardStore((state) => state.setStep);
  const setStoryCards = useWizardStore((state) => state.setStoryCards);
  const setSelectedCardIndex = useWizardStore((state) => state.setSelectedCardIndex);

  const [isLoading, setIsLoading] = useState(false);
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);

  const selectedType = useMemo<StoryTypeSummary | null>(() => {
    if (storyTypes.length === 0) {
      return null;
    }
    return storyTypes[Math.min(selectedTypeIndex, storyTypes.length - 1)] ?? storyTypes[0] ?? null;
  }, [storyTypes, selectedTypeIndex]);

  const fetchStoryTypes = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/story/types?count=${CARD_MAX}`);
      if (!response.ok) {
        throw new Error(`이야기 유형을 불러오지 못했습니다 (${response.status})`);
      }
      const payload = (await response.json()) as { storyTypes?: StoryTypeSummary[] };
      setStoryTypeCandidates(payload.storyTypes ?? []);
      setSelectedTypeIndex(0);
      setGenerationResult(null);
    } catch (error) {
      console.error(error);
      setError("이야기 유형을 불러오는 중 문제가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (storyTypes.length === 0) {
      void fetchStoryTypes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = async () => {
    if (!selectedType) {
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const response = await fetch("/api/story/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          age,
          topic,
          storyType: selectedType,
        }),
      });
      if (!response.ok) {
        throw new Error(`생성 요청 실패 (${response.status})`);
      }
      const payload = (await response.json()) as GenerationResult;
      setGenerationResult(payload);
      setSynopsisText(payload.synopsis);
      setProtagonistText(payload.protagonist);
      setStoryTitle(payload.title);
      setStyleChoice(payload.style ?? null);
      setStyleChoiceName(payload.style?.name ?? null);
      setCoverImage(null, null, null);
      setCharacterImage(null, null, null);
      setStoryCards([]);
      setSelectedCardIndex(0);
      setPendingStages(STORY_STAGE_SEQUENCE);

      setCoverReady(false);

      try {
        const imageResponse = await fetch("/api/story/images", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: payload.title,
            synopsis: payload.synopsis,
            protagonist: payload.protagonist,
            age,
            topic,
            storyType: selectedType,
            style: payload.style,
          }),
        });
        const imagePayload = (await imageResponse.json().catch(() => ({}))) as {
          character?: { dataUrl?: string | null; prompt?: string | null; error?: string | null };
          cover?: { dataUrl?: string | null; prompt?: string | null; error?: string | null };
          error?: string;
        };

        if (imageResponse.ok) {
          setCharacterImage(
            imagePayload.character?.dataUrl ?? null,
            imagePayload.character?.prompt ?? null,
            imagePayload.character?.error ?? null,
          );
          setCoverImage(
            imagePayload.cover?.dataUrl ?? null,
            imagePayload.cover?.prompt ?? null,
            imagePayload.cover?.error ?? null,
          );
          setCoverReady(Boolean(imagePayload.cover?.dataUrl));
          if (imagePayload.character?.error || imagePayload.cover?.error) {
            setError(imagePayload.cover?.error ?? imagePayload.character?.error ?? null);
          } else {
            setError(null);
          }
        } else {
          const message = imagePayload.error ?? "표지 이미지를 생성하지 못했습니다.";
          setCoverImage(null, null, message);
          setCharacterImage(null, null, message);
          setError(message);
        }
      } catch (imageError) {
        console.error(imageError);
        setCoverImage(null, null, "표지를 생성하지 못했습니다.");
        setCharacterImage(null, null, "캐릭터 설정화를 생성하지 못했습니다.");
        setError("표지나 설정화를 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      }

      setStep(3);
    } catch (error) {
      console.error(error);
      setError("제목과 요약을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <section className="space-y-6 rounded-2xl border border-white/10 bg-white/5 p-6">
      <header className="space-y-2">
        <h2 className="text-xl font-semibold text-white">2단계. 이야기 유형을 고르고 제목을 만들어 봐요</h2>
        <p className="text-sm text-white/70">
          Streamlit에서처럼 8가지 이야기 유형 카드 중 마음에 드는 것을 골라 주세요. “카드 다시 뽑기”로 새로운 조합을 볼 수 있고,
          “✨ 제목 만들기”는 지금은 모의 데이터지만 Step 3 구현에 대비한 결과를 생성합니다.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void fetchStoryTypes()}
          className="rounded-full border border-white/30 px-4 py-2 text-sm text-white/80 hover:bg-white/10 disabled:opacity-40"
          disabled={isLoading}
        >
          카드 다시 뽑기
        </button>
        <button
          type="button"
          onClick={handleGenerate}
       className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition hover:bg-white/80"
        disabled={isLoading || isGenerating}
      >
        ✨ 제목 만들기 (Mock)
      </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {storyTypes.map((item, index) => {
          const isSelected = index === selectedTypeIndex;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedTypeIndex(index)}
              className={`flex h-full flex-col rounded-xl border p-4 text-left text-sm transition ${
                isSelected
                  ? "border-white bg-white/20 text-white"
                  : "border-white/10 bg-black/30 text-white/70 hover:border-white/30"
              }`}
            >
              <span className="text-base font-semibold text-white">{item.name}</span>
              <span className="mt-2 text-xs leading-5">{item.prompt}</span>
              {item.image && (
                <img
                  src={`/illust/${item.image}`}
                  alt={`${item.name} 대표 이미지`}
                  className="mt-3 h-28 w-full rounded-lg object-cover"
                  loading="lazy"
                />
              )}
            </button>
          );
        })}
        {storyTypes.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/20 bg-black/40 p-6 text-sm text-white/60">
            이야기 유형을 불러오는 중입니다…
          </div>
        )}
      </div>

      {selectedType && (
        <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-white/80">
          <p className="text-base font-semibold text-white">선택된 이야기 유형</p>
          <p className="mt-1 text-sm text-white/70">{selectedType.prompt}</p>
          <p className="mt-2 text-xs text-white/50">
            나이대: {age ?? "미지정"} · 주제: {topic ? topic.slice(0, 40) : "(빈칸)"}
          </p>
        </div>
      )}

      {generationResult && (
        <div className="rounded-xl border border-emerald-500/50 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          <p className="text-base font-semibold text-emerald-200">
            ✅ 모의 생성 완료! Step 3 구현 시 아래 결과가 넘겨집니다.
          </p>
          <p className="mt-2 text-sm text-white">제목: {generationResult.title}</p>
          <p className="mt-2 text-sm text-white/80">시놉시스: {generationResult.synopsis}</p>
          <p className="mt-2 text-sm text-white/80">주인공: {generationResult.protagonist}</p>
          <p className="mt-2 text-xs text-emerald-200/80">
            삽화 스타일: {generationResult.style?.name ?? "(미선택)"}
          </p>
        </div>
      )}
    </section>
  );
}
