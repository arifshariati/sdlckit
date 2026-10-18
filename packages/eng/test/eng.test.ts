import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { detectStack } from "../src/detect.js";
import { formatGates, runGates } from "../src/gates.js";
import { mainRoot } from "../src/manifest.js";
import { mermaidBlocks } from "../src/mermaid.js";
import { captureMetric, metricsReport } from "../src/metrics.js";

let root: string;

async function write(relative: string, contents: string): Promise<void> {
  const target = join(root, relative);
  await mkdir(join(target, ".."), { recursive: true });
  await writeFile(target, contents);
}

function git(...args: string[]): void {
  execFileSync("git", args, { cwd: root, stdio: "ignore" });
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "sdlckit-eng-"));
  git("init", "-q", "-b", "main");
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("runGates", () => {
  it("passes only on exit 0, skips null gates, and runs every gate after a failure", async () => {
    await write(
      ".claude/engineering.json",
      JSON.stringify({
        version: 1,
        project: "demo",
        gates: {
          lint: "echo linted",
          typecheck: null,
          test: "echo broken >&2; exit 3",
          build: "echo built",
        },
      }),
    );
    const run = runGates(root, ["lint", "typecheck", "test", "build"]);
    expect(run.results.map((r) => [r.gate, r.status, r.exitCode])).toEqual([
      ["lint", "pass", 0],
      ["typecheck", "skip", null],
      ["test", "fail", 3],
      ["build", "pass", 0],
    ]);
    expect(run.passed).toBe(false);
    const report = formatGates(run);
    expect(report).toContain("broken");
    expect(report.trimEnd().endsWith("GATES: FAIL")).toBe(true);
  });

  it("explains a missing manifest", () => {
    expect(() => runGates(root)).toThrow("Run /eng-init first");
  });
});

describe("mainRoot", () => {
  it("resolves the main checkout from inside a linked worktree", async () => {
    await write("a.txt", "a\n");
    git("add", "-A");
    git(
      "-c",
      "user.email=t@example.com",
      "-c",
      "user.name=t",
      "commit",
      "-qm",
      "init",
    );
    git("worktree", "add", "-q", join(root, "wt"), "-b", "side");
    expect(mainRoot(join(root, "wt"))).toBe(mainRoot(root));
  });
});

describe("detectStack", () => {
  it("reports what the files prove, ignoring node_modules", async () => {
    await write(
      "package.json",
      JSON.stringify({
        packageManager: "pnpm@10.0.0",
        scripts: { lint: "biome check .", test: "vitest" },
      }),
    );
    await write("pnpm-lock.yaml", "");
    await write("turbo.json", "{}");
    await write(
      "apps/web/package.json",
      JSON.stringify({
        dependencies: { react: "19", "react-dom": "19", vite: "8" },
      }),
    );
    await write(
      "apps/api/package.json",
      JSON.stringify({ dependencies: { "@nestjs/core": "11", pg: "8" } }),
    );
    await write(
      "node_modules/expo/package.json",
      JSON.stringify({ name: "expo" }),
    );
    const report = detectStack(root);
    expect(report.packageManager).toBe("pnpm");
    expect(report.monorepo).toBe("turbo");
    expect(report.domains).toMatchObject({
      "react-web": true,
      "react-native": false,
      nestjs: true,
      "vite-build": true,
      postgres: true,
      terraform: false,
    });
    expect(report.gateCandidates).toMatchObject({
      lint: "pnpm lint",
      test: "pnpm test",
      typecheck: "",
    });
  });
});

describe("metrics", () => {
  it("captures records and reports counts without prompt content", async () => {
    const data = join(root, "data");
    captureMetric(data, "demo", {
      event: "run",
      command: "implement",
      duration_s: 10,
    });
    captureMetric(data, "demo", {
      event: "finding",
      severity: "major",
      auto_fixed: true,
    });
    captureMetric(data, "demo", {
      event: "finding",
      severity: "minor",
      source: "human_pr",
    });
    const report = metricsReport(data, "demo");
    expect(report).toContain("## Runs (1)");
    expect(report).toContain("auto-fixed: 1/2 (50%)");
    expect(report).toContain("human PR comments logged: 1");
    const raw = await readFile(
      join(data, "metrics", "demo", "events.jsonl"),
      "utf8",
    );
    expect(raw.split("\n").filter(Boolean)).toHaveLength(3);
  });

  it("refuses a project name that could escape the data folder", () => {
    expect(() =>
      captureMetric(join(root, "data"), "../x", { event: "run" }),
    ).toThrow("invalid project name");
  });
});

describe("mermaidBlocks", () => {
  it("extracts each fenced mermaid block", () => {
    const md =
      "a\n```mermaid\ngraph LR\n  A --> B\n```\nb\n```mermaid\npie\n```\n";
    expect(mermaidBlocks(md)).toEqual(["graph LR\n  A --> B", "pie"]);
  });
});
