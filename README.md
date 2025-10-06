# Fairybook

Fairybook helps educators and parents craft short Korean children's stories and AI-generated illustrations powered by Google Gemini. The canonical experience still lives in the Streamlit app (`app.py`), while a new Next.js + TypeScript prototype in `fairybook-js/` explores a web-native rewrite. Both implementations share the same prompts, assets, and `.env` secrets, so you can iterate on either stack without forking the repository.

## Core Features
- Guided story creation: choose an age band, provide a one-line idea, and pick from randomized story archetypes.
- Gemini-backed storytelling: prompts the Gemini text model for multi-paragraph narratives tailored to the selected age and topic.
- Story pre-production: auto-generates a synopsis, detailed protagonist profile, and character concept art before the title phase.
- Consistent illustration style: the initial generation locks a single art direction and reuses it for character art, stage visuals, and the cover.
- HTML exports + narration: bundle the title, cover, stage illustrations, prose, and an auto-playing MP3 read-aloud track into timestamped HTML files stored under `html_exports/`.
- Saved story browser: revisit previous exports inside the app without leaving Streamlit, with a dedicated **내 동화** view for logged-in users.
- Daily generation tokens: authenticated users receive seven tokens at signup, gain one per KST midnight (up to ten), and spend a token the first time a finished story is saved in Step 6.
- Temporary community board: leave quick notes for fellow writers; implemented in an isolated `community_board.py` module so it can be removed or swapped independently.
- Message of the day announcements: show a first-visit modal and persistent banners driven by an admin-configurable notice, ensuring every visitor sees critical updates.
- Firebase email/password login: authenticate writers before they can create new stories or post on the board, while keeping the saved-story viewer public.

## Getting Started

### Prerequisites
- Python 3.11 or newer
- Google Gemini API access (text + image endpoints)
- Node.js 18 LTS or newer (required for the `fairybook-js` Next.js companion app)

### Installation
```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .\.venv\\Scripts\\activate
pip install -r requirements.txt
```

### Configure Secrets
1. Copy `.env.sample` to `.env` in the project root (the sample ships with dummy values).
2. Replace `GEMINI_API_KEY` with your real key and adjust other variables as needed:
   ```ini
   GEMINI_API_KEY="your-api-key"
   GEMINI_TEXT_MODEL="models/gemini-2.5-flash"
   # Optional: override the default image model
   GEMINI_IMAGE_MODEL="models/gemini-2.5-flash-image-preview"
   ```
3. To enable the read-aloud feature, grant the service account the **Text-to-Speech Client** role, enable the Text-to-Speech API, and confirm `TTS_PREFIX` (default `tts`) points to a folder within your `GCS_BUCKET_NAME` so narration MP3s can be uploaded alongside HTML exports.
4. Restart the Streamlit app after changing `.env` so the new values load.
5. Keep `.env` out of version control; only `.env.sample` should be committed.
6. (Optional) Adjust MOTD storage with `FIRESTORE_MOTD_COLLECTION` / `FIRESTORE_MOTD_DOCUMENT` if you need a custom Firestore location. Notices are always stored in Firestore.

### Streamlit Cloud Secrets
If `google-credential.json` is unavailable (for example on Streamlit Cloud), add the service-account payload to `.streamlit/secrets.toml` instead:

```toml
[google_credentials]
type = "service_account"
project_id = "your-project-id"
private_key_id = "..."
private_key = "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
client_email = "your-service-account@your-project.iam.gserviceaccount.com"
client_id = "..."
token_uri = "https://oauth2.googleapis.com/token"
```

The app now detects these secrets (or a `GOOGLE_CREDENTIALS_JSON` value) and uses them automatically when `google-credential.json` is missing.

### Firebase Authentication Setup
1. In Firebase Console open your project (e.g., `My First Project`), navigate to **Authentication → Sign-in method**, and enable **Email/Password**.
2. Register a web app if you have not already and copy the **Web API key**. Place it in `.env` using `FIREBASE_WEB_API_KEY`.
3. Ensure your service-account JSON contains permissions for Firebase Auth, Firestore, and Cloud Storage, then point both `GOOGLE_APPLICATION_CREDENTIALS` and `FIREBASE_SERVICE_ACCOUNT` at that file.
4. Set `GCP_PROJECT_ID` (or `GCP_PROJECT`) to the same project ID used by Firebase, Firestore, and GCS so all backends share credentials.
5. To sanity check the configuration without launching Streamlit, run:
   ```bash
   python scripts/verify_firebase_admin.py
   ```
   The script loads `.env`, resolves the service account, and creates a dummy custom token to confirm the Admin SDK is ready.

> Tip: rotate keys immediately if they ever appear in command output, logs, or commit history.

## Run the App
```bash
streamlit run app.py
# or headless mode (useful on remote servers)
streamlit run app.py --server.headless true
```

The UI opens to a task selector. Choose **✏️ 동화 만들기** to start the story flow (a login prompt appears if you are not authenticated); saved stories remain publicly accessible via **📖 동화책 읽기**:

### Run the Next.js Companion App

The `fairybook-js/` directory hosts a TypeScript Next.js prototype that shares prompts, assets, and secrets with the Streamlit build.

1. From the repo root, confirm `.env` defines `GEMINI_API_KEY` (and any other shared secrets). `next.config.ts` already loads this file.
2. Install dependencies: `cd fairybook-js && npm install`.
3. Launch the development server: `npm run dev` (defaults to <http://localhost:3000>). Re-run after editing environment variables.
4. API routes under `app/api/*` can read `process.env.GEMINI_API_KEY`; prefix values with `NEXT_PUBLIC_` when they must reach the browser.

Use `npm run build && npm start` for a production-like run. Keep Python (`.venv/`) and Node (`node_modules/`) environments separate so the stacks stay isolated while sharing the same repository.
1. Pick an age group and describe the idea or theme.
2. Choose one of eight randomized story types. Clicking **✨ 제목 만들기** runs a pre-production pipeline that drafts a synopsis, defines the protagonist, locks an illustration style, renders character concept art, and then produces the title and cover prompt.
3. Review the generated title, synopsis, protagonist brief, character art, and cover illustration, then continue when satisfied.
4. Pick one of four narrative cards drawn from `story.json` (the final stage automatically swaps in `ending.json` cards so the conclusion matches the desired mood).
5. Let Gemini write the current stage with continuity context and create its illustration (optionally guided by the character art as an image reference); repeat until all five stages are complete.
6. Open **전체 이야기를 모아봤어요** to review the full sequence. The app auto-saves an HTML bundle under `html_exports/` and surfaces the latest file path. Use **📖 동화책 읽기** any time to browse previously exported stories.

### Generation Tokens
- New accounts start with seven generation tokens; the balance increases by one each KST midnight (capped at ten).
- The **✨ 제목 만들기** button is disabled once the balance hits zero. Redirects to the auth gate preserve the intended action so users can log in and continue seamlessly.
- Step 6 consumes a single token the first time a finished story is saved. Users can rerun earlier steps without additional cost so long as they do not generate an export.
- The account settings page shows the live balance, last refill/consumption times, and offers a manual refresh. These values mirror the token data stored in Firestore under the user's UID.
- Admins can inspect and adjust balances inside **👥 사용자 디렉터리** via the new token controls (auto-refill to the cap or set custom values).

### Admin Console
Operations staff can launch a dedicated Streamlit console for user management, log analytics, and exports:

```bash
streamlit run admin_app.py
# headless mode
streamlit run admin_app.py --server.headless true
```

- Authenticate with a Firebase account that has the custom claim `role=admin`. Non-admin accounts are rejected.
- The console exposes a usage dashboard, activity explorer, CSV/Google Sheets export tools, and user moderation controls (disable, role update, sanction logging).
- The **공지 관리** tab lets you compose, preview, activate, or disable the global MOTD; the notice appears as a first-visit modal and as banners on the home screen and community board.
- Google Sheets exports require the service-account credentials used elsewhere plus edit access to the target spreadsheet. Set the spreadsheet ID in the UI when exporting.
- Activity statistics rely on Firestore logging. If logging is disabled (`ACTIVITY_LOG_ENABLED=false`), the console surfaces a warning and some charts may be empty.
- Helper scripts under `scripts/` assist with admin management:
  - `python scripts/grant_admin_role.py <UID>` assigns the admin role; append `--remove` to revoke it.
  - `python scripts/list_admin_users.py` prints every user whose custom claims include `role=admin`.
- `admin_app.py` automatically loads the same `.env` file used by the main app, so confirm `FIREBASE_WEB_API_KEY`, `GCP_PROJECT_ID`, and service-account paths are set before starting the console.

## Run Tests
Install the development dependency and execute the suite from the project root:

```bash
pip install pytest
python -m pytest
```

The suites under `tests/` mock external services (Gemini, Firebase, and GCS) so they run offline. New coverage includes `tests/test_story_export_service.py`, which exercises the refactored `services.story_service.export_story_to_html` helper.

## Repository Tour
- `app.py` – Streamlit entry point that wires together the modular UI views, session-state helpers, and story service.
- `session_state.py` – Centralised defaults, navigation helpers, and reset functions that keep Streamlit reruns stable.
- `ui/` – `home.py`, `auth.py`, and `board.py` encapsulate each page surface; `styles.py` applies the shared theme.
- `services/story_service.py` – `StoryBundle`/`StagePayload` dataclasses plus HTML export and optional GCS upload helpers.
- `telemetry.py` – Thin wrapper around the Firestore activity log with sensible defaults for user attribution.
- `admin_app.py` – Standalone Streamlit entry point for administrators (analytics, moderation, exports). Supporting modules live under `admin_tool/`.
- `admin_ui/announcements.py` – Admin console surface for composing and toggling the message of the day.
- `community_board.py` – SQLite/Firestore dual backend for the experimental collaboration board.
- `firebase_auth.py` – REST + Firebase Admin helpers for email/password sign-up, sign-in, token refresh, and server-side verification.
- `gemini_client.py` – Gemini integration, including story prompt composition, synopsis/protagonist prompt builders, illustration prompt generation, and image model fallbacks.
- `motd_store.py` – Shared MOTD storage helpers (Firestore or local JSON fallback).
- `storytype.json`, `story.json`, `ending.json` – Data assets that describe story archetypes, reusable beats, and ending templates.
- `illust_styles.json` – Illustration style catalog used to randomize art direction.
- `illust/` – Lightweight 512×512 thumbnail PNGs showcased in the UI.
- `html_exports/` – Output directory for generated HTML bundles (created on first export).
- `docs/TECHNICAL_BRIEF.md` – Deep dive into app architecture and recent enhancements.

## Development Notes
- Follow PEP 8, keep Streamlit widget keys stable, and prefer helper functions for repeated logic.
- Treat the community board as experimental: keep board state, storage, and UI hooks isolated and avoid coupling it with the story flow.
- When adding dependencies, pin them in `requirements.txt` and capture the change with `pip freeze` before committing.
- Automated coverage currently focuses on `gemini_client.py` and `firebase_auth.py`; extend the `pytest` suites under `tests/` and continue mocking outbound requests to avoid hitting external APIs.
- Manual verification: launch the app, walk through all six creation steps (including the cover preview), ensure each stage inherits the locked illustration style, and reload saved HTML exports to confirm rendering.

## Troubleshooting
- **Missing story types or styles**: ensure `storytype.json` and `illust_styles.json` remain in the project root and are valid UTF-8 JSON.
- **Gemini errors**: double-check the API key, confirm the configured model is available to your account, and review console logs for rate limit or safety blocks.
- **Firebase auth failures**: verify `FIREBASE_WEB_API_KEY`, confirm the service-account permissions, and rerun `python scripts/verify_firebase_admin.py` to validate Admin SDK access.
- **Headless sessions**: use `streamlit run app.py --server.headless true` and access via the CLI-provided URL or enable Streamlit Cloud deployment.

## Further Reading
- Technical overview: `docs/TECHNICAL_BRIEF.md`
- Repository contribution guidelines: `AGENTS.md`
- Next.js companion guide: `docs/js/companion_app.md`
- Illustration style reference: `illust_styles.json`
- Cloud configuration checklist: `docs/cloud_setup_guide.md`
- Refactoring guidelines and plan: `docs/refactoring_guidelines.md`, `docs/refactoring_workplan.md`
