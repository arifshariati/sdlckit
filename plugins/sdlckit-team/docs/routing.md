# Delivery routing — haiku everywhere, effort per role

Machine-readable source: `routing.json` at the plugin root (read by `sdlckit-delivery model`). This file explains it.
Engineering-review routing (which reviewers fire for a diff) stays in
`the `sdlckit-workflow:review-routing` skill` and is reused unchanged.

## How a model and effort are chosen
1. Every delivery role runs on **haiku** (`routing.json` → `model`). There is no model tier to pick.
2. Each role has a default **effort** level (`routing.json` → `effort`), mirrored in the agent's
   frontmatter `effort:`.
3. Before every dispatch the orchestrator runs `sdlckit-delivery model <role> [<ticket|epic>]` and
   passes the returned `model` and `effort` to the Agent tool. Agents never choose their own.
4. When rework or risk demands more care, effort rises (see Escalation). Each raise is written to the
   ticket's `effort_overrides` (audit trail, shown in the epic report).

## Effort by role
| role | effort | why |
|---|---|---|
| tech-lead, qa-specialist | xhigh | decomposition, Definition of Ready, the done-verdict: errors compound |
| solution-architect, staff-engineer, product-owner | high | design judgment and independent challenge |
| ui-ux-designer, business-analyst, devops-engineer | medium | structured output with clear rules |
| domain engineers | medium (`low` for risk=small tickets) | deterministic gates and review catch most slips |
| technical-writer, delivery-manager | low | summarising records that already exist |

Effort levels, lowest to highest: `low` · `medium` · `high` · `xhigh` · `max`.

## Escalation (effort only, never a different model)
- Engineer → raised to `high` when `qa_round ≥ 2` or `red_gate_runs ≥ 2`.
- Solution-architect → raised to `xhigh` when the epic has `risk: high`.
- Escalation never lowers effort: it takes the higher of the role default and the escalation level.

## Domain → engineer
react-web, vite-build → `frontend-engineer` · react-native → `mobile-engineer` · nestjs →
`backend-engineer` · supabase, postgres → `data-engineer` · aws, terraform, turbo-monorepo →
`infra-engineer` · bedrock-agentcore → `ai-engineer`.

## Workflow depth by ticket risk
| risk | design | staff critique | reviewers after build | QA |
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
