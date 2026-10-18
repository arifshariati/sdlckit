---
name: eng-security
description: "Security rulebook: authn/authz, validation, injection, SSRF, secrets, sensitive data, IAM, API and upload security, dependency risk and logging hygiene. Load for any meaningful change."
category: workflow
version: 0.1.0
status: current
verified: 2026-10-18
claudeCodeVersion: 2.1.302
---
# Security rules

Review every meaningful change; depth proportional to risk. Classify findings by severity
(blocker/major/minor/suggestion) and confidence.

## Authentication & authorization
- Identity derived from a verified session/token server-side — never from client-reported ids.
- Authorize every privileged action and every resource access (ownership/tenant/role). Deny by
  default. Watch for missing checks on "obvious" endpoints and for IDOR (one user accessing
  another's object by id). Broken authz = blocker.

## Input validation & injection
- Validate/parse all external input at the boundary. Parameterized queries only (no string-built
  SQL). Escape/encode output to prevent XSS. Guard against command/template/path injection.
- SSRF: validate and allowlist outbound URLs built from user input; don't fetch arbitrary
  user-supplied hosts.

## Secrets & sensitive data
- No secrets/keys/tokens/connection strings in code, client bundles (`VITE_`), logs, or errors.
  Use secure config. A leaked secret in the diff is a blocker.
- Don't log PII/credentials/tokens indiscriminately. Don't return internal detail/stack traces to
  clients. Encrypt sensitive data at rest/in transit per the repo's standard.

## Platform specifics
- Supabase: RLS on every client-exposed table; `service_role` server-only ([[eng-supabase]]).
- IAM/cloud: least privilege, no wildcards ([[eng-aws]]).
- File uploads: validate type/size server-side, scope storage, don't trust filenames.

## Dependencies
- New/updated deps: check for known advisories and over-broad transitive risk. Flag unmaintained
  or suspicious packages.

## Output
Emit the YAML findings contract with `agent: security-reviewer`. For each finding give a concrete
exploit/failure scenario, not a generic warning. Never request or reproduce real secrets.
