import fs from "node:fs/promises";
import path from "node:path";
import type { IllustrationStyle } from "@/types";

let cachedStyles: IllustrationStyle[] | null = null;

type IllustStylesJson = {
  illust_styles?: Array<{
    name?: string;
    style?: string;
    thumbnail?: string | null;
  }>;
};

export async function loadIllustrationStyles(): Promise<IllustrationStyle[]> {
  if (cachedStyles) {
    return cachedStyles;
  }

  try {
    const filePath = path.resolve(process.cwd(), "../illust_styles.json");
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw) as IllustStylesJson;

    cachedStyles = (parsed.illust_styles ?? [])
      .filter((item) => typeof item === "object" && item !== null)
      .map((item) => ({
        name: (item.name ?? "").trim(),
        style: (item.style ?? "").trim(),
        thumbnailPath: item.thumbnail ?? null,
      }))
      .filter((item) => item.name && item.style);
  } catch (error) {
    console.error("Failed to load illustration styles", error);
    cachedStyles = [];
  }

  return cachedStyles;
}

export function invalidateIllustrationStyleCache() {
  cachedStyles = null;
}

