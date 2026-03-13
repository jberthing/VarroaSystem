# Testing Conventions

- Place tests next to implementation (`*.test.ts`, `*.test.tsx`).
- Prefer behavior-focused tests over implementation details.
- Use semantic Testing Library queries (`getByRole`, `getByLabelText`) where possible.
- Mock repository/db access when testing component behavior that depends on persistence.
- Update or add tests whenever behavior changes.
