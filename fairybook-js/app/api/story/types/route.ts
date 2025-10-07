import { NextResponse } from "next/server";
import { loadStoryTypeSummaries } from "@/lib/server/story-assets";

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
  const count = Math.min(Number(countParam) || 8, 8);
  const storyTypes = await loadStoryTypeSummaries();
  const selection = sample(storyTypes, count);
  return NextResponse.json({ storyTypes: selection });
}
