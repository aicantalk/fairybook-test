"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useWizardStore } from "@/lib/client/wizard-store";

export function StepSixRecap() {
  const stages = useWizardStore((state) => state.stages);
  const title = useWizardStore((state) => state.storyTitle);
  const synopsis = useWizardStore((state) => state.synopsisText);
  const protagonist = useWizardStore((state) => state.protagonistText);
  const styleChoice = useWizardStore((state) => state.styleChoiceName);
  const age = useWizardStore((state) => state.ageInput);
  const topic = useWizardStore((state) => state.topicInput);
  const coverImage = useWizardStore((state) => state.coverImageDataUrl);
  const coverImageError = useWizardStore((state) => state.coverImageError);
  const setStep = useWizardStore((state) => state.setStep);
  const setMode = useWizardStore((state) => state.setMode);
  const reset = useWizardStore((state) => state.reset);

  const [exportStatus, setExportStatus] = useState<"idle" | "pending" | "done">("idle");

  const hasStages = stages.length > 0;
  const stageSummary = useMemo(() => stages.map((stage) => stage.stage).join(", "), [stages]);

  const handleBack = () => setStep(5);
  const handleExport = () => {
    setExportStatus("pending");
    window.setTimeout(() => {
      setExportStatus("done");
    }, 350);
  };

  const handleRestart = () => {
    reset();
    setMode("create");
    setStep(1);
  };

  return (
    <section className="space-y-6 rounded-2xl border border-white/10 bg-white/5 p-6">
      <header className="space-y-2">
        <h2 className="text-xl font-semibold text-white">6단계. 이야기를 마무리하고 내보내요</h2>
        <p className="text-sm text-white/70">
          생성된 스테이지와 요약을 다시 살펴본 뒤 내보내기 준비를 할 수 있습니다. 현재는 모의 HTML 번들 상태만 표시하지만,
          실제 연동 시에는 다운로드 링크가 이 영역에 제공됩니다.
        </p>
      </header>

      <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-white/80">
        <p className="text-base font-semibold text-white">동화 요약</p>
        <p className="mt-1 text-sm text-white">{title ?? "제목이 아직 없어요."}</p>
        <p className="mt-2 text-xs text-white/60">대상 연령: {age ?? "(미지정)"}</p>
        <p className="mt-1 text-xs text-white/60">이야기 아이디어: {topic || "(빈칸)"}</p>
        <p className="mt-3 text-sm text-white/70">{synopsis ?? "시놉시스를 Step 2에서 생성한 뒤 다시 확인해 주세요."}</p>
        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
          {coverImage ? (
            <img
              src={coverImage}
              alt="완성된 표지"
              className="w-full rounded-lg border border-white/10 object-cover"
            />
          ) : (
            <p className="text-xs text-white/60">
              {coverImageError ? `표지 이미지 없음: ${coverImageError}` : "표지 이미지를 찾을 수 없습니다."}
            </p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-white/80">
        <p className="text-base font-semibold text-white">주인공 메모</p>
        <p className="mt-1 text-sm text-white/80">{protagonist ?? "주인공 정보가 아직 없습니다."}</p>
        <p className="mt-3 text-xs text-white/60">선택한 스타일: {styleChoice ?? "기본 스타일"}</p>
        <p className="mt-1 text-xs text-white/60">
          스테이지 구성: {hasStages ? stageSummary : "스테이지가 아직 생성되지 않았어요."}
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-100">
        <p className="text-base font-semibold text-emerald-200">생성된 스테이지 미리보기</p>
        {hasStages ? (
          <ul className="space-y-2 text-sm text-white">
            {stages.map((stage) => (
              <li key={stage.card.id} className="rounded-lg border border-white/10 bg-black/30 p-3">
                <p className="text-sm font-semibold text-white">
                  {stage.stage} · {stage.story.title}
                </p>
                <p className="mt-2 text-xs text-white/70">
                  {stage.story.summary ?? "요약이 아직 준비되지 않았어요."}
                </p>
                <p className="mt-2 text-[11px] text-white/50">이미지 스타일: {stage.image?.style ?? "기본"}</p>
                {stage.image?.dataUrl && (
                  <img
                    src={stage.image.dataUrl}
                    alt={`${stage.stage} 삽화`}
                    className="mt-2 w-full rounded-lg border border-white/10 object-cover"
                  />
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-white/80">스테이지가 생성되면 이곳에서 순서를 확인할 수 있어요.</p>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="rounded-full border border-white/40 px-5 py-2 text-sm text-white/80 hover:bg-white/10"
        >
          ← Step 5로 돌아가기
        </button>
        <button
          type="button"
          onClick={handleExport}
          disabled={!hasStages || exportStatus === "pending"}
          className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {exportStatus === "done" ? "모의 HTML 생성 완료" : exportStatus === "pending" ? "내보내기 준비 중…" : "HTML 내보내기 (Mock)"}
        </button>
        <button
          type="button"
          onClick={handleRestart}
          className="rounded-full border border-white/30 px-5 py-2 text-sm text-white/80 hover:bg-white/10"
        >
          새 이야기 시작하기
        </button>
        <Link
          href="/library"
          className="rounded-full border border-white/20 px-4 py-2 text-xs text-white/60 hover:bg-white/10"
        >
          보관함으로 이동
        </Link>
      </div>

      <p className="rounded-xl border border-white/10 bg-black/40 p-4 text-xs text-white/60">
        Phase 3에서 Firestore 저장 및 HTML 번들 생성 로직을 연결하면, 내보내기 버튼이 실제 파일 경로를 반환합니다. 지금은 UI
        확인을 위한 모의 흐름만 제공하고 있어요.
      </p>
    </section>
  );
}
