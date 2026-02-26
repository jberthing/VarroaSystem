# Commands and CI

## Local Commands
- Install: `npm ci` (preferred) or `npm install`
- Dev server: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Tests (watch): `npm test`
- Tests (single run): `npm test -- --run --reporter=verbose --no-coverage`
- Coverage: `npm run test:coverage`

## Required Validation Before Finish
1. `npm run lint`
2. `npm test -- --run --reporter=verbose --no-coverage`
3. `npm run build`

## CI Behavior
- CI runs on push and pull requests targeting `main`.
- CI executes tests and build (`.github/workflows/ci.yml`).
