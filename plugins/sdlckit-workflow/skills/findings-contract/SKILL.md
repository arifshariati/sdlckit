---
name: "findings-contract"
description: "The YAML output contract every sdlckit reviewer and domain expert returns: status, findings with severity, confidence, file, line, problem and recommendation, plus risks and required tests."
---
# Agent output contract

Every specialist/reviewer returns **this YAML**, nothing else. Prose-only answers are a bug.

```yaml
agent: <agent-id>
status: passed            # passed | findings | blocked
summary: <one short paragraph — the headline for the orchestrator>
findings:
  - id: <PREFIX-NNN>       # e.g. NEST-001, REACT-002, SEC-003
    severity: blocker      # blocker | major | minor | suggestion
    confidence: high       # high | medium | low
    category: <architecture|security|performance|correctness|testing|maintainability|style>
    file: <repo-relative path>
    line: <int>
    problem: <what is wrong, concretely>
    recommendation: <the concrete fix>
    blocking: true         # true only for blocker/major
risks: [ <forward-looking risks not tied to one line> ]
tests_required: [ <behavior that must be covered> ]
evidence: verified         # verified | inference | tbd   (see SPEC §9)
```

## Severity → gating
| Severity | Meaning | Gates workflow? |
|---|---|---|
| blocker | security vuln, data-corruption, broken arch, outage risk, bad authz, destructive infra | **yes** |
| major | wrong business behavior, missing critical error handling/test, significant perf, bad IAM | **yes (before PR)** |
| minor | maintainability, local duplication, weak abstraction, non-critical edge case | no (should fix) |
| suggestion | style, alternative impl, non-material refactor | **never** |

## Reviewer discipline
Distinguish: real defect vs architectural concern vs maintainability vs optional improvement vs
personal preference. Review the **actual diff**, not the implementer's description. Ask: would this
survive production traffic / failure / malicious input / a future developer / a rollback?
