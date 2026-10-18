---
name: "eng-terraform"
description: "Terraform rulebook: resource lifecycle, state, provider behavior, modules, environment separation, drift, destructive or replacement risk, and plan safety."
---
# Terraform rules

## Plan is the source of truth
- Always `terraform fmt` → `terraform validate` → `terraform plan`, and **read the plan**. Never
  treat `apply` as a substitute for understanding the plan. `apply` is human-authorized only.
- For any change, explicitly identify: resources to **create / change / destroy / replace**, data
  loss risk, downtime risk, dependency changes, and a rollback/recovery strategy.

## Destructive & replacement risk (blockers)
- Flag `force_new` attribute changes that **replace** stateful resources (DBs, volumes, buckets) —
  that's data loss. Flag `prevent_destroy` removals. Flag any change that drops a resource holding
  data.

## State & structure
- Remote state with locking; never commit state or secrets. Don't hand-edit state. Separate state/
  workspaces per environment — no shared prod/dev state.
- Use modules for reuse with clear inputs/outputs; pin provider + module versions. Don't inline
  copy a module across envs.

## IAM & security (see [[eng-aws]])
- Least privilege in generated policies; no wildcards without justification. No plaintext secrets
  in vars/outputs; mark sensitive. Outputs must not leak secrets.

## Hygiene
- Meaningful names, typed/validated variables, documented outputs. Avoid provider-version-sensitive
  behavior assumptions — verify against current provider docs.

Emit the YAML findings contract (the `findings-contract` rulebook).
