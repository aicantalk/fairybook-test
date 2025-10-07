import Link from "next/link";
import type { GenerationTokenStatus, MotdRecord } from "@/types";
import { getServerBaseUrl } from "@/lib/server/env";

async function fetchMotd(): Promise<MotdRecord | null> {
  const baseUrl = getServerBaseUrl();
  try {
    const response = await fetch(`${baseUrl}/api/motd`, {
      cache: "no-store",
    });
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as { motd?: MotdRecord | null };
    return payload.motd ?? null;
  } catch (error) {
    console.error("Failed to fetch MOTD", error);
    return null;
  }
}

async function fetchTokenStatus(): Promise<GenerationTokenStatus | null> {
  const baseUrl = getServerBaseUrl();
  try {
    const response = await fetch(`${baseUrl}/api/tokens`, {
      cache: "no-store",
    });
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as { status?: GenerationTokenStatus | null };
    return payload.status ?? null;
  } catch (error) {
    console.error("Failed to fetch token status", error);
    return null;
  }
}

export default async function HomePage() {
  const [motd, tokenStatus] = await Promise.all([fetchMotd(), fetchTokenStatus()]);
  const createDisabled = tokenStatus !== null && tokenStatus.tokens <= 0;

  return (
    <section className="flex flex-col gap-6">
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#192039] to-[#0f172a] p-6">
        <h1 className="text-2xl font-semibold text-white">안녕하세요! Fairybook Next.js 실험판입니다.</h1>
        <p className="mt-2 text-sm text-white/70">
          현재 화면은 Streamlit 버전을 웹 네이티브 스택으로 옮기기 위한 준비 단계입니다. 아래 버튼을 눌러 각
          단계별 페이지를 미리 살펴볼 수 있어요.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {createDisabled ? (
            <button
              type="button"
              disabled
              className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white/40"
            >
              ✨ 동화 만들기 (토큰 부족)
            </button>
          ) : (
            <Link href="/create" className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black">
              ✨ 동화 만들기 시작하기
            </Link>
          )}
          <Link
            href="/library"
            className="rounded-full border border-white/40 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
          >
            📚 저장된 동화 보기
          </Link>
        </div>
      </div>

      {motd && (
        <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-4">
          <p className="text-sm font-medium text-amber-200">공지사항</p>
          <p className="mt-1 text-sm text-amber-100" dangerouslySetInnerHTML={{ __html: motd.message }} />
          <p className="mt-2 text-xs text-amber-200/80">
            업데이트: {motd.updatedAtKst} {motd.updatedBy ? `· 작성자: ${motd.updatedBy}` : ""}
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-base font-semibold text-white">생성 토큰</h2>
          {tokenStatus ? (
            <ul className="mt-2 space-y-1 text-sm text-white/70">
              <li>
                잔여 토큰: <span className="font-semibold text-white">{tokenStatus.tokens}</span> / {tokenStatus.autoCap}
              </li>
              {tokenStatus.lastRefillAt && <li>마지막 리필: {tokenStatus.lastRefillAt}</li>}
              {tokenStatus.lastConsumedAt && <li>최근 사용: {tokenStatus.lastConsumedAt}</li>}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-white/60">아직 토큰 정보를 불러오지 않았어요.</p>
          )}
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-base font-semibold text-white">포팅 진행 상황</h2>
          <p className="mt-2 text-sm text-white/70">
            Phase 1은 베이스 라우팅과 Mock API 구축에 집중합니다. Phase 2에서 실제 사용자 플로우를 재현하고,
            Phase 3 이후에 Gemini 및 Firestore 통합을 연결할 예정입니다.
          </p>
        </div>
      </div>
    </section>
  );
}
