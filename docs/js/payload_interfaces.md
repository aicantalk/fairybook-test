# TypeScript Payload Interfaces

Guides the Next.js implementation when mirroring Streamlit data structures. Update alongside Python changes.

```ts
// Shared timestamp format: ISO8601 strings (UTC).

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
  updatedAt: string; // ISO8601
  updatedAtKst: string; // formatted string for display
  updatedBy: string | null;
  signature: string;
}

export interface StoryCard {
  id: string;
  name: string;
  prompt: string;
  stage?: string;
}

export interface IllustrationStyle {
  name: string;
  style: string;
  thumbnailPath: string | null;
}

export interface StoryStageResult {
  stage: string;
  card: StoryCard;
  story: {
    title: string;
    paragraphs: string[];
    summary: string | null;
  };
  image?: {
    dataUrl: string | null; // base64 when generated inline
    mimeType: string;
    prompt: string;
    style: string | null;
    error?: string | null;
  };
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
  coverImage?: StoryStageResult['image'];
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

export interface WizardState {
  step: number;
  mode: 'home' | 'create' | 'library' | 'board' | 'settings';
  ageInput: string | null;
  topicInput: string;
  selectedTypeIndex: number;
  storyCards: StoryCard[];
  selectedCardIndex: number;
  stages: StoryStageResult[];
  coverReady: boolean;
  isGenerating: boolean;
  error?: string | null;
}
```

> Note: IDs for story cards/styles can reuse the JSON file GUIDs or derive from array indices. Ensure API responses remain stable so client caches stay valid.

## Mapping Notes
- `GenerationTokenStatus` mirrors `services/generation_tokens.GenerationTokenStatus`, converting datetimes to strings.
- `MotdRecord` extends `motd_store.Motd` with preformatted KST timestamp plus the signature used in Streamlit modals.
- `StoryStageResult` matches entries in `st.session_state['stages_data']` with explicit typing for the image payload.
- `StoryBundle` aligns with HTML export records (see `services/story_service.py`).
- `WizardState` encodes the keys set by `ensure_state()` so Zustand stores can hydrate from defaults.

Update this file whenever Python payloads change to keep both stacks in sync.
