export const metadata = {
  title: "모임 게시판 · Fairybook Next.js",
};

export default function BoardPage() {
  const mockMessages = [
    {
      id: "draft-1",
      author: "모험가 지니",
      body: "오늘 만든 동화는 밤하늘이 정말 멋졌어요. Step 5가 실제로 연결되면 같이 테스트해봐요!",
      createdAt: "2025-10-05 21:40",
    },
    {
      id: "draft-2",
      author: "포팅팀",
      body: "Phase 2 UI 작업이 거의 끝났습니다. 남은 건 Gemini 프록시 붙이기!",
      createdAt: "2025-10-06 10:12",
    },
  ];

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">모임 게시판 (Sandbox)</h1>
        <p className="text-sm text-white/70">
          커뮤니티 보드는 Streamlit에서도 실험 기능입니다. Next.js 버전 역시 별도의 Firestore 컬렉션을 사용하여 독립적으로 관리할 예정입니다.
        </p>
      </header>
      <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-6 text-sm text-white/70">
        메시지 컬렉션, 작성 폼, 실시간 업데이트 등은 Phase 3 이후 작업으로 남겨두었습니다. 아래 목업 메시지는 UI 흐름만
        검증하기 위한 예시입니다.
      </div>

      <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-4">
        <p className="text-sm font-semibold text-white">게시판 목업 메시지</p>
        <ul className="space-y-3">
          {mockMessages.map((message) => (
            <li key={message.id} className="rounded-xl border border-white/10 bg-black/40 p-4 text-sm text-white/80">
              <p className="text-sm font-semibold text-white">{message.author}</p>
              <p className="mt-2 text-sm text-white/70">{message.body}</p>
              <p className="mt-2 text-xs text-white/50">작성일: {message.createdAt}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/70">
        <p className="text-sm font-semibold text-white">글 남기기 (Mock)</p>
        <p className="mt-2 text-xs text-white/60">
          Phase 3에서 Firestore 연동을 마치면 여기에서 제목과 내용을 입력하고 게시할 수 있게 됩니다.
        </p>
        <form className="mt-3 space-y-2" aria-label="게시판 목업 폼">
          <input
            type="text"
            placeholder="닉네임"
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white/80"
            disabled
          />
          <textarea
            rows={3}
            placeholder="오늘의 테스트 메모를 적어주세요."
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white/80"
            disabled
          />
          <button
            type="button"
            disabled
            className="inline-flex items-center rounded-full border border-white/30 px-4 py-1 text-xs text-white/60"
          >
            게시하기 (준비 중)
          </button>
        </form>
      </div>
    </section>
  );
}
