# Next.js Companion App

## Overview
The `fairybook-js/` project is a Next.js + TypeScript prototype that mirrors the Streamlit experience while exploring a web-native rewrite. It reuses the same prompts, JSON assets, and secrets defined for the Python stack, so behaviour stays aligned during the migration.

## Prerequisites
- Node.js 18 LTS or newer
- Shared `.env` at the repository root (contains `GEMINI_API_KEY` and related values)

### Install Node.js (first-time setup)
- **Windows/macOS**: download the LTS installer from <https://nodejs.org/> and follow the prompts. Reopen your terminal afterwards.
- **macOS/Linux with Homebrew**:
  ```bash
  brew install node@18
  brew link --overwrite node@18
  ```
- **macOS/Linux with nvm** (recommended if you plan to switch versions):
  ```bash
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  # restart terminal, then
  nvm install 18
  nvm use 18
  ```
- Verify installation:
  ```bash
  node -v
  npm -v
  ```
  You should see versions `v18.x.x` and `10.x` or newer.

## Environment Loading
`fairybook-js/next.config.ts` calls `dotenv` with `../.env`, allowing both the Next.js runtime and build steps to access the shared secrets. Keep sensitive keys server-side; expose browser-facing values by duplicating them with the `NEXT_PUBLIC_` prefix when required.

## Install & Run
```bash
cd fairybook-js
npm install
npm run dev
```
- Development server defaults to `http://localhost:3000/`.
- Re-run `npm run dev` after editing environment variables.
- Use `npm run build && npm start` to simulate production.
- Run `npm run lint` to apply the default ESLint rules.

### Installing Additional Packages
Use `npm install <package>` to add runtime dependencies and `npm install -D <package>` for dev-only tooling (linters, test frameworks). Examples:
- `npm install axios` – fetch helper for API calls.
- `npm install -D prettier` – code formatter.

Every install updates `package.json` and `package-lock.json`. Commit both files together (with a `[js]` prefix) so teammates lock to the same dependency graph.

## Project Layout
- `app/` – App Router routes, React components, and API handlers.
- `public/` – Static assets served at build time.
- `next.config.ts` – Loads the shared `.env` and houses framework configuration.
- `tsconfig.json` – TypeScript configuration with the default Next.js paths.

## Collaboration Notes
- Prefix commits that primarily touch `fairybook-js/` or other Node assets with `[js]` (e.g., `[js] Add Gemini proxy route`).
- Keep Python (`.venv/`) and Node (`node_modules/`) dependencies isolated; do not install JS tooling into the Python environment or vice versa.
- When adding new shared environment variables, document them in `.env.sample` and update both Stack docs as needed.

## Next Steps
- Mirror core Streamlit flows (story generation, illustration selection, exports) inside Next.js to validate feature parity.
- Add API route wrappers for Gemini calls so browser code never exposes the raw API key.
- Capture manual testing notes in `docs/MANUAL_TESTING.md` once the web flow stabilises.
