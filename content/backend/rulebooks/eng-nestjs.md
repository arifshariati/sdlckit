---
name: eng-nestjs
description: "NestJS rulebook: modules, controllers, services, DTO validation, DI, error handling, transactions, config, logging, authorization and testability. Tuned for NestJS 11."
category: backend
version: 0.1.0
status: current
verified: 2026-10-18
claudeCodeVersion: 2.1.302
---
# NestJS rules

Prefer the repo's established conventions (module layout, validation lib, error filters).

## Module / layer discipline
- Thin controllers: parse/authorize/delegate only. No business logic, no DB access in controllers.
- Services own business logic; keep them cohesive — split an overloaded service rather than
  growing a god-service.
- Data access behind a repository/data layer; services don't hand-write raw SQL inline unless that
  is the repo's pattern.
- Watch module dependencies: no hidden circular deps; use `forwardRef` only as a last resort and
  flag it as a design smell.

## DTOs & validation
- Every external input has a DTO with explicit validation (class-validator/zod per repo). Whitelist
  + forbid-non-whitelisted. Validate at the boundary; never trust the client.
- Separate input DTOs from entities; don't leak persistence models over the API.

## Error handling
- Throw typed/HTTP-meaningful exceptions; map them in an exception filter. Don't swallow errors or
  return 200 on failure. No leaking stack traces or internal detail to clients.
- Every outbound call (HTTP, queue, DB) is bounded: timeout + retry policy + what happens on
  failure. No unbounded operations.

## Transactions & async
- Wrap multi-write operations in a transaction with the correct scope; don't hold transactions
  across external calls. Make async handlers idempotent where retried.

## Config, logging, observability
- Config via the config module + validated env schema — never `process.env` scattered in code,
  never secrets in code. Structured logging; do NOT log secrets, tokens, or PII indiscriminately.
- Emit metrics/traces for meaningful operations; include a correlation id.

## Authorization
- Enforce authz at the boundary (guards), check ownership/tenant on every resource access. Deny by
  default. Don't rely on the client to scope data.

## Testability
- Inject dependencies (no `new` inside services for collaborators). Unit-test business logic;
  integration-test the controller→service→DB path for public endpoints.

## Detect & flag
Fat controllers · overloaded services · wrong module deps · hidden circular deps · weak DTO
validation · leaky abstractions · improper exception handling · DB logic in the wrong layer ·
unbounded operations · missing timeout/retry · scattered `process.env` · secrets in code.

Emit the YAML findings contract (the `findings-contract` rulebook).
