---
name: "eng-supabase"
description: "Supabase rulebook: Row Level Security, auth, CLI migrations, client usage, storage, realtime and edge functions. Pairs with the PostgreSQL rulebook for queries and schema."
---
# Supabase rules

Supabase is Postgres + auth + storage + realtime. Schema/query concerns → [[eng-postgres]]; this
rulebook covers the Supabase-specific surface.

## Row Level Security — the #1 risk
- **RLS must be ON for every table exposed to the client.** A table without RLS behind the anon/
  authenticated key is a data breach. Treat a new table without an explicit RLS policy as a blocker.
- Write policies per operation (select/insert/update/delete) scoped to `auth.uid()` / tenant.
  Test that a user cannot read or mutate another user's rows.
- The `service_role` key bypasses RLS — it must NEVER reach the client/browser/mobile bundle. Only
  server-side (NestJS) may hold it, from secure config.

## Auth
- Use Supabase auth session handling; validate the JWT server-side for privileged actions. Don't
  trust client-reported user ids — derive identity from the verified session.
- Handle token refresh, expiry, and sign-out across web and mobile.

## Migrations (Supabase CLI)
- Changes go through `supabase/migrations` via the CLI (`db:new`, `db:push`, `db:lint`), never
  hand-edited in the dashboard without capturing a migration. Migrations are forward-only in prod;
  design them backward-compatible (see [[eng-postgres]] migration rules).
- Keep RLS policies and grants in migrations, versioned with the schema.

## Client usage
- Use the generated types for queries; select only needed columns. Don't over-fetch. Handle the
  `{ data, error }` result explicitly — never ignore `error`.
- Scope storage buckets with policies; validate uploads (size/type) server-side.

## Edge functions / realtime
- Validate input, bound execution, don't leak secrets. For realtime subscriptions, clean up on
  unmount and scope channels to what RLS allows.

## Flag as blocker/major
Table exposed without RLS · `service_role` key in client code · trusting client user id · ignored
`error` on a mutation · dashboard change with no migration · unscoped storage bucket.

Emit the YAML findings contract (the `findings-contract` rulebook).
