import fs from "node:fs/promises";
import path from "node:path";
import type { StoryTypeSummary } from "@/types";

let cachedStoryTypes: StoryTypeSummary[] | null = null;

async function readJsonFile<T>(relativePath: string): Promise<T | null> {
  try {
    const filePath = path.resolve(process.cwd(), relativePath);
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error(`Failed to read JSON file at ${relativePath}`, error);
    return null;
  }
}

type StoryTypeJson = {
  story_types?: Array<{
    id?: number | string;
    name?: string;
    prompt?: string;
    illust?: string;
  }>;
};

export async function loadStoryTypeSummaries(): Promise<StoryTypeSummary[]> {
  if (cachedStoryTypes) {
    return cachedStoryTypes;
  }

  const data = await readJsonFile<StoryTypeJson>("../storytype.json");
  if (!data?.story_types) {
    cachedStoryTypes = [];
    return cachedStoryTypes;
  }

  cachedStoryTypes = data.story_types
    .filter((entry) => typeof entry === "object" && entry !== null)
    .map((entry) => ({
      id: entry.id ?? "unknown",
      name: entry.name ?? "이야기 유형",
      prompt: entry.prompt ?? "",
      image: entry.illust ?? null,
    }));

  return cachedStoryTypes;
}

export function invalidateStoryTypeCache() {
  cachedStoryTypes = null;
}
