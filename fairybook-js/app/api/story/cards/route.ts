import { NextResponse } from "next/server";
import { loadStoryCards } from "@/lib/server/story-cards";

function sample<T>(items: T[], size: number): T[] {
  if (items.length <= size) {
    return [...items];
  }
  const copy = [...items];
  const result: T[] = [];
  for (let i = 0; i < size; i += 1) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy[idx]!);
    copy.splice(idx, 1);
  }
  return result;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const countParam = url.searchParams.get("count");
  const stageParam = url.searchParams.get("stage");
  const count = Math.min(Number(countParam) || 4, 4);
  const cards = await loadStoryCards();
  const filtered = stageParam
    ? cards.filter((card) => card.stage === stageParam)
    : cards;
  const pool = filtered.length > 0 ? filtered : cards;
  return NextResponse.json({ cards: sample(pool, count) });
}
