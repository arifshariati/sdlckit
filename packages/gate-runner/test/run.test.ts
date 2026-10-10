import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  type CommandGate,
  defaultGates,
  pluginValidateGate,
} from "../src/gates.js";
import { type CommandRunner, formatReport, runGates } from "../src/run.js";

const gate = (id: string): CommandGate => ({
  kind: "command",
  id,
  label: `${id} label`,
  command: "pnpm",
  args: [id],
});

/** A runner that fails only the gates named in `failing` and records every call. */
function fakeRunner(failing: string[], calls: string[] = []): CommandRunner {
  return async (command, args) => {
    calls.push([command, ...args].join(" "));
    const id = args.at(-1) ?? "";
    return failing.includes(id)
      ? { exitCode: 1, output: `${id} broke on line 4` }
      : { exitCode: 0, output: `${id} ok` };
  };
}

describe("runGates", () => {
  it("runs every gate even after one fails", async () => {
    const calls: string[] = [];
    const results = await runGates(
      [gate("lint"), gate("test"), gate("build")],
      "/repo",
      fakeRunner(["lint"], calls),
    );
    expect(calls).toHaveLength(3);
    expect(results.map((r) => [r.id, r.status])).toEqual([
      ["lint", "fail"],
      ["test", "pass"],
      ["build", "pass"],
    ]);
  });

  it("keeps the real output of a failing gate", async () => {
    const [result] = await runGates(
      [gate("lint")],
      "/repo",
      fakeRunner(["lint"]),
    );
    expect(result?.output).toBe("lint broke on line 4");
    expect(result?.exitCode).toBe(1);
  });

  it("runs commands in the repo root and never through a shell", async () => {
    const seen: { command: string; args: readonly string[]; cwd: string }[] =
      [];
    const runner: CommandRunner = async (command, args, cwd) => {
      seen.push({ command, args, cwd });
      return { exitCode: 0, output: "" };
    };
    await runGates([gate("lint")], "/repo", runner);
    expect(seen).toEqual([{ command: "pnpm", args: ["lint"], cwd: "/repo" }]);
  });
});

describe("defaultGates", () => {
  it("includes the content and generator checks", () => {
    const ids = defaultGates().map((g) => g.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "lint",
        "typecheck",
        "build",
        "test",
        "content-validate",
        "content-generate-check",
      ]),
    );
  });
});

describe("pluginValidateGate", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "sdlckit-gates-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("is skipped when nothing has been generated", async () => {
    expect(await pluginValidateGate(root, "claude")).toBeUndefined();
  });

  it("targets the marketplace and each plugin folder", async () => {
    await mkdir(join(root, ".claude-plugin"), { recursive: true });
    await writeFile(join(root, ".claude-plugin", "marketplace.json"), "{}");
    await mkdir(join(root, "plugins", "sdlckit-workflow"), { recursive: true });
    await mkdir(join(root, "plugins", "sdlckit-cost"), { recursive: true });

    const found = await pluginValidateGate(root, "claude");
    expect(found?.targets).toEqual([
      ".",
      "plugins/sdlckit-cost",
      "plugins/sdlckit-workflow",
    ]);
  });

  it("fails when Claude Code rejects any target", async () => {
    const results = await runGates(
      [
        {
          kind: "plugin-validate",
          id: "plugin-validate",
          label: "plugins",
          claudeBin: "claude",
          targets: [".", "plugins/a"],
        },
      ],
      root,
      async (_command, args) =>
        args.some((arg) => arg.endsWith("plugins/a"))
          ? { exitCode: 1, output: "plugin.json invalid" }
          : { exitCode: 0, output: "ok" },
    );
    expect(results[0]?.status).toBe("fail");
    expect(results[0]?.output).toContain("plugin.json invalid");
  });
});

describe("formatReport", () => {
  it("shows full output for failures and one line for passes", () => {
    const report = formatReport([
      {
        id: "lint",
        label: "Lint",
        status: "pass",
        exitCode: 0,
        output: "lots of noise",
      },
      {
        id: "test",
        label: "Tests",
        status: "fail",
        exitCode: 1,
        output: "expected 2 got 3",
      },
    ]);
    expect(report).toContain("PASS  lint  Lint");
    expect(report).not.toContain("lots of noise");
    expect(report).toContain("FAIL  test  Tests");
    expect(report).toContain("expected 2 got 3");
    expect(report).toContain("1 of 2 gates failed: test.");
  });

  it("reports success when every gate passes", () => {
    const report = formatReport([
      { id: "lint", label: "Lint", status: "pass", exitCode: 0, output: "" },
    ]);
    expect(report).toContain("All 1 gates passed.");
  });
});
