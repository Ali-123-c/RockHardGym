---
description: "Generate test cases for GymFlow API endpoints and components. Use when creating test suites for members, attendance, payments, or fingerprint features."
agent: "agent"
---

Generate comprehensive test cases for the provided code:

## Test Requirements

1. **Unit tests** for individual functions
   - Test happy path (expected behavior)
   - Test error cases (validation failures, null inputs)
   - Test edge cases (empty arrays, boundary values)

2. **Integration tests** for API routes
   - Test request validation
   - Test database interactions
   - Test error responses

3. **Component tests** for React components
   - Test rendering with different props
   - Test user interactions (clicks, form submissions)
   - Test error states

## Test Structure

- Use existing test framework in the codebase
- Follow naming convention: `[function].test.ts`
- Include setup/teardown for database
- Use descriptive test names: `should return error when email is invalid`
- Group related tests with `describe` blocks

## Example Format

```typescript
describe('API Route: POST /api/members', () => {
  it('should create a member with valid data', async () => {
    // setup
    // execute
    // assert
  })

  it('should return 400 when name is missing', async () => {
    // setup
    // execute
    // assert
  })
})
```

## Coverage Goals

- Aim for 80%+ line coverage
- 100% coverage for critical paths (auth, payments, attendance)
- Include performance tests for queries with 1000+ records
- Test concurrent requests where applicable

Generate tests that are maintainable, fast, and clearly document expected behavior.
