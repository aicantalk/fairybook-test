# `app.py` Porting Guidelines (Streamlit → Next.js)

## Goals & Scope
- Recreate the user-facing story creation workflow in the Next.js (`fairybook-js/`) app while keeping feature parity with the Streamlit version.
- Preserve Tone/KR copy, prompt composition, and generation token logic by reusing existing Python services as references for API contracts.
- Deliver a modular front end that separates presentation (React components) from orchestration (state stores, API routes), making it easy to iterate beyond Streamlit limitations.
- Architecture choices are recorded in `docs/js/architecture_decisions.md`; update that doc before deviating from these guidelines.

_Not in scope_: Admin console (`admin_app.py`), Streamlit-specific UX embellishments (e.g., popovers, rerun patterns) unless they directly impact the user flow.

## High-Level Architecture
1. **App Router Layout**
   - Use `app/` with nested routes (`/`, `/create`, `/library`, `/board`, `/settings`).
   - Define a root layout that loads global styles and provides shared context providers (auth, session, tokens, MOTD).
2. **State Management**
   - Introduce a lightweight store (e.g., `zustand` or React context + reducers) to mirror `ensure_state` keys.
   - Persist wizard progress in client state; hydrate from server when reloading (localStorage fallback for MVP).
3. **Server / API Routes**
   - `/api/auth/*` for Firebase token exchange (proxy to existing REST endpoints or replicate logic client-side with `firebase/auth`).
   - `/api/story/*` for Gemini interactions, reusing prompt semantics from `gemini_client.py`.
   - `/api/library/*` for saved stories integration (GCS/Firestore access via server actions or routes).
   - `/api/motd` and `/api/tokens` to surface MOTD + generation tokens.
4. **Shared Assets**
   - Load JSON (story types, endings, styles) server-side once; expose via static import or Next.js `import` of JSON.
   - Reuse `/illust` thumbnails by serving them from `public/illust/` or via dynamic import.

## Key Concerns & How to Address Them
- **Session Stability**: Streamlit reruns are ad hoc; Next.js needs explicit state transitions. Mirror `StorySessionProxy` by defining typed models for each step and centralising updates in a store.
- **Generation Tokens**: Ensure API route enforces same sync logic as `services/generation_tokens.sync_on_login`. Decide whether to call existing Python backend or reimplement Firestore interactions in TypeScript.
- **Gemini Quotas**: Implement request batching/abort control; show optimistic UI states similar to Streamlit spinners.
- **Auth Redirects**: Use Next.js middleware or protected routes to mimic `auth_next_action` flow. Preserve referrer so post-login navigation returns to intended step.
- **MOTD Modals**: Manage `motd_seen_signature` via cookies/localStorage to prevent repeated popups.
- **Internationalisation**: Keep Korean copy inline; consider centralising in a constants module for later reuse.

## Recommended Libraries
- `firebase/app`, `firebase/auth` for client auth flows (or rely on server-side custom token verification).
- `zustand` or `Reducer` hooks for wizard state.
- `react-hook-form` for Steps 1–2 to organise validation.
- `framer-motion` or CSS transitions for subtle step animations (optional).

## Migration Strategy
1. **Parity Audit**: Catalogue UI components and interactions per step (see checklist doc). Confirm JSON assets and prompts align.
2. **API Design**: Draft TypeScript interfaces for responses (story generation payloads, token status, MOTD). Validate against Python outputs.
   - Reference `docs/js/payload_interfaces.md` for canonical shapes; keep it in sync with Python dataclasses.
3. **Skeleton Build**: Implement route structure with placeholder content to confirm navigation and entry states.
4. **Incremental Feature Porting**: Move step logic one at a time, reusing prompts/generated data shape to reduce risk.
5. **Validation**: Manually test the flow end-to-end, logging parity gaps. Add unit tests/mocks where practical.

### Phase 3A – Gemini Proxy Decisions (keep implementation simple)
- Adopt the official `@google/generative-ai` SDK with a minimal helper in `lib/server/gemini.ts`; avoid custom REST glue unless a future requirement appears.
- Port the Python prompt builders (`build_title_prompt`, `build_story_prompt`, etc.) into TypeScript under `lib/server/prompts/` so both stacks stay aligned.
- Rescope story APIs to two endpoints: `POST /api/story/generate` (title/synopsis/protagonist/style bundle) and `POST /api/story/stage` (single stage text + optional image prompt). Update Step 2/5 clients to call these routes directly.
- Read `GEMINI_API_KEY`, `GEMINI_TEXT_MODEL`, and `GEMINI_IMAGE_MODEL` from the environment on handler initialisation; fail fast with a 503-style error when any value is missing.
- Standardise error responses: 400 for invalid input, 502 when Gemini calls fail after lightweight retries, and 500 for unexpected errors. Log details server-side only.
- Cover handlers with Vitest by mocking the SDK (`vi.mock("@google/generative-ai")`) to exercise success/error/validation paths without live quota usage.
- Manual verification: trigger Step 2’s “✨ 제목 만들기” after wiring the proxy, capture the real response, and append the outcome to `docs/MANUAL_TESTING.md` for traceability.

## Testing & Verification
- Unit test stores and API routes with mocked Gemini responses (similar to Python strategy).
- Add page-level component tests (or storybook checks) so each wizard step enforces validation, loading states, and transitions before integration.
- Introduce E2E coverage (Playwright/Cypress) to script the full `/create` flow once the skeleton is ready.
- Capture manual walkthroughs page-by-page, logging outcomes in `docs/MANUAL_TESTING.md` with date/result/notes.
- Track regression findings in the same log and tie them back to checklist items.

## Deliverables Before Coding
- Finalised API contract draft mapping Python payloads to TypeScript types.
- Component map linking Streamlit widgets to React components.
- Task checklist (see `docs/js/app_porting_tasks.md`).
- Decision on state store library and auth strategy (document in project README once selected).
