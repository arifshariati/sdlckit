# sdlckit team

An AI software team, shipped as the `sdlckit-team` plugin, that works in any repo. You are the
**Product Owner**. You say *what* you need and *why*; the team plans, designs, builds, tests and
documents it, and comes back to you at three gates. 

> LLMs reason. Tools verify. CI enforces. Every state change goes through `sdlckit-delivery`, which
> refuses moves whose evidence is missing — agents cannot declare work done.

---

## 1. The flow

```
 YOU ──/sdlckit-team:po──▶ PO interviews you ──▶ epics ──▶ [GATE 1: intake]
                                                   │
          /sdlckit-team:refine ◀────────────────────────────────┘
   solution-architect → tech-lead → staff-engineer + architect + PO critique (≤2 rounds)
                                                   │
                                   [GATE 2: plan] ◀┘
                                                   │
          /sdlckit-team:deliver ◀───────────────────────────────┘
   per ticket: design (ui only) → QA test plan → engineer (own worktree) → review panel
               → QA verify ⇄ rework (≤3) → technical-writer → merge → done
                                                   │
                             [GATE 3: acceptance] ◀┘  /sdlckit-team:accept → push + one PR
```

You approve **intake** (is this what I want?), **plan** (is this how we'll build it?) and
**acceptance** (is it done?). Everything between is handled by the team, and anything that
genuinely needs you is asked one question at a time, always with a recommended answer.

## 2. Commands

| Command | When | What happens |
|---|---|---|
| `/sdlckit-workflow:eng-init` | once per repo | detects the stack, confirms gates, enables delivery, scaffolds `.delivery/` |
| `/sdlckit-team:po <idea \| list \| file>` | you have something you want | PO interviews you (≤5 questions per epic), drafts epics, **intake gate** |
| `/sdlckit-team:refine E-###` | after intake | architecture, ticket breakdown, critique, **plan gate** |
| `/sdlckit-team:deliver E-###` | after plan approval | design → build → review → QA → docs → merge for every ticket |
| `/sdlckit-team:accept E-###` | delivery finished | integration gates on the merged branch, the epic report, **acceptance gate**, push + PR on your yes |
| `/sdlckit-team:board [--report]` | any time | status of every epic and ticket (free; `--report` adds a short narrative) |
| `/sdlckit-team:team` | "just get on with it" | autopilot: advances every epic as far as it can, then asks your pending gates |

Bare requests work too in repos with delivery enabled: a feature-sized ask goes to `/sdlckit-team:po`, a small
change goes to `/sdlckit-workflow:implement`, "where are we?" goes to `/sdlckit-team:board`.

## 3. The team

| Role | Does | Model (balanced) |
|---|---|---|
| product-owner | your proxy: drafts epics, checks breakdowns and designs against your intent, honest acceptance gaps | Sonnet |
| business-analyst | success metrics + instrumentation (only when you want measurement) | Sonnet |
| solution-architect | epic design: data model, exact contracts, NFRs, ADRs | Sonnet (Opus for high-risk epics) |
| tech-lead | tickets, acceptance criteria, sequencing, design buildability, escalations | **Opus** |
| staff-engineer | independent challenger: hidden work, risk, sizing, simpler alternatives | Sonnet |
| ui-ux-designer | spec-only `design.md` with exact shadcn components, every state, final copy | Sonnet |
| frontend / mobile / backend / data / infra / ai engineer | build one ticket in its own git worktree, run the gates | Sonnet (Opus after 2 QA rounds) |
| qa-specialist | test plan before code, locked acceptance tests, evidence per criterion | **Opus** |
| technical-writer | docs + changelog per ticket | Sonnet |
| devops-engineer | release notes: deploy/migration order, env vars, rollback (only when needed) | Sonnet |
| delivery-manager | the epic report and status narratives | Sonnet |

Your existing engineering reviewers (code, security, testing, performance, domain experts) review
every build, chosen by risk and by what the diff touches. Change the budget per repo with
`delivery.budget`: `lean`, `balanced` (default) or `max` — see `routing.md` in this folder.

## 4. What lives where

**Installed once (the plugins):** `sdlckit-team` (roles, commands, rulebooks, `sdlckit-delivery`), with `sdlckit-workflow`, `sdlckit-backend`, `sdlckit-frontend` and `sdlckit-infra` as dependencies.

**Per repo (committed):**
```
.claude/engineering.json   manifest: gates, domains, delivery settings, docs mapping
.delivery/
  intake/    your interview answers (the PO's only source of intent)
  epics/     E-###  WHAT/WHY, AC, architecture, plan, decisions, changelog
  tickets/   T-###  ticket AC, technical approach, notes, QA log, docs
  designs/   T-###/design.md + review.md
  qa/        T-###/plan.md, report.md, gates.log, review.md, tests.lock
  reports/   E-###.md  the report you read at acceptance
```
Scratch (gitignored): `.delivery/.worktrees/`, `.delivery/BOARD.md`, QA screenshots.

**Git:** each epic gets `epic/E-###` in its own worktree; each ticket gets `ticket/T-###` branched
from it. Ticket branches merge into the epic branch locally after QA. Nothing is pushed until you
accept; then one PR per epic. Your main checkout is never touched.

## 5. Guarantees enforced by the script

- A ticket can't start without a QA test plan written **before** code.
- It can't reach QA unless gates are green **at its current commit** and review has no open
  blocker/major findings at that commit.
- QA's verdict is tied to the exact commit it tested; a later code change makes it stale.
- QA's acceptance tests are hash-locked — an engineer can't weaken them.
- `done` requires evidence on every criterion, docs, a changelog line, and the merge.
- A plan can't lock if a contract (error code or route) appears in the architecture but no ticket,
  or vice versa (`sdlckit-delivery drift`).
- Every agent reply is validated against one contract (`sdlckit-delivery contract-check`).

## 6. Repos with their own docs

Set `delivery.docs` in the manifest to map the repo's conventions:
```jsonc
"docs": {
  "adrDir": "docs/adr",            // ADRs written here in the repo's NNNN-slug.md style
  "statusFile": "docs/STATUS.md",  // its ID table + pie are rendered from .delivery (sdlckit-delivery status-md)
  "inputs": { "plan": "docs/plan/00-INDEX.md", "uiStrategy": "docs/ui/UI-STRATEGY.md" }
}
```
Epics carry the repo's own IDs as `ref` (e.g. `UIUX-04`). Stacks the system doesn't know map to
an engineer with `delivery.engineers` (e.g. `{"fastify-api": "backend-engineer"}`).

## 7. Useful script commands

| | |
|---|---|
| `D board` | render the board |
| `D next E-###` | what can move now (JSON) |
| `D show <id>` · `D path <id> [kind]` | read a record / find its files |
| `D stats E-###` | numbers for reports |
| `D status-md [--in E-###]` | render the repo status file |
| `D drift E-###` | contract drift check |

## 8. Tips

- Give `/sdlckit-team:po` a whole feature list; it confirms the epic map once, asks shared questions once, and
  keeps per-epic questions to the minimum.
- "Decisions for you" at the plan gate are the real trade-offs — each comes with both positions
  and a recommendation.
- If a run is interrupted, re-run the same command or `/sdlckit-team:team`: everything resumes from the records.
- After the epic PR merges: `D cleanup E-###` removes the worktrees.
