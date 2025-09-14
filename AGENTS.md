# Repository Guidelines

## Project Structure & Module Organization
- Entry point: `index.html` loads ES modules from `src/` (no bundler).
- Core engine: `src/engine/` (rendering, input, save/load, UI).
- Systems: `src/systems/` (game loop, combat, AI ticks).
- Content/data: `src/data/` (dialogs, items, levels, tuning).
- Dev helpers: `src/dev/` (lightweight in-browser tests).
- Assets: `assets/` (portraits, maps, audio, sprites).
- Server (optional saves + static hosting): `server/` (Express ESM).
- Docs: `docs/` (design notes and specs).

## Build, Test, and Development Commands
- Run locally (no build): open `index.html` in a modern browser.
- Node server: `cd server && npm install && npm start` → http://localhost:8080
  - Health: `curl localhost:8080/healthz`
  - Env: `SAVE_API_KEY`, `PUBLIC_DIR` (default repo root), `DATA_PATH` (e.g., `/data/saves.json`).
- Docker: `docker build -t shadow-kingdom .` then `docker run --rm -p 8080:8080 -v "$PWD/data:/data" shadow-kingdom`.
- In-browser tests: open DevTools Console and run `runLightSaveTests()` (from `src/dev/light_tests.js`).

## Coding Style & Naming Conventions
- JavaScript ES modules, browser-first. Two-space indent; semicolons; single quotes.
- Filenames: lowercase with underscores (e.g., `save_core.js`). Constants: UPPER_SNAKE (`TILE`, `AI_TUNING`). Functions/vars: `camelCase`.
- Keep modules small and side-effect free; avoid introducing build steps or external deps.
- Place gameplay logic under `src/systems/` or `src/engine/`; content under `src/data/`.

## Testing Guidelines
- No formal test runner. Prefer adding small console-invoked tests under `src/dev/`.
- Verify saves, VN intros, and RNG using helpers in `light_tests.js` (e.g., `testOpenedChestPersistence()`).
- For UI/behavior changes, include manual steps and expected outcomes in the PR.

## Commit & Pull Request Guidelines
- Commits: imperative, concise, optionally typed/scope-prefixed (e.g., `fix: persist opened chests`, `feat(ui): quest indicators`).
- PRs must include: clear description, screenshots/GIFs for UI, reproduction or test steps, and any server/API/env changes.
- Keep diffs focused; maintain import paths and module style; avoid adding heavy dependencies.
