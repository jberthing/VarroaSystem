# AGENTS.md

## Purpose
Guidance for AI coding agents contributing to `VarroaSystem` (Vite + React + TypeScript PWA for local varroa tracking with Dexie/IndexedDB).

## Project Snapshot
- Framework: React 18 + TypeScript
- Build tool: Vite
- Data layer: Dexie (IndexedDB)
- Charts: Chart.js + react-chartjs-2
- i18n: i18next (`da`, `en`, `de`)
- Tests: Vitest + Testing Library
- CI: `.github/workflows/ci.yml` (tests + build on PR/push to `main`)

## Ground Rules
- Do not edit generated/build artifacts: `dist/`, `coverage/`, `node_modules/`.
- Keep changes focused; avoid broad refactors unless requested.
- Prefer strict typing; avoid `any` unless justified.
- Preserve existing UX patterns and CSS style in the touched area.
- If behavior changes, update tests in the same PR.
- If user-facing text changes, update all locale files (`src/i18n/locales/*.json`).

## Setup & Commands
- Install: `npm ci` (preferred) or `npm install`
- Dev server: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Tests (watch): `npm test`
- Tests (single run): `npm test -- --run --reporter=verbose --no-coverage`
- Coverage: `npm run test:coverage`

## Required Validation Before Finishing
Run these after code changes:
1. `npm run lint`
2. `npm test -- --run --reporter=verbose --no-coverage`
3. `npm run build`

If a command cannot run, state exactly why.

## Codebase Map
- `src/pages/` route-level pages
- `src/components/` reusable UI
- `src/db/` Dexie schema + repository operations
- `src/utils/` pure helpers and export/import logic
- `src/i18n/` translation config + locale files
- `src/test/` shared test setup/mocks

## Change Playbooks

### Database/schema changes (`src/db/database.ts`)
- Never remove/rename existing fields without migration strategy.
- Increment Dexie version and include upgrade logic when needed.
- Verify import/export compatibility after schema changes.

### Import/export changes (`src/pages/ImportExport.tsx`, `src/utils/fileUtils.ts`, `src/utils/csvParser.ts`)
- Preserve backward compatibility with existing exported data where possible.
- Add/update tests for parsing and serialization edge cases.

### Chart changes (`Dashboard`, `HiveDetail`)
- Confirm behavior for sparse and dense data.
- Check responsiveness and readability on mobile widths.
- Keep tooltip/axis labels and thresholds consistent with current semantics.

### i18n changes
- Keep translation keys aligned across `da.json`, `en.json`, `de.json`.
- Avoid hardcoded user-facing strings in components.

## Testing Guidance
- Place tests near source files (`*.test.ts` / `*.test.tsx`).
- Prefer behavior-focused tests over implementation details.
- Use semantic Testing Library queries (`getByRole`, `getByLabelText`).
- Mock repository/db interactions when testing UI behavior.

## Branch & Commit Conventions
- Branches: `feature/...`, `bugfix/...`, `hotfix/...`, `chore/...`
- Commits: conventional style, e.g.:
  - `feat: add hive filter on dashboard`
  - `fix: handle empty csv rows in parser`
  - `test: cover quick observation validation`

## PR / Handoff Notes
When finishing, provide:
- What changed
- Why it changed
- Commands run + results
- Any follow-ups or known limitations
