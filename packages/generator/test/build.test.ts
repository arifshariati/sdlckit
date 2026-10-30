import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildPlugins, type OutputFile } from "../src/build.js";
import { checkOutputs, writeOutputs } from "../src/write.js";

const PACK = {
  version: "1.2.0",
  description: "The core SDLC workflow: plan, implement, review, and ship",
  dependencies: ["sdlckit-cost"],
};

function item(name: string, category: string, body = "Body text."): string {
  return [
    "---",
    `name: ${name}`,
    "description: Plan the change before editing any file",
    `category: ${category}`,
    "version: 1.0.0",
    "status: current",
    "verified: 2026-10-01",
    "claudeCodeVersion: 2.1.0",
    "---",
    "",
    body,
    "",
  ].join("\n");
}

describe("buildPlugins", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "sdlckit-generate-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  async function write(relative: string, contents: string): Promise<void> {
    const target = join(root, relative);
    await mkdir(join(target, ".."), { recursive: true });
    await writeFile(target, contents);
  }

  function paths(files: OutputFile[]): string[] {
    return files.map((file) => file.path);
  }

  it("returns nothing when no pack has a pack.json", async () => {
    expect(await buildPlugins(root)).toEqual([]);
  });

  it("emits a plugin manifest and a marketplace entry for each pack", async () => {
    await write("content/workflow/pack.json", JSON.stringify(PACK));
    const files = await buildPlugins(root);

    const manifest = JSON.parse(
      files.find(
        (f) => f.path === "plugins/sdlckit-workflow/.claude-plugin/plugin.json",
      )?.contents ?? "{}",
    );
    expect(manifest).toMatchObject({
      name: "sdlckit-workflow",
      version: "1.2.0",
      license: "MIT",
      dependencies: ["sdlckit-cost"],
    });

    const marketplace = JSON.parse(
      files.find((f) => f.path === ".claude-plugin/marketplace.json")
        ?.contents ?? "{}",
    );
    expect(marketplace.name).toBe("sdlckit");
    expect(marketplace.plugins).toEqual([
      {
        name: "sdlckit-workflow",
        source: "./plugins/sdlckit-workflow",
        description: PACK.description,
      },
    ]);
  });

  it("writes skills and rulebooks as skills/<name>/SKILL.md with only name and description", async () => {
    await write("content/workflow/pack.json", JSON.stringify(PACK));
    await write(
      "content/workflow/skills/plan-first.md",
      item("plan-first", "workflow", "Plan before editing."),
    );
    await write(
      "content/workflow/rulebooks/eng-testing.md",
      item("eng-testing", "workflow"),
    );

    const files = await buildPlugins(root);
    const skill = files.find(
      (f) => f.path === "plugins/sdlckit-workflow/skills/plan-first/SKILL.md",
    );
    expect(skill?.contents).toBe(
      '---\nname: "plan-first"\ndescription: "Plan the change before editing any file"\n---\nPlan before editing.\n',
    );
    expect(skill?.contents).not.toContain("status:");
    expect(paths(files)).toContain(
      "plugins/sdlckit-workflow/skills/eng-testing/SKILL.md",
    );
  });

  it("writes agents and commands as flat Markdown files", async () => {
    await write("content/workflow/pack.json", JSON.stringify(PACK));
    await write(
      "content/workflow/agents/reviewer.md",
      item("reviewer", "workflow"),
    );
    await write(
      "content/workflow/commands/implement.md",
      item("implement", "workflow"),
    );

    const files = paths(await buildPlugins(root));
    expect(files).toContain("plugins/sdlckit-workflow/agents/reviewer.md");
    expect(files).toContain("plugins/sdlckit-workflow/commands/implement.md");
  });

  it("refuses a content type the generator does not support yet", async () => {
    await write("content/workflow/pack.json", JSON.stringify(PACK));
    await write("content/workflow/hooks/cost.md", item("cost", "workflow"));
    await expect(buildPlugins(root)).rejects.toThrow(
      "not supported by the generator yet",
    );
  });

  it("rejects a pack.json with a non-semver version", async () => {
    await write(
      "content/workflow/pack.json",
      JSON.stringify({ ...PACK, version: "v1" }),
    );
    await expect(buildPlugins(root)).rejects.toThrow("semver");
  });

  it("is deterministic: the same input yields the same output in the same order", async () => {
    await write("content/workflow/pack.json", JSON.stringify(PACK));
    await write(
      "content/workflow/skills/b-skill.md",
      item("b-skill", "workflow"),
    );
    await write(
      "content/workflow/skills/a-skill.md",
      item("a-skill", "workflow"),
    );

    const first = await buildPlugins(root);
    const second = await buildPlugins(root);
    expect(second).toEqual(first);
    expect(paths(first)).toEqual([...paths(first)].sort());
  });
  it("keeps runtime fields on agents and commands, in a fixed order", async () => {
    await write("content/workflow/pack.json", JSON.stringify(PACK));
    await write(
      "content/workflow/agents/reviewer.md",
      item("reviewer", "workflow").replace(
        "claudeCodeVersion: 2.1.0",
        "claudeCodeVersion: 2.1.0\nskills: [eng-testing]\ntools: Bash, Read\nmodel: haiku",
      ),
    );
    const files = await buildPlugins(root);
    const agent = files.find((f) => f.path.endsWith("agents/reviewer.md"));
    expect(agent?.contents).toBe(
      [
        "---",
        'name: "reviewer"',
        'description: "Plan the change before editing any file"',
        'model: "haiku"',
        'tools: "Bash, Read"',
        'skills: ["eng-testing"]',
        "---",
        "Body text.",
        "",
      ].join("\n"),
    );
  });

  it("copies assets byte for byte into the plugin root", async () => {
    await write("content/workflow/pack.json", JSON.stringify(PACK));
    await write("content/workflow/assets/templates/epic.md", "# {{id}}\n");
    await write("content/workflow/assets/skills/ui/references/a.md", "ref\n");
    const files = await buildPlugins(root);
    expect(files).toContainEqual({
      path: "plugins/sdlckit-workflow/templates/epic.md",
      contents: "# {{id}}\n",
    });
    expect(paths(files)).toContain(
      "plugins/sdlckit-workflow/skills/ui/references/a.md",
    );
  });

  it("writes each pack bin as an executable with one Node shebang", async () => {
    await write(
      "content/workflow/pack.json",
      JSON.stringify({
        ...PACK,
        bin: { "sdlckit-eng": "packages/eng/dist/cli.js" },
      }),
    );
    await write(
      "packages/eng/dist/cli.js",
      "#!/usr/bin/env node\nconsole.log(1);\n",
    );
    const files = await buildPlugins(root);
    expect(files).toContainEqual({
      path: "plugins/sdlckit-workflow/bin/sdlckit-eng",
      contents: "#!/usr/bin/env node\nconsole.log(1);\n",
      mode: 0o755,
    });
  });

  it("explains a bin target that has not been built", async () => {
    await write(
      "content/workflow/pack.json",
      JSON.stringify({
        ...PACK,
        bin: { "sdlckit-eng": "packages/eng/dist/cli.js" },
      }),
    );
    await expect(buildPlugins(root)).rejects.toThrow(
      "bin target packages/eng/dist/cli.js does not exist. Run the build first.",
    );
  });
});

describe("writeOutputs and checkOutputs", () => {
  let root: string;
  const files: OutputFile[] = [
    { path: "plugins/sdlckit-workflow/skills/a/SKILL.md", contents: "A\n" },
    { path: ".claude-plugin/marketplace.json", contents: "{}\n" },
  ];

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "sdlckit-write-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("reports no problems right after writing", async () => {
    await writeOutputs(root, files);
    expect(await checkOutputs(root, files)).toEqual([]);
    expect(
      await readFile(
        join(root, "plugins/sdlckit-workflow/skills/a/SKILL.md"),
        "utf8",
      ),
    ).toBe("A\n");
  });

  it("reports a file that was edited by hand", async () => {
    await writeOutputs(root, files);
    await writeFile(
      join(root, "plugins/sdlckit-workflow/skills/a/SKILL.md"),
      "edited\n",
    );
    const problems = await checkOutputs(root, files);
    expect(problems).toEqual([
      "out of date: plugins/sdlckit-workflow/skills/a/SKILL.md",
    ]);
  });

  it("reports a missing file", async () => {
    const problems = await checkOutputs(root, files);
    expect(problems).toContain("missing: .claude-plugin/marketplace.json");
  });

  it("reports a stale file that the build no longer produces", async () => {
    await writeOutputs(root, files);
    await mkdir(join(root, "plugins/sdlckit-workflow/skills/old"), {
      recursive: true,
    });
    await writeFile(
      join(root, "plugins/sdlckit-workflow/skills/old/SKILL.md"),
      "old\n",
    );
    const problems = await checkOutputs(root, files);
    expect(problems).toContain(
      "stale, not generated: plugins/sdlckit-workflow/skills/old/SKILL.md",
    );
  });
  it("reports an executable whose mode changed", async () => {
    const withBin: OutputFile[] = [
      ...files,
      {
        path: "plugins/sdlckit-workflow/bin/tool",
        contents: "x\n",
        mode: 0o755,
      },
    ];
    await writeOutputs(root, withBin);
    await chmod(join(root, "plugins/sdlckit-workflow/bin/tool"), 0o644);
    expect(await checkOutputs(root, withBin)).toEqual([
      "wrong mode: plugins/sdlckit-workflow/bin/tool is 644, expected 755",
    ]);
  });
});
