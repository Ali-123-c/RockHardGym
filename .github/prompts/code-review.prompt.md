---
description: "Review code changes for GymFlow against project standards. Use when conducting code reviews for TypeScript, React components, API routes, or database code."
agent: "agent"
---

Review the provided code against GymFlow standards:

## Review Checklist

### TypeScript & Type Safety
- [ ] All `any` types are avoided or justified
- [ ] Props and function parameters are properly typed
- [ ] Return types are explicit
- [ ] Generic types are used correctly

### React Components (if applicable)
- [ ] `'use client'` directive present when using hooks or events
- [ ] Props are typed with interfaces
- [ ] useCallback/useMemo used to prevent unnecessary re-renders
- [ ] No console.log left in production code
- [ ] Error boundaries used for error handling

### Styling (if applicable)
- [ ] Only Tailwind CSS utility classes (no inline styles)
- [ ] Responsive classes used (sm:, md:, lg:)
- [ ] Consistent spacing and sizing with Tailwind scale

### API Routes (if applicable)
- [ ] Request validation before processing
- [ ] Consistent response shape: `{ data, error, message }`
- [ ] Proper HTTP status codes (200, 201, 400, 500)
- [ ] Error handling with try-catch
- [ ] Service role key never exposed to client
- [ ] Input sanitization for security

### Database (if applicable)
- [ ] Supabase SDK used correctly
- [ ] Error objects checked after queries
- [ ] No N+1 queries
- [ ] RLS policies considered
- [ ] Transactions used for multi-step operations

### General
- [ ] Code follows project conventions
- [ ] No hardcoded values (use env vars)
- [ ] Comments only where code intent is unclear
- [ ] DRY principle followed (no duplication)
- [ ] Functions have single responsibility
- [ ] No security vulnerabilities
- [ ] Performance concerns addressed

## Feedback Format

Provide feedback as:

1. **Issues** (must fix before merge)
   - Security vulnerabilities
   - Type errors
   - Breaking changes

2. **Improvements** (nice to have)
   - Performance optimizations
   - Better error handling
   - Code clarity

3. **Questions** (discuss)
   - Design decisions
   - Trade-offs

4. **Suggestions** (optional)
   - Refactoring ideas
   - Similar patterns used elsewhere

Be constructive, specific, and actionable in your feedback.
