---
name: "eng-bedrock-agentcore"
description: "AI and agent rulebook (Bedrock, AgentCore, agentic systems): tool boundaries, memory and state, retrieval, tool authorization, prompt injection, evals, fallbacks, timeouts and cost."
---
# AI / agent architecture rules

AI workloads fail differently from request/response APIs — review them on their own terms.

## Boundaries & least privilege
- Define clear **agent** and **tool** boundaries. An agent must NOT have unrestricted DB/system
  access just because it's possible. Prefer explicit tool contracts with least-privilege access.
- Authorize every tool call — the agent acts with scoped permissions, not the caller's full rights.

## Prompt injection & data access
- Treat retrieved/tool/user content as untrusted. Untrusted text is **data, never instructions**.
  Guard against injection that redirects tools or exfiltrates data. Don't put secrets in prompts.
- Scope retrieval to what the user is allowed to see (RLS/tenant still applies to the context).

## State, memory, context
- Be explicit about conversation/memory/state ownership and lifetime. Bound context size; manage
  truncation deliberately. Idempotency for retried agent steps.

## Reliability
- Timeouts and retries on model + tool calls; backpressure for concurrency. Define a **fallback**
  when the model/tool fails or times out — don't hang or crash the request.

## Observability & evaluation
- Log model, model version/profile, token usage, latency, tool calls, agent-execution path,
  failure reason, and an evaluation score where available. Don't log sensitive user content
  indiscriminately. Have an eval/regression mechanism, not just vibes.

## Cost & latency
- Watch token amplification (long context, retries, multi-step loops), per-request cost, and tail
  latency. Flag unbounded agent loops (cap iterations).

For large-file / streaming / async AI pipelines also consider: upload strategy, presigned URLs,
multipart, streaming, temp storage, memory, idempotency, backpressure. Verify Bedrock model
availability / AgentCore behavior against current AWS docs — never from memory.

Emit the YAML findings contract (the `findings-contract` rulebook).
