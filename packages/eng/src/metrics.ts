import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Where per-user metrics live. Commands pass `--data "${CLAUDE_PLUGIN_DATA}"` (decision 27);
 * outside a plugin, `SDLCKIT_DATA` or `~/.sdlckit` is used. Counts only, never prompt content.
 */
export function dataDir(flag?: string): string {
  return flag || process.env.SDLCKIT_DATA || join(homedir(), ".sdlckit");
}

function eventsFile(data: string, project: string): string {
  if (!/^[\w.-]+$/.test(project))
    throw new Error(`invalid project name: ${project}`);
  return join(data, "metrics", project, "events.jsonl");
}

/** Appends one record, stamped with `ts`, to the project's events file. */
export function captureMetric(
  data: string,
  project: string,
  record: Record<string, unknown>,
  now = new Date(),
): string {
  const file = eventsFile(data, project);
  mkdirSync(join(file, ".."), { recursive: true });
  appendFileSync(
    file,
    `${JSON.stringify({ ...record, ts: now.toISOString() })}\n`,
  );
  return file;
}

type Row = Record<string, unknown>;

/** Summarizes runs, findings, review rounds, false positives, and the north-star metric. */
export function metricsReport(
  data: string,
  project: string,
  since = "",
): string {
  const file = eventsFile(data, project);
  if (!existsSync(file)) {
    return `No metrics yet for '${project}'. Run /implement, /fix, or /pr-ready to generate some.\n`;
  }
  const rows: Row[] = readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line) as Row];
      } catch {
        return [];
      }
    })
    .filter((r) => !since || String(r.ts ?? "") >= since);
  const of = (event: string) => rows.filter((r) => r.event === event);
  const by = (list: Row[], key: string) =>
    list.reduce<Record<string, number>>((acc, r) => {
      const k = String(r[key] ?? "?");
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {});
  const pct = (n: number, d: number) => (d ? Math.round((100 * n) / d) : 0);
  const runs = of("run");
  const findings = of("finding");
  const rounds = of("review_round");
  const falsePositives = of("false_positive");
  const durations = runs
    .map((r) => r.duration_s)
    .filter((x): x is number => typeof x === "number");
  const autoFixed = findings.filter((f) => f.auto_fixed === true).length;

  return [
    `# Engineering report: ${project}`,
    `Window: ${since || "all time"}   Records: ${rows.length}`,
    "",
    `## Runs (${runs.length})`,
    `  by command: ${JSON.stringify(by(runs, "command"))}`,
    `  by change_type: ${JSON.stringify(by(runs, "change_type"))}`,
    `  avg duration_s: ${durations.length ? (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1) : "-"}`,
    "",
    `## Findings (${findings.length})`,
    `  by severity: ${JSON.stringify(by(findings, "severity"))}`,
    `  by category: ${JSON.stringify(by(findings, "category"))}`,
    `  auto-fixed: ${autoFixed}/${findings.length} (${pct(autoFixed, findings.length)}%)`,
    "",
    "## Review rounds",
    `  total rounds: ${rounds.length}   avg rounds/run: ${runs.length ? (rounds.length / runs.length).toFixed(2) : "-"}`,
    "",
    `## False positives (${falsePositives.length})`,
    `  FP rate: ${pct(falsePositives.length, findings.length)}% of findings`,
    "",
    "## North-star",
    `  human PR comments logged: ${findings.filter((f) => f.source === "human_pr").length}  (goal: trending down over time)`,
    "",
  ].join("\n");
}
