---
name: eng-postgres
description: "PostgreSQL rulebook: query correctness and performance, indexing, N+1, transactions, locking, JSONB, pagination, schema evolution and safe migrations."
category: backend
version: 0.1.0
status: current
verified: 2026-10-18
claudeCodeVersion: 2.1.302
---
# PostgreSQL rules

## Queries & performance
- Select only needed columns; never `SELECT *` in application queries.
- Every query that filters/joins/sorts on a column should hit an index. Flag full table scans on
  large tables. Add indexes for new query patterns; drop unused ones.
- **N+1 is a blocker in hot paths:** batch/join/`IN`/data-loader instead of per-row queries.
- All list endpoints are paginated (keyset/cursor preferred over large `OFFSET`). No unbounded
  result sets.

## Transactions, locking, concurrency
- Keep transactions short; never hold one open across an external/network call. Choose the right
  isolation level for the invariant. Be explicit about lock scope; watch for deadlock-prone
  ordering. Consider `SELECT … FOR UPDATE` only where contention requires it.

## JSONB & data integrity
- Constrain data with NOT NULL, FK, UNIQUE, CHECK — don't push integrity entirely into app code.
  Use JSONB for genuinely dynamic data, not to dodge schema design; index with GIN when queried.

## Migrations (safety first)
- **Backward-compatible by default** (old app version must run against new schema during deploy):
  add nullable/defaulted columns, backfill separately, then tighten. Don't rename/drop in one step
  with running clients — expand/contract over two deploys.
- `CREATE INDEX CONCURRENTLY` on large tables to avoid long write locks. Avoid rewriting large
  tables in a single long-locking statement. Know the lock each DDL takes and its duration vs
  table size.
- Consider existing data volume, backfill cost, and rollback limitations before merging.

## Review focus on large data / high concurrency
Missing indexes · unbounded queries · long-running/locking statements · transaction scope ·
N+1 · non-keyset pagination over big tables · connection exhaustion.

Emit the YAML findings contract (the `findings-contract` rulebook).
