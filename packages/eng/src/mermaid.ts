import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Every ```mermaid block in a Markdown document, in order. */
export function mermaidBlocks(markdown: string): string[] {
  return [...markdown.matchAll(/```mermaid\n([\s\S]*?)\n```/g)].map(
    (m) => m[1] ?? "",
  );
}

export interface MermaidResult {
  index: number;
  ok: boolean;
  output: string;
}

/**
 * Parses each block with the real Mermaid CLI (`@mermaid-js/mermaid-cli` through npx), because
 * a diagram that only looks right breaks on GitHub. Use it on a PR body before posting it.
 */
export function validateMermaid(file: string): MermaidResult[] {
  const blocks = mermaidBlocks(readFileSync(file, "utf8"));
  if (blocks.length === 0) return [];
  const dir = mkdtempSync(join(tmpdir(), "sdlckit-mermaid-"));
  try {
    writeFileSync(join(dir, "puppeteer.json"), '{"args":["--no-sandbox"]}');
    return blocks.map((block, index) => {
      const input = join(dir, `d${index}.mmd`);
      writeFileSync(input, `${block}\n`);
      const run = spawnSync(
        "npx",
        [
          "-y",
          "@mermaid-js/mermaid-cli",
          "-p",
          join(dir, "puppeteer.json"),
          "-i",
          input,
          "-o",
          join(dir, `d${index}.svg`),
        ],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      );
      const output = `${run.stdout ?? ""}${run.stderr ?? ""}`
        .split("\n")
        .slice(-8)
        .join("\n");
      return { index, ok: run.status === 0, output };
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
