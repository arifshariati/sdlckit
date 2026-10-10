#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseDenylist } from "./scan.js";
import { type Finding, validateContent } from "./validate.js";

/**
 * Usage: sdlckit-validate [root]
 *
 * Denylist: set SDLCKIT_DENYLIST to a file path. Keep that file outside the repo.
 * Exit code 1 when any error is found. Warnings never fail the run.
 */
async function main(): Promise<void> {
  const root = resolve(process.argv[2] ?? ".");
  const denylistPath = process.env.SDLCKIT_DENYLIST;
  const denylist = denylistPath
    ? parseDenylist(await readFile(denylistPath, "utf8"))
    : [];

  const findings = await validateContent({ root, denylist });
  printFindings(findings);

  const errors = findings.filter(
    (finding) => finding.severity === "error",
  ).length;
  const warnings = findings.length - errors;
  console.log(`\n${errors} error(s), ${warnings} warning(s)`);

  process.exitCode = errors > 0 ? 1 : 0;
}

function printFindings(findings: readonly Finding[]): void {
  for (const finding of findings) {
    const location = finding.line
      ? `${finding.file}:${finding.line}`
      : finding.file;
    console.log(
      `${finding.severity.toUpperCase()} ${location} [${finding.rule}] ${finding.message}`,
    );
  }
}

main().catch((cause: unknown) => {
  console.error(cause);
  process.exitCode = 2;
});
