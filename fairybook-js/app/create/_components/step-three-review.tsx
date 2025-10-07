"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useWizardStore } from "@/lib/client/wizard-store";

const COVER_PLACEHOLDER_STYLE =
  "bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-800 border border-white/10";

export function StepThreeReview() {
  const synopsis = useWizardStore((state) => state.synopsisText);
  const protagonist = useWizardStore((state) => state.protagonistText);
  const title = useWizardStore((state) => state.storyTitle);
  const styleChoice = useWizardStore((state) => state.styleChoiceName);
  const topic = useWizardStore((state) => state.topicInput);
  const age = useWizardStore((state) => state.ageInput);
  const coverReady = useWizardStore((state) => state.coverReady);
  const coverImage = useWizardStore((state) => state.coverImageDataUrl);
  const coverImageError = useWizardStore((state) => state.coverImageError);
  const characterImage = useWizardStore((state) => state.characterImageDataUrl);
  const characterImageError = useWizardStore((state) => state.characterImageError);
  const stages = useWizardStore((state) => state.stages);
  const setStep = useWizardStore((state) => state.setStep);

  const handleBack = () => setStep(2);
  const handleNext = () => setStep(4);

  const hasGeneratedCopy = useMemo(
    () => Boolean(title || synopsis || protagonist || styleChoice),
    [protagonist, styleChoice, synopsis, title],
  );

  return (
    <section className="space-y-6 rounded-2xl border border-white/10 bg-white/5 p-6">
      <header className="space-y-2">
        <h2 className="text-xl font-semibold text-white">3단계. 결과를 확인하고 조정해봐요</h2>
        <p className="text-sm text-white/70">
          Streamlit에서는 제목·시놉시스·주인공·삽화 스타일을 점검한 뒤 다음 단계로 넘어갑니다. 아직 Gemini 연동은 아니지만,
          Step 2에서 저장한 모의 데이터를 기반으로 레이아웃을 미리 확인할 수 있어요.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,320px),1fr]">
        <div className="flex h-full flex-col justify-between rounded-2xl border border-white/10 bg-black/20 p-4 text-white shadow-lg">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-wide text-white/60">Cover Preview</p>
            <h3 className="text-xl font-semibold text-white">
              {title ?? "표지가 아직 준비되지 않았어요"}
            </h3>
            {coverImage ? (
              <img
                src={coverImage}
                alt={title ?? "동화 표지 이미지"}
                className="mt-2 w-full rounded-xl border border-white/10 object-cover"
              />
            ) : (
              <div
                className={`flex min-h-[220px] items-center justify-center rounded-xl text-sm text-white/60 ${COVER_PLACEHOLDER_STYLE}`}
              >
                {coverImageError
                  ? `표지 생성 실패: ${coverImageError}`
                  : "표지 이미지가 아직 없습니다. 잠시 후 다시 시도해 주세요."}
              </div>
            )}
            <p className="text-sm text-white/70">
              {styleChoice
                ? `${styleChoice} 스타일로 생성되었습니다.`
                : "선택된 스타일이 없어요. Step 2에서 스타일을 다시 확인해 주세요."}
            </p>
          </div>
          <div className="rounded-xl border border-white/20 bg-black/30 p-3 text-xs text-white/70">
            {coverReady
              ? "표지 이미지가 저장되었습니다."
              : "표지는 다시 생성하거나 Step 5에서 스테이지를 이어가며 완성할 수 있어요."}
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/80">
          <div className="flex flex-wrap gap-4 text-xs text-white/60">
            <span>대상 연령: {age ?? "(미지정)"}</span>
            <span>선택한 카드 수: {stages.length}</span>
            <span>이야기 아이디어: {topic ? topic : "(빈칸)"}</span>
          </div>

          <div>
            <p className="text-base font-semibold text-white">제목</p>
            <p className="mt-1 text-sm text-white/80">
              {title ?? "제목을 생성하려면 Step 2를 먼저 완료해주세요."}
            </p>
          </div>
          <div>
            <p className="text-base font-semibold text-white">시놉시스</p>
            <p className="mt-1 text-sm text-white/80">{synopsis ?? "아직 시놉시스가 없습니다."}</p>
          </div>
          <div>
            <p className="text-base font-semibold text-white">주인공</p>
            <p className="mt-1 text-sm text-white/80">{protagonist ?? "아직 주인공 정보가 없습니다."}</p>
          </div>
          <div>
            <p className="text-base font-semibold text-white">삽화 스타일</p>
            <p className="mt-1 text-sm text-white/80">{styleChoice ?? "스타일이 설정되지 않았습니다."}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
        <p className="text-sm font-semibold text-white">캐릭터 설정 & 톤 가이드</p>
        <div className="mt-4 grid gap-4 md:grid-cols-[220px,1fr]">
          <div className="rounded-xl border border-white/10 bg-black/20 p-2">
            {characterImage ? (
              <img
                src={characterImage}
                alt="주인공 설정화"
                className="h-full w-full rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-full min-h-[200px] items-center justify-center rounded-lg border border-white/10 text-xs text-white/60">
                {characterImageError
                  ? `설정화 생성 실패: ${characterImageError}`
                  : "설정화 이미지를 찾을 수 없습니다."}
              </div>
            )}
          </div>
          <p className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white/70">
            {hasGeneratedCopy
              ? "Step 5에서 각 스테이지를 생성하면 이 설정을 바탕으로 감정선이 이어집니다."
              : "아직 생성된 데이터가 없어요. Step 2에서 제목 만들기를 완료한 뒤 다시 확인해 주세요."}
          </p>
        </div>
      </div>

      <p className="rounded-xl border border-white/10 bg-black/40 p-4 text-xs text-white/60">
        표지와 캐릭터가 준비되었다면 Step 4로 진행해 각 스테이지 카드를 선택해 주세요. 모든 스테이지를 생성한 뒤 Step 6에서
        이야기를 내보낼 수 있습니다.
      </p>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="rounded-full border border-white/40 px-5 py-2 text-sm text-white/80 hover:bg-white/10"
        >
          ← Step 2로 돌아가기
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition hover:bg-white/80"
        >
          Step 4로 이동 →
        </button>
        <Link
          href="/"
          className="rounded-full border border-white/20 px-4 py-2 text-xs text-white/60 hover:bg-white/10"
        >
          홈으로 이동
        </Link>
      </div>
    </section>
  );
}
