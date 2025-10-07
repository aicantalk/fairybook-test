import type { ReactNode } from "react";
import { AppHeader } from "./app-header";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[#0b1120] text-white">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-8">
        {children}
      </main>
      <footer className="mt-auto border-t border-white/10 bg-black/70 py-4 text-center text-xs text-white/50">
        Fairybook Next.js 실험판 · Gemini API는 서버 API 라우트로 프록시 예정
      </footer>
    </div>
  );
}
