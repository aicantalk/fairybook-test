export const metadata = {
  title: "계정 설정 · Fairybook Next.js",
};

export default function SettingsPage() {
  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold text-white">계정 설정</h1>
        <p className="text-sm text-white/70">
          Firebase 인증과 사용자 메타데이터 관리 UI는 Phase 3에서 구현합니다. 지금은 레이아웃과 네비게이션 동작을 검증하는 단계입니다.
        </p>
      </header>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
        로그인한 사용자 정보를 불러오면 이 영역에서 이름, 이메일, 토큰 상태 등을 확인하고 비밀번호 재설정을 요청할 수 있어요.
      </div>
    </section>
  );
}
