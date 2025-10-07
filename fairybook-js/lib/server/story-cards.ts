import fs from "node:fs/promises";
import path from "node:path";
import type { StoryCard } from "@/types";

let cachedStoryCards: StoryCard[] | null = null;

type StoryCardsJson = {
  cards?: Array<{
    id?: number | string;
    name?: string;
    prompt?: string;
    stage?: string;
    mood?: string;
  }>;
};

export async function loadStoryCards(): Promise<StoryCard[]> {
  if (cachedStoryCards) {
    return cachedStoryCards;
  }

  try {
    const filePath = path.resolve(process.cwd(), "../story.json");
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw) as StoryCardsJson;
    cachedStoryCards = (parsed.cards ?? []).map((card) => ({
      id: String(card.id ?? "card"),
      name: card.name ?? "이야기 카드",
      prompt: card.prompt ?? "",
      stage: card.stage,
      mood: card.mood,
      image: card.illust ?? null,
    }));
  } catch (error) {
    console.error("Failed to load story cards", error);
    cachedStoryCards = [];
  }

  return cachedStoryCards;
}

export function invalidateStoryCardCache() {
  cachedStoryCards = null;
}
