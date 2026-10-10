import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type Finding, validateContent } from "../src/validate.js";

const NOW = new Date("2026-10-10T00:00:00Z");

function item(overrides: Record<string, string> = {}): string {
  const fields: Record<string, string> = {
    name: "plan-first",
    description: "Plan the change before editing any file",
    category: "workflow",
    version: "1.0.0",
    status: "current",
    verified: "2026-10-01",
    claudeCodeVersion: "2.1.0",
    ...overrides,
  };
  const lines = Object.entries(fields).map(
    ([key, value]) => `${key}: ${value}`,
  );
  return `---\n${lines.join("\n")}\n---\n\n# Plan first\n\nBody text.\n`;
}

describe("validateContent", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "sdlckit-validate-"));
    await mkdir(join(root, "content", "skills"), { recursive: true });
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  async function write(relative: string, contents: string): Promise<void> {
    const target = join(root, relative);
    await mkdir(join(target, ".."), { recursive: true });
    await writeFile(target, contents);
  }

  function run(denylist: string[] = []): Promise<Finding[]> {
    return validateContent({ root, denylist, now: NOW });
  }

  it("passes a valid, current item with no findings", async () => {
    await write("content/skills/plan-first.md", item());
    expect(await run()).toEqual([]);
  });

  it("returns nothing when content/ does not exist", async () => {
    await rm(join(root, "content"), { recursive: true });
    expect(await run()).toEqual([]);
  });

  it("rejects a name that is not kebab-case", async () => {
    await write("content/skills/plan-first.md", item({ name: "Plan_First" }));
    const findings = await run();
    expect(
      findings.some(
        (f) => f.rule === "frontmatter" && f.message.includes("kebab-case"),
      ),
    ).toBe(true);
  });

  it("rejects a frontmatter name that differs from the filename", async () => {
    await write("content/skills/plan-first.md", item({ name: "other-name" }));
    const findings = await run();
    expect(findings.some((f) => f.rule === "name")).toBe(true);
  });

  it("rejects a non-semver version", async () => {
    await write("content/skills/plan-first.md", item({ version: "v1" }));
    const findings = await run();
    expect(findings.some((f) => f.message.includes("semver"))).toBe(true);
  });

  it("rejects an unknown category", async () => {
    await write("content/skills/plan-first.md", item({ category: "misc" }));
    expect((await run()).some((f) => f.rule === "frontmatter")).toBe(true);
  });

  it("requires a replacement when status is superseded", async () => {
    await write("content/skills/plan-first.md", item({ status: "superseded" }));
    const findings = await run();
    expect(
      findings.some((f) => f.message.includes("must name their replacement")),
    ).toBe(true);
  });

  it("accepts a superseded item that names its replacement", async () => {
    await write(
      "content/skills/plan-first.md",
      item({ status: "superseded", replacedBy: "native-plan-mode" }),
    );
    expect(await run()).toEqual([]);
  });

  it("rejects a verified date that is not a real date", async () => {
    await write(
      "content/skills/plan-first.md",
      item({ verified: "2026-02-30" }),
    );
    expect((await run()).some((f) => f.message.includes("real date"))).toBe(
      true,
    );
  });

  it("warns, but does not error, when a current item is older than 90 days", async () => {
    await write(
      "content/skills/plan-first.md",
      item({ verified: "2026-01-01" }),
    );
    const findings = await run();
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("warning");
    expect(findings[0]?.rule).toBe("stale");
  });

  it("does not flag staleness for superseded items", async () => {
    await write(
      "content/skills/plan-first.md",
      item({
        verified: "2026-01-01",
        status: "superseded",
        replacedBy: "native-plan-mode",
      }),
    );
    expect(await run()).toEqual([]);
  });

  it("rejects an item placed outside a known content folder", async () => {
    await write("content/misc/plan-first.md", item());
    expect((await run()).some((f) => f.rule === "location")).toBe(true);
  });

  it("rejects duplicate names across folders", async () => {
    await write("content/skills/plan-first.md", item());
    await write("content/agents/plan-first.md", item());
    expect((await run()).some((f) => f.rule === "unique-name")).toBe(true);
  });

  it("flags a machine-specific path in the body", async () => {
    await write(
      "content/skills/plan-first.md",
      `${item()}\nSee /Users/someone/project.\n`,
    );
    const findings = await run();
    expect(
      findings.some(
        (f) => f.rule === "scan:machine-path" && f.line !== undefined,
      ),
    ).toBe(true);
  });

  it("flags a secret-shaped value", async () => {
    await write(
      "content/skills/plan-first.md",
      `${item()}\nKey sk-ant-abcdefghijklmnopqrstuvwx\n`,
    );
    expect((await run()).some((f) => f.rule === "scan:secret")).toBe(true);
  });

  it("flags a denylisted personal term, case-insensitively", async () => {
    await write(
      "content/skills/plan-first.md",
      `${item()}\nWritten for ProjectZebra.\n`,
    );
    const findings = await run(["projectzebra"]);
    expect(findings.some((f) => f.rule === "scan:denylist")).toBe(true);
  });
});
