# `app.py` → Next.js Porting Checklist

## Phase 0 – Preparation
- [ ] Confirm Node 18+ environment (`node -v`) and install project dependencies (`npm install`).
- [ ] Review Streamlit flow (`app.py`, `ui/create/*`, `session_state.py`) and update this checklist with any new findings.
- [ ] Finalise architecture choices (state store, auth strategy, API routing) in `docs/js/architecture_decisions.md`.
- [ ] Draft TypeScript interfaces for core payloads (story stage, token status, MOTD, library entries) in `docs/js/payload_interfaces.md`.

## Phase 1 – Project Skeleton
- [ ] Create base routes in `app/` (`page.tsx`, `create/page.tsx`, `library/page.tsx`, `board/page.tsx`, `settings/page.tsx`).
- [ ] Implement global layout with shared providers (theme, auth client, wizard store placeholder).
- [ ] Add navigation shell replicating Streamlit header (title, user status, settings trigger).
- [ ] Stub API routes for `auth`, `story`, `tokens`, `motd`, `library` with mocked data.
- [ ] Add smoke tests for base routes (render without crashing) and document manual nav check in `docs/MANUAL_TESTING.md`.

## Phase 2 – Core Workflow
- [x] Port Step 0 (home screen) including MOTD modal, token status, create CTA gating.
- [x] Port Step 1 form (age/topic) with validation and state persistence.
- [x] Port Step 2 story type selection, cover-generation pipeline trigger, and spinner UX (with live thumbnails).
- [x] Port Step 3 cover/protagonist review with illustration preview (locked style).
- [x] Port Step 4 narrative card selection with re-sample ability and progress indicator.
- [x] Port Step 5 stage generation queue (text + image), including retry + logging hooks.
- [x] Port Step 6 recap/export view; ensure export signatures prevent duplicates.
- [x] Implement library browsing and filters (`/library`) mirroring Streamlit behaviour.
- [x] Implement board placeholder (optional for MVP but maintain navigation compatibility).
- [x] For each page above, add component/unit tests validating key interactions and record manual test results (date/outcome) in `docs/MANUAL_TESTING.md`.

## Phase 3 – Services & Integrations
- [ ] Implement server-side Gemini proxy aligned with `gemini_client.py` prompts.
- [ ] Integrate Firebase authentication (client + server verification) with redirect flow.
- [ ] Implement generation token sync (Firestore) in Next.js API route or shared SDK.
- [ ] Implement MOTD fetch + acknowledgement tracking.
- [ ] Implement export storage (HTML bundle creation + download) or define interim solution.

### Phase 3 Sub-Phases (keep implementations simple and verifiable)
- **3A Gemini Proxy** – Replace mock story API routes with a minimal server adapter that mirrors the existing Python prompts. Verify via Vitest stubs for success/error branches and a manual `/create` run that shows live model output when `GEMINI_API_KEY` is set.
- **3B Firebase Authentication** – Add the smallest viable Firebase client sign-in, server verification, and middleware redirect flow. Confirm with unit tests for token checks, UI/navigation tests for protected routes, and a manual login/logout walkthrough.
- **3C Token Sync** – Implement `/api/tokens` using authenticated user context against Firestore, focusing on fetch/consume/refill only. Cover the logic with emulator-backed tests and note a manual story-generation run that updates balances.
- **3D MOTD Service** – Wire `/api/motd` plus an acknowledgement endpoint to Firestore, keeping persistence logic straightforward. Test active/inactive/acknowledged paths and record a manual check showing the modal stays dismissed after acknowledgement.
- **3E Export & Library Storage** – Provide a lean HTML export uploader to GCS (or local fallback) and real `/api/library` listings. Validate with mocked storage tests and document a manual export/download that matches Streamlit output.

## Phase 4 – Polish & QA
- [ ] Align styling with existing design (typography, colours, emoji copy).
- [ ] Implement progress indicator equivalent (header progress bar).
- [ ] Add telemetry hooks (log events) mirroring `emit_log_event` usage.
- [ ] Write automated tests for critical stores and API routes.
- [ ] Complete manual test walkthrough; log results in `docs/MANUAL_TESTING.md`.

## Phase 5 – Launch Readiness
- [ ] Update project documentation (`README.md`, `docs/js/companion_app.md`) with latest run instructions.
- [ ] Prepare migration notes: remaining gaps, parity issues, follow-up tasks.
- [ ] Coordinate cut-over plan (how to switch traffic from Streamlit to Next.js, if desired).
