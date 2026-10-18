# Delivery routing — models, escalation, workflow depth

Machine-readable source: `routing.json` at the plugin root (read by `sdlckit-delivery model`). This file explains it.
Engineering-review routing (which reviewers fire for a diff) stays in
`the `sdlckit-workflow:review-routing` skill` and is reused unchanged.

## How a model is chosen
1. Agent frontmatter `model:` = the **balanced** default (aliases → newest of the tier).
2. Before every dispatch the orchestrator runs `sdlckit-delivery model <role> [<ticket|epic>]` and
   passes the returned `model` to the Agent tool. Agents never choose their own model.
3. Escalations are written to the ticket's `model_overrides` (audit trail, shown in the epic report).

## Profiles (`delivery.budget` in the project manifest)
| role | lean | balanced (default) | max |
|---|---|---|---|
| tech-lead, qa-specialist | sonnet | **opus** | opus |
| solution-architect, staff-engineer, product-owner, ui-ux-designer | sonnet | sonnet | opus |
| domain engineers | haiku if ticket risk=small, else sonnet | sonnet | sonnet |
| technical-writer, delivery-manager, business-analyst | haiku | sonnet | sonnet |
| devops-engineer | sonnet | sonnet | sonnet |

## Escalation (every profile)
- Engineer → one tier up when `qa_round ≥ 2` or `red_gate_runs ≥ 2`.
- Solution-architect → opus when the epic has `risk: high`.

## Domain → engineer
react-web, vite-build → `frontend-engineer` · react-native → `mobile-engineer` · nestjs →
`backend-engineer` · supabase, postgres → `data-engineer` · aws, terraform, turbo-monorepo →
`infra-engineer` · bedrock-agentcore → `ai-engineer`.

## Workflow depth by ticket risk
| risk | design | staff critique at refinement | reviewers after build | QA |
|---|---|---|---|---|
| small | only if `ui:true` | no | gates + `code-reviewer` | evidence per TAC; reuse gate output |
| normal | if `ui:true` | yes | engineering routing panel (diff ∩ manifest) | full |
| high | if `ui:true` | yes | full panel + security + performance | full + negative/abuse cases |

## Conditional roles (don't fire what isn't needed)
- `ui-ux-designer` ⇐ ticket `ui: true`
- `business-analyst` ⇐ epic has measurable outcomes / metrics in scope
- `devops-engineer` ⇐ epic touches migrations, env vars, CI, infra, or deploy config
- `staff-engineer` critique ⇐ any ticket risk ≥ normal, or epic risk = high
- 2nd refinement round ⇐ staff-engineer or solution-architect raised a blocker
- `delivery-manager` ⇐ epic report and `/sdlckit-team:board --report` only; plain `/sdlckit-team:board` is a script
