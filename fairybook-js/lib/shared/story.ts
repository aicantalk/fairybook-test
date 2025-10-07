export const STORY_STAGE_SEQUENCE = ["발단", "전개", "위기", "절정", "결말"] as const;

export type StoryStageName = (typeof STORY_STAGE_SEQUENCE)[number];
