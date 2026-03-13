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

## UI Consistency
- Use the shared `page-intro` hero layout (title + optional `page-lead`) for new or updated route headers.
- Prefer the global chip filters, `.surface`/`.card` spacing, and status tags from `src/index.css` when building controls or summaries.
- Convert dense tables on mobile to the `.data-table.stacked-table` pattern and ensure `data-label` attributes are set.
- Keep calls-to-action and info cards aligned with the shared tokens instead of inline styles or emojis.

## i18n Changes
- Keep keys aligned across `src/i18n/locales/da.json`, `en.json`, `de.json`.
- Avoid hardcoded user-facing strings in components.
