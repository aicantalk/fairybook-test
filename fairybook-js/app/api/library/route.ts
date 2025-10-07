import { NextResponse } from "next/server";
import type { LibraryEntry } from "@/types";

const mockEntries: LibraryEntry[] = [
  {
    id: "storybook-20251005-1",
    title: "달빛에 물든 숲의 약속",
    createdAt: "2025-10-05 11:20",
    authorUid: "sample-user",
    downloadUrl: null,
    stageCount: 5,
  },
  {
    id: "storybook-20250921-1",
    title: "별무리와 장난꾸러기 토끼",
    createdAt: "2025-09-21 09:05",
    authorUid: "sample-user",
    downloadUrl: "https://example.com/storybook-20250921.html",
    stageCount: 6,
  },
];

export async function GET() {
  return NextResponse.json({ entries: mockEntries });
}
