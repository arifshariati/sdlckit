import { resolve } from "node:path";
import { detectStack } from "./detect.js";
import { DEFAULT_GATES, formatGates, runGates } from "./gates.js";
import { validateMermaid } from "./mermaid.js";
import { captureMetric, dataDir, metricsReport } from "./metrics.js";

const USAGE = `sdlckit-eng <command>
  gates [gate ...]                         run the manifest's gate commands (default: ${DEFAULT_GATES.join(" ")})
  detect [root]                            report package manager, monorepo, domains, gate candidates (JSON)
  metrics capture <project> <json> [--data DIR]
  metrics report <project> [since] [--data DIR]
  mermaid <file.md>                        parse every mermaid block with the real Mermaid CLI`;

function main(argv: string[]): number {
  const dataIndex = argv.indexOf("--data");
  const data = dataIndex >= 0 ? argv[dataIndex + 1] : undefined;
  const args =
    dataIndex >= 0
      ? argv.filter((_, i) => i !== dataIndex && i !== dataIndex + 1)
      : argv;
  const [command, ...rest] = args;

  switch (command) {
    case "gates": {
      const run = runGates(process.cwd(), rest.length ? rest : DEFAULT_GATES);
      process.stdout.write(formatGates(run));
      return run.passed ? 0 : 1;
    }
    case "detect":
      process.stdout.write(
        `${JSON.stringify(detectStack(resolve(rest[0] ?? ".")), null, 2)}\n`,
      );
      return 0;
    case "metrics": {
      const [sub, project, extra] = rest;
      if (!project) break;
      if (sub === "capture" && extra) {
        const file = captureMetric(
          dataDir(data),
          project,
          JSON.parse(extra) as Record<string, unknown>,
        );
        process.stdout.write(`metrics: appended to ${file}\n`);
        return 0;
      }
      if (sub === "report") {
        process.stdout.write(metricsReport(dataDir(data), project, extra));
        return 0;
      }
      break;
    }
    case "mermaid": {
      if (!rest[0]) break;
      const results = validateMermaid(rest[0]);
      if (results.length === 0)
        process.stdout.write(`mermaid: no mermaid blocks in ${rest[0]}\n`);
      for (const r of results) {
        process.stdout.write(
          r.ok
            ? `✓ block ${r.index} parses\n`
            : `✗ block ${r.index} FAILED to parse:\n${r.output}\n`,
        );
      }
      return results.every((r) => r.ok) ? 0 : 1;
    }
  }
  process.stdout.write(`${USAGE}\n`);
  return command ? 2 : 0;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (cause) {
  process.stderr.write(
    `sdlckit-eng: ${cause instanceof Error ? cause.message : String(cause)}\n`,
  );
  process.exitCode = 3;
}
