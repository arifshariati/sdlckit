import { execFile } from "node:child_process";
import { join } from "node:path";
import type { CommandGate, Gate, PluginValidateGate } from "./gates.js";

export type GateStatus = "pass" | "fail";

export interface GateResult {
  id: string;
  label: string;
  status: GateStatus;
  exitCode: number;
  /** Combined stdout and stderr from every command the gate ran. */
  output: string;
}

/** Runs one shell-free command and resolves with its exit code and combined output. */
export type CommandRunner = (
  command: string,
  args: readonly string[],
  cwd: string,
) => Promise<{ exitCode: number; output: string }>;

export const execRunner: CommandRunner = (command, args, cwd) =>
  new Promise((resolve) => {
    execFile(
      command,
      [...args],
      { cwd, maxBuffer: 64 * 1024 * 1024 },
      (error, stdout, stderr) => {
        const output = `${stdout}${stderr}`;
        if (!error) {
          resolve({ exitCode: 0, output });
          return;
        }
        // A missing binary reports a string code, such as ENOENT. Surface it as a failing exit with the message.
        const exitCode = typeof error.code === "number" ? error.code : 127;
        resolve({ exitCode, output: output || error.message });
      },
    );
  });

/** Runs every gate, in order, and reports each one. A failing gate never stops the rest. */
export async function runGates(
  gates: readonly Gate[],
  root: string,
  runner: CommandRunner = execRunner,
): Promise<GateResult[]> {
  const results: GateResult[] = [];
  for (const gate of gates) {
    results.push(
      gate.kind === "command"
        ? await runCommandGate(gate, root, runner)
        : await runPluginGate(gate, root, runner),
    );
  }
  return results;
}

async function runCommandGate(
  gate: CommandGate,
  root: string,
  runner: CommandRunner,
): Promise<GateResult> {
  const { exitCode, output } = await runner(gate.command, gate.args, root);
  return toResult(gate, exitCode, output);
}

async function runPluginGate(
  gate: PluginValidateGate,
  root: string,
  runner: CommandRunner,
): Promise<GateResult> {
  const sections: string[] = [];
  let worst = 0;
  for (const target of gate.targets) {
    const { exitCode, output } = await runner(
      gate.claudeBin,
      ["plugin", "validate", join(root, target)],
      root,
    );
    sections.push(`$ ${gate.claudeBin} plugin validate ${target}\n${output}`);
    if (exitCode !== 0) worst = exitCode;
  }
  return toResult(gate, worst, sections.join("\n"));
}

function toResult(
  gate: { id: string; label: string },
  exitCode: number,
  output: string,
): GateResult {
  return {
    id: gate.id,
    label: gate.label,
    status: exitCode === 0 ? "pass" : "fail",
    exitCode,
    output,
  };
}

/** Human-readable report. Failing gates show their full output, and passing gates show a single line. */
export function formatReport(results: readonly GateResult[]): string {
  const lines: string[] = [];
  for (const result of results) {
    const mark = result.status === "pass" ? "PASS" : "FAIL";
    lines.push(`${mark}  ${result.id}  ${result.label}`);
    if (result.status === "fail") {
      lines.push(result.output.trimEnd(), "");
    }
  }
  const failed = results
    .filter((result) => result.status === "fail")
    .map((result) => result.id);
  lines.push(
    "",
    failed.length === 0
      ? `All ${results.length} gates passed.`
      : `${failed.length} of ${results.length} gates failed: ${failed.join(", ")}.`,
  );
  return lines.join("\n");
}
