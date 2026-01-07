# Testing Guide

This project uses **Vitest** and **React Testing Library** for automated testing.

## Running Tests

```bash
# Run tests in watch mode (re-runs on file changes)
npm test

# Run tests once
npm test -- --run

# Run tests with UI
npm test:ui

# Run tests with coverage report
npm test:coverage
```

## Test Structure

### Unit Tests
Unit tests focus on testing individual functions and utilities in isolation.

**Example**: `src/utils/calculations.test.ts`
- Tests pure functions like `calculateTrend()`, `getTrendIcon()`, etc.
- Fast execution
- No external dependencies or mocks needed

### Integration Tests
Integration tests verify that components work correctly with their dependencies.

**Example**: `src/components/QuickObservationForm.test.tsx`
- Tests user interactions and form behavior
- Mocks external dependencies (database, repository)
- Verifies component renders correctly
- Tests form validation and submission

## Writing Tests

### Test File Naming
- Unit tests: `<filename>.test.ts`
- Integration tests: `<ComponentName>.test.tsx`
- Place test files next to the files they test

### Test Structure
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('Component or Function Name', () => {
  beforeEach(() => {
    // Setup code that runs before each test
  });

  it('should do something specific', () => {
    // Arrange
    // Act
    // Assert
  });
});
```

### Mocking Dependencies
```typescript
// Mock a module
vi.mock('../db/repository', () => ({
  getAllHives: vi.fn(),
  createObservation: vi.fn(),
}));

// Set mock return value
vi.mocked(repository.getAllHives).mockResolvedValue([...]);
```

### Testing Components
```typescript
// Render a component
render(<MyComponent />);

// Find elements
const button = screen.getByRole('button', { name: /click me/i });
const input = screen.getByLabelText(/username/i);

// Simulate user interactions
const user = userEvent.setup();
await user.type(input, 'test');
await user.click(button);

// Wait for async operations
await waitFor(() => {
  expect(screen.getByText(/success/i)).toBeInTheDocument();
});
```

## Best Practices

1. **Test behavior, not implementation** - Focus on what the user sees and does
2. **Use semantic queries** - Prefer `getByRole`, `getByLabelText` over `getByTestId`
3. **Avoid testing implementation details** - Don't test state or internal functions directly
4. **Make tests independent** - Each test should run in isolation
5. **Use descriptive test names** - Name should describe what is being tested
6. **Keep tests simple** - One assertion per test when possible

## Test Coverage

Run `npm test:coverage` to see test coverage report. Aim for:
- **80%+ coverage** for utility functions
- **60%+ coverage** for components
- Focus on critical paths and business logic

## Continuous Integration

Tests run automatically on:
- Pull request creation
- Push to main branch
- Before deployment

All tests must pass before merging to main.

## Troubleshooting

### Tests fail with "Cannot find module"
- Ensure all dependencies are installed: `npm install`
- Check that the file path is correct

### Tests timeout
- Increase timeout in test: `{ timeout: 5000 }`
- Check for missing `await` on async operations

### Mock not working
- Clear mocks between tests: `vi.clearAllMocks()` in `beforeEach`
- Verify mock is set up before component renders
