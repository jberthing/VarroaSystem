# Domain Playbooks

## Dexie Schema Changes (`src/db/database.ts`)
- Do not remove or rename existing fields without a migration plan.
- Increment Dexie version for schema changes.
- Add upgrade logic when data transformation is required.
- Verify import/export compatibility after schema updates.

## Import/Export Changes (`src/pages/ImportExport.tsx`, `src/utils/fileUtils.ts`, `src/utils/csvParser.ts`)
- Preserve backward compatibility with existing exports where possible.
- Add tests for parser/serializer edge cases.

## Chart Changes (`Dashboard`, `HiveDetail`)
- Validate behavior with sparse and dense datasets.
- Confirm readability and responsiveness on mobile widths.
- Keep tooltip/axis labels and threshold semantics consistent.

## i18n Changes
- Keep keys aligned across `src/i18n/locales/da.json`, `en.json`, `de.json`.
- Avoid hardcoded user-facing strings in components.
