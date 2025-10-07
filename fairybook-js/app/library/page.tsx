import Link from "next/link";
import type { LibraryEntry } from "@/types";
import { getServerBaseUrl } from "@/lib/server/env";

async function fetchLibrary(): Promise<LibraryEntry[]> {
  const baseUrl = getServerBaseUrl();
  try {
    const response = await fetch(`${baseUrl}/api/library`, { cache: "no-store" });
    if (!response.ok) {
      return [];
    }
    const payload = (await response.json()) as { entries?: LibraryEntry[] };
    return payload.entries ?? [];
  } catch (error) {
    console.error("Failed to fetch library entries", error);
    return [];
  }
}

export const metadata = {
  title: "동화책 읽기 · Fairybook Next.js",
};

export default async function LibraryPage() {
  const entries = await fetchLibrary();

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">동화책 보관함</h1>
        <p className="text-sm text-white/70">
          Streamlit 버전에서 저장한 HTML 번들을 불러오는 API를 구현할 예정입니다. 현재는 목업 데이터로 목록을 구성하고 있어요.
        </p>
      </header>

      <section className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/70">
        <p className="text-sm font-semibold text-white">필터 & 정렬 (Mock)</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-full border border-white/30 px-3 py-1 text-xs text-white/80 hover:bg-white/10"
          >
            최근 저장 순
          </button>
          <button
            type="button"
            className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/60 hover:bg-white/10"
          >
            오래된 순
          </button>
          <button
            type="button"
            className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/60 hover:bg-white/10"
          >
            토큰 사용량 높은 순
          </button>
          <button
            type="button"
            className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/60 hover:bg-white/10"
          >
            북마크만 보기
          </button>
        </div>
        <p className="mt-3 text-xs text-white/50">
          Phase 3에서 Firestore 연동을 마치면 버튼이 실제 정렬/필터 옵션으로 동작하며, 다음과 같은 상태를 유지할 계획입니다.
        </p>
      </section>

      <ul className="space-y-3">
        {entries.map((entry) => (
          <li
            key={entry.id}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80"
          >
            <p className="text-base font-medium text-white">{entry.title}</p>
            <p className="text-xs text-white/60">생성일: {entry.createdAt}</p>
            <p className="text-xs text-white/60">단계 수: {entry.stageCount}</p>
            {entry.downloadUrl ? (
              <Link
                href={entry.downloadUrl}
                className="mt-2 inline-flex text-xs text-sky-300 hover:underline"
              >
                HTML 번들 내려받기
              </Link>
            ) : (
              <span className="mt-2 inline-flex text-xs text-white/40">다운로드 URL 준비 중</span>
            )}
          </li>
        ))}
        {entries.length === 0 && (
          <li className="rounded-xl border border-dashed border-white/20 bg-black/40 px-4 py-6 text-center text-sm text-white/50">
            아직 저장된 동화가 없습니다. Phase 3에서 Firestore/GCS 연동을 구현할 예정입니다.
          </li>
        )}
      </ul>
    </section>
  );
}
