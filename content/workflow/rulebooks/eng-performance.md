---
name: eng-performance
description: "Performance rulebook: latency, throughput, memory, DB load, caching, concurrency, backpressure, retry amplification and rendering. Load for changes with performance signals."
category: workflow
version: 0.1.0
status: current
verified: 2026-10-18
claudeCodeVersion: 2.1.302
---
# Performance rules

Invoke when the change touches: DB access, high-volume APIs, async processing, large payloads/file
processing, concurrency, streaming, or frontend rendering.

## Data & backend
- N+1 queries, missing indexes, unbounded result sets, non-keyset pagination over large tables
  ([[eng-postgres]]). Query count and payload size scale with input — bound them.
- Connection/pool exhaustion; transactions held across network calls. Chatty service-to-service
  calls — batch or colocate.

## Caching & work avoidance
- Cache expensive, reusable results with a correct key and TTL, and a clear invalidation story.
  Don't cache per-user data in a shared cache. Memoize/precompute where it pays off; don't add a
  cache that creates a correctness/invalidation hazard for marginal gain.

## Concurrency & resilience
- Backpressure for queues/streams; cap concurrency. **Retry amplification**: retries + fan-out can
  multiply load — add jitter/backoff/circuit-breaking. Idempotency for retried work.
- Bound memory for large payloads: stream instead of buffering whole files; use presigned/multipart
  for big uploads.

## Frontend
- Avoid unnecessary re-renders and large synchronous work on the main thread. Virtualize long
  lists. Lazy-load heavy routes/components. Watch bundle size ([[eng-vite]]).

## Discipline
- Reason about latency/throughput/memory/CPU/network/DB load with the expected input scale, not a
  toy case. Prefer a measurement or a concrete complexity argument over a hunch. Don't micro-
  optimize cold paths.

## Output
Emit the YAML findings contract with `agent: performance-reviewer`. State the scale/condition
under which the issue bites and the expected impact.
