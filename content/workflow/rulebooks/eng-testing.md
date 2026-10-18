---
name: eng-testing
description: "Testing rulebook: what to test, the right layer, edge and failure cases, mocking discipline, and coverage as a signal. Tuned for Jest or Vitest with Playwright and axe."
category: workflow
version: 0.1.0
status: current
verified: 2026-10-18
claudeCodeVersion: 2.1.302
---
# Testing rules

Goal: **meaningful behavioral protection**, not a coverage number.

## What to test
- New/changed business logic, new error paths, new edge cases, and anything security-sensitive.
- Behavior and contracts, not implementation details. A test should fail when behavior breaks, not
  when an internal is refactored.

## Right layer (use the smallest effective one)
```
        E2E (Playwright)         ← few; critical user journeys only
     Integration                 ← controller→service→DB paths, module seams
   Unit        Unit              ← most logic, fast, isolated
```
- Don't write an E2E test for what a unit test reliably protects. Don't unit-test through five
  mocks what an integration test would prove.
- Repo tools: Jest (api), Vitest (web), jest-expo (mobile), Playwright + @axe-core/playwright
  (web e2e + a11y). Match the layer to the right tool.

## Mocking
- Mock at real boundaries (network, clock, randomness, external services). Don't mock the unit
  under test or so much that the test only asserts the mock. Prefer fakes/in-memory over deep
  mock chains.

## Edge & failure cases
- Cover empty/null/boundary inputs, error/timeout paths, concurrency where relevant, and
  authorization failures. For UI: loading, error, and empty states; a11y (don't regress axe).

## Coverage
- Coverage is a signal, not the objective. Flag new untested branches / business logic / error
  paths / security-sensitive behavior. 100% coverage ≠ correctness.

## Output
Emit the YAML findings contract with `agent: testing-reviewer`. In `tests_required`, name the
specific behaviors that must be covered and at which layer. Block (major) when new behavior ships
with no meaningful test.
