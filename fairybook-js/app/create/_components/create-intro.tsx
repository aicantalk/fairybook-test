"use client";

import type { GenerationTokenStatus } from "@/types";
import { useWizardStore } from "@/lib/client/wizard-store";

interface CreateIntroProps {
  tokenStatus: GenerationTokenStatus | null;
}

export function CreateIntro({ tokenStatus }: CreateIntroProps) {
  const setStep = useWizardStore((state) => state.setStep);
  const setMode = useWizardStore((state) => state.setMode);
  const tokens = tokenStatus?.tokens ?? null;
  const canStart = tokens === null || tokens > 0;

  const handleStart = () => {
    if (!canStart) {
      return;
    }
    setMode("create");
    setStep(1);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#1f2a4b] to-[#0c1530] p-6">
      <h1 className="text-2xl font-semibold text-white">1단계. 여정을 준비해요</h1>
      <p className="mt-2 text-sm text-white/70">
        Streamlit 앱과 동일하게, 먼저 생성 토큰이 남아 있는지 확인하고 이야기를 만들 준비를 해요. 토큰이 0개면 새로운
        동화를 만들 수 없으니 토큰이 회복될 때까지 기다려 주세요.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-white/80">
          <p className="text-sm font-semibold text-white">생성 토큰 현황</p>
          {tokenStatus ? (
            <ul className="mt-2 space-y-1">
              <li>
                잔여 토큰: <span className="font-semibold text-white">{tokenStatus.tokens}</span> / {tokenStatus.autoCap}
              </li>
              {tokenStatus.lastRefillAt && <li>마지막 리필: {tokenStatus.lastRefillAt}</li>}
              {tokenStatus.lastConsumedAt && <li>최근 사용: {tokenStatus.lastConsumedAt}</li>}
            </ul>
          ) : (
            <p className="mt-2 text-white/60">로그인 전이라면 토큰 정보를 불러오지 못할 수 있습니다.</p>
          )}
        </div>
        <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-white/80">
          <p className="text-sm font-semibold text-white">주의</p>
          <p className="mt-2 text-white/70">
            Next.js 버전은 아직 개발 중이라 생성 버튼을 눌러도 Step 2 (전체 프롬프트 생성)는 연결되어 있지 않습니다. 그러나
            입력한 값은 전역 상태에 저장되므로 추후 단계 구현 시 그대로 이어집니다.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleStart}
        disabled={!canStart}
        className={`mt-4 inline-flex items-center rounded-full px-5 py-2 text-sm font-medium transition-colors ${
          canStart
            ? "bg-white text-black hover:bg-white/80"
            : "cursor-not-allowed border border-white/20 bg-transparent text-white/40"
        }`}
      >
        {canStart ? "동화 만들기 시작하기" : "토큰이 없어 시작할 수 없어요"}
      </button>
    </div>
  );
}
