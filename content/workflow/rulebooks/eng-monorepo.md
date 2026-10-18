---
name: eng-monorepo
description: "Monorepo rulebook: workspace boundaries, the Turbo task graph and caching, shared package design, dependency hygiene and versioning. Tuned for Turbo with pnpm workspaces."
category: workflow
version: 0.1.0
status: current
verified: 2026-10-18
claudeCodeVersion: 2.1.302
---
# Monorepo (Turbo + pnpm) rules

## Workspace boundaries
- Cross-workspace use goes through a package's **public API** (its exports), never deep imports
  into another workspace's `src`. Shared code belongs in a `packages/*` package, not copy-pasted.
- Keep the dependency graph acyclic: apps depend on packages, packages don't depend on apps, and
  packages avoid cycles among themselves.

## Turbo task graph & caching
- Declare task `dependsOn` correctly (`^build` etc.) so the graph is right. A task's `outputs` must
  list what it produces or caching is wrong/stale. `inputs` scope what invalidates cache.
- Prefer affected/filtered runs (`--filter=...[origin/main]`) for test/lint in CI and for
  `test-affected`. Don't disable caching to "fix" a problem — fix the graph.

## Dependency hygiene
- Use `workspace:*` for internal deps. Keep shared deps (React, TS) aligned across workspaces to
  avoid duplicate/incompatible versions. Flag version drift of a shared framework.
- A new dependency in a shared package affects every consumer — justify it.

## Shared package design
- Shared packages (`the shared UI package`, `the core package`, `the theme package`, `the shared types package`) have clear,
  minimal public surfaces. Don't leak app-specific concerns into a shared package.
- Types shared across apps live in `shared-types`; don't redefine them per app.

## Flag
Deep cross-workspace imports · cyclic package deps · wrong/missing Turbo `dependsOn`/`outputs` ·
shared-dep version drift · app-specific logic in a shared package · duplicated types.

Emit the YAML findings contract (the `findings-contract` rulebook).
