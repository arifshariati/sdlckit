#!/usr/bin/env node
import { resolve } from "node:path";
import { buildPlugins } from "./build.js";
import { checkOutputs, writeOutputs } from "./write.js";

/**
 * Usage: sdlckit-generate [--check] [root]
 *
 * Default: regenerates plugins/ and .claude-plugin/marketplace.json from content/.
 * --check: exits 1 if the committed output differs from a fresh build. Use this in CI.
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const check = args.includes("--check");
  const root = resolve(args.find((arg) => !arg.startsWith("--")) ?? ".");

  const files = await buildPlugins(root);

  if (check) {
    const problems = await checkOutputs(root, files);
    if (problems.length > 0) {
      for (const problem of problems) console.log(`DRIFT ${problem}`);
      console.log(
        "\nGenerated output is out of date. Run `sdlckit-generate` and commit the result.",
      );
      process.exitCode = 1;
      return;
    }
    console.log(`Generated output is up to date (${files.length} files).`);
    return;
  }

  await writeOutputs(root, files);
  console.log(`Wrote ${files.length} generated files.`);
}

main().catch((cause: unknown) => {
  console.error(cause instanceof Error ? cause.message : cause);
  process.exitCode = 2;
});
