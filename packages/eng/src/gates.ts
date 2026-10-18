import { spawnSync } from "node:child_process";
import { readManifest, workTreeRoot } from "./manifest.js";

/** The gates run when none are named: the fast set every change should pass. */
export const DEFAULT_GATES = ["format", "lint", "typecheck", "test"] as const;

export type GateStatus = "pass" | "fail" | "skip";

export interface GateResult {
  gate: string;
  command: string | null;
  status: GateStatus;
  exitCode: number | null;
  output: string;
}

export interface GatesRun {
  root: string;
  results: GateResult[];
  passed: boolean;
}

/**
 * Runs the manifest's exact gate commands in the working tree that contains `cwd`.
 * A gate passes only on exit code 0; a gate the manifest leaves null is skipped, never invented.
 * Every gate runs, even after a failure, so one run shows every problem.
 */
export function runGates(
  cwd: string,
  gates: readonly string[] = DEFAULT_GATES,
): GatesRun {
  const root = workTreeRoot(cwd);
  const manifest = readManifest(root);
  const results: GateResult[] = [];

  for (const gate of gates) {
    const command = manifest.gates[gate] ?? null;
    if (!command) {
      results.push({
        gate,
        command: null,
        status: "skip",
        exitCode: null,
        output: "",
      });
      continue;
    }
    const run = spawnSync("sh", ["-c", command], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
    const output = `${run.stdout ?? ""}${run.stderr ?? ""}`;
    results.push({
      gate,
      command,
      status: run.status === 0 ? "pass" : "fail",
      exitCode: run.status,
      output,
    });
  }

  return { root, results, passed: results.every((r) => r.status !== "fail") };
}

/** The report a person or an agent reads. The final line is the only line to trust. */
export function formatGates(run: GatesRun): string {
  const lines = [`=== Deterministic gates (${run.root}) ===`];
  for (const r of run.results) {
    if (r.status === "skip") {
      lines.push(`• ${r.gate.padEnd(12)} SKIP (not configured in manifest)`);
      continue;
    }
    lines.push(
      "────────────────────────────────────────",
      `▶ ${r.gate}: ${r.command}`,
    );
    if (r.output.trim()) lines.push(r.output.trimEnd());
    lines.push(
      r.status === "pass"
        ? `✓ ${r.gate.padEnd(12)} PASS`
        : `✗ ${r.gate.padEnd(12)} FAIL (exit ${r.exitCode})`,
    );
  }
  lines.push(
    "========================================",
    run.passed ? "GATES: PASS" : "GATES: FAIL",
  );
  return `${lines.join("\n")}\n`;
}
