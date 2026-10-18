---
name: eng-aws
description: "AWS rulebook: IAM least privilege, networking, ECS and Fargate, Lambda, API Gateway, S3, queues and events, Step Functions, CloudFront, Aurora, observability, reliability and cost."
category: infra
version: 0.1.0
status: current
verified: 2026-10-18
claudeCodeVersion: 2.1.302
---
# AWS rules

Evaluate every design across: **Availability · Security · Performance · Scalability · Cost ·
Operability · Failure modes.**

## IAM (the most common finding)
- **Least privilege always.** No `*` actions or `*` resources unless truly unavoidable and
  justified. Scope by resource ARN and condition. One role per workload; no shared god-roles.
- No long-lived access keys where a role works. No secrets in task defs/env — use Secrets Manager/
  SSM. Flag privilege escalation paths (iam:PassRole misuse, wildcard trust policies).

## Networking
- Private subnets for compute; public only where required. Security groups scoped to least ports/
  sources. No `0.0.0.0/0` ingress on sensitive ports. VPC endpoints for AWS-service traffic.

## Compute (ECS/Fargate, Lambda)
- Right-size CPU/memory; set concurrency limits and timeouts. Handle Lambda cold starts; keep
  payloads/duration bounded. ECS: health checks, graceful shutdown, autoscaling policy.

## Messaging & storage
- SQS: DLQs + redrive + idempotent consumers + visibility timeout matched to processing. S3:
  block public access by default, encrypt, scope bucket policies, presigned URLs for uploads.
  EventBridge/SNS: explicit schemas, retry/DLQ.

## Reliability & observability
- Multi-AZ where it matters; define failure + retry + backpressure behavior. Emit logs/metrics/
  traces (CloudWatch/X-Ray); alarms on error rate/latency/throttles. Tag resources for cost.

## Cost
- Flag always-on resources that could be on-demand, oversized instances, missing lifecycle
  policies, cross-AZ/egress-heavy designs.

Version/limit/behavior claims must be **verified against current AWS docs**, not remembered.

Emit the YAML findings contract (the `findings-contract` rulebook).
