# Next.js Port Architecture Decisions

_Last updated: 2025-10-06_

## 1. State Management
- **Choice**: Zustand store + React context wrapper.
- **Why**: Small API surface, avoids prop drilling, easy to hydrate with server data, supports persisted slices (for wizard progress) without Redux boilerplate.
- **Usage**: A single `useStoryWizardStore` slice storing steps, form inputs, stage results; context provider sits in `app/layout.tsx`.

## 2. Authentication Flow
- **Choice**: Firebase Web SDK on the client for sign-in / sign-up, with Next.js middleware to guard protected routes.
- **Token Handling**: Client obtains ID token, passes it to API routes via headers; API routes verify with Firebase Admin SDK (using shared service account credentials).
- **Redirects**: Store intended path in query (`?next=/create`) similar to `auth_next_action`; middleware checks and reroutes to `/login` when unauthenticated.

## 3. API Routing Strategy
- **Structure**: App Router endpoints under `app/api/*` mirroring Python services.
  - `/api/motd` → fetch MOTD from Firestore.
  - `/api/tokens` → wraps generation token sync/consume logic (Firestore).
  - `/api/story/*` → Gemini text/image proxies (cover generation, stage generation).
  - `/api/library/*` → saved story listing/export retrieval.
  - `/api/auth/session` → verifies tokens, refresh helper if needed.
- **Shared utils**: Place Firestore/Gemini wrappers in `lib/server/*`; reuse Python prompt JSON for parity.

## 4. Static Assets & Config
- JSON assets (`storytype.json`, etc.) imported via `import data from "../story.json"` and memoized.
- Illustration thumbnails copied to `fairybook-js/public/illust` (symbolic link or build step) to keep paths identical.
- `.env` loaded via `next.config.ts` (already configured); client-exposed keys use `NEXT_PUBLIC_` prefix.

## 5. Testing Stack
- **Unit**: Vitest for stores/utilities; React Testing Library for components.
- **E2E**: Playwright for wizard flow scripts once Phase 2 MVP exists.
- Manual logs tracked in `docs/MANUAL_TESTING.md` per page.

## 6. Folder Conventions
- `app/(routes)` → UI + server components.
- `app/api/*` → REST endpoints.
- `lib/client/*` → client helpers (stores, hooks).
- `lib/server/*` → Firestore, Gemini, token utilities.
- `types/` → shared TypeScript interfaces (mirrors Python payloads).

These decisions prioritise readability and predictable structure for contributors new to Node/React while keeping parity with the existing Streamlit implementation.
