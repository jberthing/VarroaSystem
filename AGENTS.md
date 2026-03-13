# AGENTS.md

VarroaSystem is a Vite + React + TypeScript PWA for local varroa mite tracking with IndexedDB.

## Universal Rules
- Do not edit generated artifacts: `dist/`, `coverage/`, `node_modules/`.
- Keep changes scoped to the request; avoid broad refactors unless asked.
- Challenge bad decisions directly: if a request is likely wrong or risky, say so clearly, explain briefly, and propose a better option.
- If behavior changes, update or add tests.
- If user-facing text changes, update all locale files in `src/i18n/locales/`.
- Before finishing, run:
  1. `npm run lint`
  2. `npm test -- --run --reporter=verbose --no-coverage`
  3. `npm run build`
  If any command cannot run, state why.

## Progressive Disclosure
Load only what is relevant to the task:
- [Workflow and Handoff](docs/agents/workflow.md)
- [Commands and CI](docs/agents/commands-and-ci.md)
- [TypeScript and React Conventions](docs/agents/typescript-react.md)
- [Testing Conventions](docs/agents/testing.md)
- [Domain Playbooks (Dexie, import/export, charts, i18n)](docs/agents/domain-playbooks.md)
- [Git Workflow](docs/agents/git-workflow.md)
- [Repo Map](docs/agents/repo-map.md)
