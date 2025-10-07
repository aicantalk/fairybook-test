import { create } from "zustand";
import { STORY_STAGE_SEQUENCE, type StoryStageName } from "@/lib/shared/story";
import type {
  IllustrationStyle,
  StoryCard,
  StoryStageResult,
  StoryTypeSummary,
  WizardMode,
  WizardState,
} from "@/types";

const initialState: WizardState = {
  step: 0,
  mode: "home",
  ageInput: null,
  topicInput: "",
  selectedTypeIndex: 0,
  storyTypeCandidates: [],
  storyCards: [],
  selectedCardIndex: 0,
  stages: [],
  coverReady: false,
  isGenerating: false,
  synopsisText: null,
  protagonistText: null,
  storyTitle: null,
  styleChoiceName: null,
  styleChoice: null,
  coverImageDataUrl: null,
  coverImageError: null,
  coverPrompt: null,
  characterImageDataUrl: null,
  characterImageError: null,
  characterPrompt: null,
  pendingStages: [...STORY_STAGE_SEQUENCE],
  error: null,
};

interface WizardStore extends WizardState {
  setMode: (mode: WizardMode) => void;
  setStep: (step: number) => void;
  setAgeInput: (value: string | null) => void;
  setTopicInput: (value: string) => void;
  setStoryTypeCandidates: (types: StoryTypeSummary[]) => void;
  setStoryCards: (cards: StoryCard[]) => void;
  setSelectedCardIndex: (index: number) => void;
  setSelectedTypeIndex: (index: number) => void;
  setStages: (stages: StoryStageResult[]) => void;
  pushStage: (stage: StoryStageResult) => void;
  upsertStage: (stage: StoryStageResult) => void;
  setCoverReady: (ready: boolean) => void;
  setGenerating: (active: boolean) => void;
  setError: (message: string | null) => void;
  setSynopsisText: (value: string | null) => void;
  setProtagonistText: (value: string | null) => void;
  setStoryTitle: (value: string | null) => void;
  setStyleChoiceName: (value: string | null) => void;
  setStyleChoice: (value: IllustrationStyle | null) => void;
  setCoverImage: (dataUrl: string | null, prompt?: string | null, error?: string | null) => void;
  setCharacterImage: (dataUrl: string | null, prompt?: string | null, error?: string | null) => void;
  setPendingStages: (stages: StoryStageName[]) => void;
  advanceStage: () => void;
  reset: () => void;
}

export const useWizardStore = create<WizardStore>((set, get) => ({
  ...initialState,
  setMode: (mode) => set({ mode }),
  setStep: (step) => set({ step }),
  setAgeInput: (value) => set({ ageInput: value }),
  setTopicInput: (value) => set({ topicInput: value }),
  setStoryTypeCandidates: (types) => set({ storyTypeCandidates: types }),
  setStoryCards: (cards) => set({ storyCards: cards }),
  setSelectedCardIndex: (index) => set({ selectedCardIndex: index }),
  setSelectedTypeIndex: (index) => set({ selectedTypeIndex: index }),
  setStages: (stages) => set({ stages }),
  pushStage: (stage) => set({ stages: [...get().stages, stage] }),
  upsertStage: (stage) =>
    set(({ stages }) => ({
      stages: [...stages.filter((item) => item.stage !== stage.stage), stage],
    })),
  setCoverReady: (ready) => set({ coverReady: ready }),
  setGenerating: (active) => set({ isGenerating: active }),
  setError: (message) => set({ error: message }),
  setSynopsisText: (value) => set({ synopsisText: value }),
  setProtagonistText: (value) => set({ protagonistText: value }),
  setStoryTitle: (value) => set({ storyTitle: value }),
  setStyleChoiceName: (value) => set({ styleChoiceName: value }),
  setStyleChoice: (value) =>
    set({ styleChoice: value, styleChoiceName: value?.name ?? null }),
  setCoverImage: (dataUrl, prompt, error) =>
    set({ coverImageDataUrl: dataUrl, coverPrompt: prompt ?? null, coverImageError: error ?? null }),
  setCharacterImage: (dataUrl, prompt, error) =>
    set({
      characterImageDataUrl: dataUrl,
      characterPrompt: prompt ?? null,
      characterImageError: error ?? null,
    }),
  setPendingStages: (stages) => set({ pendingStages: [...stages] }),
  advanceStage: () =>
    set(({ pendingStages }) => ({
      pendingStages: pendingStages.length > 0 ? pendingStages.slice(1) : [],
    })),
  reset: () => set({ ...initialState, pendingStages: [...STORY_STAGE_SEQUENCE] }),
}));

export const resetWizardStore = () => {
  useWizardStore.getState().reset();
};
