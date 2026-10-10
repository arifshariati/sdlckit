#!/usr/bin/env node
import { resolve } from "node:path";
import { defaultGates, type Gate, pluginValidateGate } from "./gates.js";
import { formatReport, runGates } from "./run.js";

/**
 * Usage: sdlckit-gates [root]
 *
 * Runs every gate and prints the real output of any that fail.
 * Exit code 0 only when every gate passes. Set SDLCKIT_CLAUDE_BIN to choose the Claude Code binary.
 */
async function main(): Promise<void> {
  const root = resolve(process.argv[2] ?? ".");
  const claudeBin = process.env.SDLCKIT_CLAUDE_BIN ?? "claude";

  const gates: Gate[] = defaultGates();
  const pluginGate = await pluginValidateGate(root, claudeBin);
  if (pluginGate) gates.push(pluginGate);

  const results = await runGates(gates, root);
  console.log(formatReport(results));
  process.exitCode = results.every((result) => result.status === "pass")
    ? 0
    : 1;
}

main().catch((cause: unknown) => {
  console.error(cause instanceof Error ? cause.message : cause);
  process.exitCode = 2;
});
