---
name: "sdlckit-routing"
description: "Use when the user asks, without naming a command, to build, add, fix, debug, investigate, review or check the status of something in a repo that has .claude/engineering.json. Routes the request to the right sdlckit workflow."
---
# Routing bare requests

Apply this only when `<repo>/.claude/engineering.json` exists. Without it, offer `/sdlckit-workflow:eng-init` once
and otherwise behave normally.

| The user asks for | Run |
|---|---|
| A feature, a feature list, or a new user-facing capability spanning several domains, **and** the manifest has `delivery.enabled: true` | `/sdlckit-team:po` (the delivery team) |
| A change: build, add or implement something small or single-domain (a tweak, copy, config, one endpoint), or any change when delivery is not enabled | `/sdlckit-workflow:implement` |
| An existing defect: fix, debug, broken | `/sdlckit-workflow:fix` |
| An explanation or analysis: why, investigate, analyze (read-only) | `/sdlckit-workflow:investigate` |
| A review: review this, is this ready | `/sdlckit-workflow:review`, or `/sdlckit-workflow:pr-ready` before a PR |
| Status: where are we, what's the status, in a repo with `.delivery/` | `/sdlckit-team:board` |

When it is unclear whether a request is epic-sized or a small change, ask in one line.

Core rule for every route: **LLMs reason, tools verify, CI enforces.** Never claim a gate passed
without the real output of `sdlckit-eng gates`.
