import { STORY_STAGE_SEQUENCE } from "@/lib/shared/story";

export type StoryStageName = (typeof STORY_STAGE_SEQUENCE)[number];

export interface GenerationTokenStatus {
  tokens: number;
  autoCap: number;
  createdAt: string | null;
  updatedAt: string | null;
  lastLoginAt: string | null;
  lastRefillAt: string | null;
  lastConsumedAt: string | null;
  lastConsumedSignature: string | null;
}

export interface MotdRecord {
  message: string;
  isActive: boolean;
  updatedAt: string;
  updatedAtKst: string;
  updatedBy: string | null;
  signature: string;
}

export interface StoryCard {
  id: string;
  name: string;
  prompt: string;
  stage?: string;
  mood?: string;
  image?: string | null;
}

export interface IllustrationStyle {
  name: string;
  style: string;
  thumbnailPath: string | null;
}

export interface StoryTypeSummary {
  id: number | string;
  name: string;
  prompt: string;
  image?: string | null;
}

export interface StoryImage {
  dataUrl: string | null;
  mimeType: string;
  prompt: string;
  style: string | null;
  error?: string | null;
}

export interface StoryStageResult {
  stage: string;
  card: StoryCard;
  story: {
    title: string;
    paragraphs: string[];
    summary: string | null;
  };
  image?: StoryImage;
  generatedAt: string;
}

export interface StoryBundle {
  id: string;
  title: string;
  ageBand: string;
  topic: string | null;
  synopsis: string;
  protagonist: string;
  stages: StoryStageResult[];
  coverImage?: StoryImage;
  styleChoice?: IllustrationStyle | null;
}

export interface LibraryEntry {
  id: string;
  title: string;
  createdAt: string;
  authorUid: string | null;
  downloadUrl: string | null;
  stageCount: number;
}

export type WizardMode = "home" | "create" | "library" | "board" | "settings";

export interface WizardState {
  step: number;
  mode: WizardMode;
  ageInput: string | null;
  topicInput: string;
  selectedTypeIndex: number;
  storyCards: StoryCard[];
  selectedCardIndex: number;
  storyTypeCandidates: StoryTypeSummary[];
  stages: StoryStageResult[];
  coverReady: boolean;
  isGenerating: boolean;
  error?: string | null;
  synopsisText: string | null;
  protagonistText: string | null;
  storyTitle: string | null;
  styleChoiceName: string | null;
  styleChoice?: IllustrationStyle | null;
  coverImageDataUrl: string | null;
  coverImageError: string | null;
  coverPrompt: string | null;
  characterImageDataUrl: string | null;
  characterImageError: string | null;
  characterPrompt: string | null;
  pendingStages: StoryStageName[];
}
