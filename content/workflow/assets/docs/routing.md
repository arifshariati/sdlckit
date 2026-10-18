# Routing — single source of truth

The orchestrator (any command) selects specialists using: **classification × diff × manifest**.

```
active_domains = (domains the diff touches) ∩ (manifest.domains[d].present == true)
```

A specialist for a domain that is absent from the manifest **never fires**, no matter what the
diff looks like. This is how the AWS, Terraform and Bedrock experts stay silent in a repo that has none of them.

## Always-on (when change is non-trivial)
- **architect** — any feature/refactor/infra/db change (skip for typo/rename/comment-only).
- **testing-reviewer** — any behavior change.
- **security-reviewer** — any meaningful change (auth, input, data, config, deps, infra).

## Routing matrix (risk-gated; ✓ = fire, opt = fire if signals present, – = skip)

| Change | architect | react-web | nestjs | react-native | aws | terraform | postgres/supabase | security | performance | testing |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| React web UI        | ✓ | ✓ | – | – | – | – | – | ✓ | opt | ✓ |
| RN / Expo UI        | ✓ | – | – | ✓ | – | – | – | ✓ | opt | ✓ |
| NestJS API          | ✓ | – | ✓ | – | opt | – | opt | ✓ | opt | ✓ |
| DB / migration      | ✓ | – | opt | – | – | – | ✓ | ✓ | ✓ | ✓ |
| Terraform           | ✓ | – | – | – | ✓ | ✓ | opt | ✓ | opt | ✓ |
| AWS architecture    | ✓ | – | opt | – | ✓ | ✓ | opt | ✓ | ✓ | ✓ |
| Full-stack feature  | ✓ | ✓ | ✓ | opt | opt | – | opt | ✓ | opt | ✓ |
| Security change     | ✓ | opt | opt | opt | opt | opt | opt | ✓ | opt | ✓ |
| Performance change  | ✓ | opt | opt | opt | ✓ | opt | ✓ | opt | ✓ | ✓ |

`opt` fires when the diff shows the relevant signal (e.g. a DB query appears in a NestJS change →
postgres/supabase becomes required; a loop/large-payload/async change → performance).

## Risk rules (escalate `opt`/– to required)
```yaml
iam_change:          { security: required, aws: required, terraform: required }
database_migration:  { postgres/supabase: required, performance: required, testing: required }
public_api:          { nestjs: required, security: required, testing: required }
auth_change:         { security: required, testing: required }
dependency_change:   { security: required }
large_payload_or_async: { performance: required }
ui_only:             { react-web|react-native: required, testing: required }
```

## Workflow depth by size
- **Small** (typo, rename, trivial UI fix): classify → implement → format → lint → typecheck →
  affected tests. No multi-agent review.
- **Normal feature:** classify → architect + specialists → plan approval → implement → gates →
  domain + security + testing review → fix → validate → final review.
- **High-risk** (IAM, networking, migration, prod infra, auth, large file/AI, major concurrency):
  architect → specialists → security → performance → implement → full gates → multi-dimensional
  review → fix → re-validate → final review. **Human approval mandatory** before any execution.

## Cost/latency rules
Don't fire irrelevant agents; reuse discovered context (the manifest); dispatch independent
specialists in parallel; cap review iterations at 2 (3 high-risk); prefer deterministic tools for
deterministic problems.

## Project rules
Every reviewer also reads `<repo>/.claude/engineering/rules.md` when it exists: the project's own
review rules, written by `/eng-learn`, alongside the manifest `conventions`.

## Agent ids
Dispatch agents by their plugin-scoped id: workflow reviewers are `sdlckit-workflow:<name>`, domain
experts are `sdlckit-backend:<name>`, `sdlckit-frontend:<name>` or `sdlckit-infra:<name>`. An expert whose
plugin isn't installed can't fire; say so in the review summary instead of failing.

