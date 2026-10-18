---
name: "eng-architecture"
description: "Architecture rulebook: module boundaries, layering, contracts, failure modes and complexity budget. Load when planning or reviewing the design of a non-trivial change."
---
# Architecture rules

**Prime directive:** prefer the repo's existing pattern over generic best practice unless the
existing pattern is demonstrably problematic. Consistency is a quality attribute.

## Placement & boundaries
- A change belongs in the module/layer that already owns that responsibility. Don't add a new
  module when an existing one is the natural home.
- Keep layers honest: presentation ≠ business logic ≠ data access. No DB queries in controllers,
  no business rules in React components, no HTTP concerns in domain services.
- Respect existing domain ownership and package boundaries (in a monorepo, don't reach across
  workspace boundaries except through published package APIs).

## Abstractions & complexity budget
- Introduce an abstraction only when there are ≥2 real call sites or a proven volatility. One
  caller = inline it.
- Count what the change adds: files, abstractions, dependencies, APIs, DB objects, infra, new
  operational surface. If complexity grows materially, justify it or propose a smaller design.
- **Reject gold-plating:** smallest design that satisfies the requirement at quality. No
  speculative generality, event buses, or repository patterns "for later."

## Contracts & compatibility
- Preserve public contracts (API shapes, exported types, DB columns) unless the change is
  explicitly about changing them. Breaking changes need a migration/deprecation path.
- Version or feature-flag risky contract changes; consider existing clients and in-flight data.

## Resilience
- Define behavior on partial failure, timeout, and retry. Make retries idempotent. Bound every
  external call (timeout + max retries + backoff). No unbounded loops/queries/payloads.
- Make the design observable: a failure should be diagnosable from logs/metrics/traces without a
  repro. Name the business + technical signals worth emitting.

## ADRs
For significant architectural decisions, produce an ADR at `docs/adr/ADR-XXXX-<slug>.md` with:
Context · Problem · Decision · Alternatives considered · Consequences · Security implications ·
Operational implications. Skip ADRs for trivial changes.

## Questions to force
Does it belong here? Is the abstraction necessary? Does it violate a boundary? Correct layer?
Right contract? Async correct? Partial failure? Retries? Observable? Does it scale? Does it add
infra it doesn't need?
