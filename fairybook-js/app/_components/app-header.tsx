"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useWizardStore } from "@/lib/client/wizard-store";
import type { WizardMode } from "@/types";

const NAV_LINKS: Array<{ href: string; label: string; mode: WizardMode }> = [
  { href: "/", label: "홈", mode: "home" },
  { href: "/create", label: "동화 만들기", mode: "create" },
  { href: "/library", label: "동화책 읽기", mode: "library" },
  { href: "/board", label: "모임 게시판", mode: "board" },
  { href: "/settings", label: "계정 설정", mode: "settings" },
];

function deriveModeFromPath(pathname: string): WizardMode {
  if (pathname.startsWith("/create")) return "create";
  if (pathname.startsWith("/library")) return "library";
  if (pathname.startsWith("/board")) return "board";
  if (pathname.startsWith("/settings")) return "settings";
  return "home";
}

export function AppHeader() {
  const pathname = usePathname();
  const mode = useWizardStore((state) => state.mode);
  const setMode = useWizardStore((state) => state.setMode);

  useEffect(() => {
    const inferredMode = deriveModeFromPath(pathname);
    if (mode !== inferredMode) {
      setMode(inferredMode);
    }
  }, [pathname, mode, setMode]);

  return (
    <header className="border-b border-white/10 bg-black/70 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/" className="text-lg font-semibold text-white">
            📖 Fairybook Companion
          </Link>
          <p className="text-xs text-white/60">
            스트림릿 경험을 Next.js로 옮기는 실험 버전
          </p>
        </div>
        <nav className="flex flex-wrap items-center gap-2">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3 py-1 text-sm transition-colors ${
                  isActive ? "bg-white text-black" : "text-white/70 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
