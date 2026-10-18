import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

/** Where a project keeps its manifest, relative to the repo root (written by /eng-init). */
export const MANIFEST_PATH = ".claude/engineering.json";

/** The parts of the project manifest the CLIs read. Unknown keys pass through untouched. */
export interface Manifest {
  version: number;
  project: string;
  gates: Record<string, string | null>;
  domains?: Record<string, { present: boolean; paths?: string[] }>;
  delivery?: Record<string, unknown>;
  [key: string]: unknown;
}

export class ManifestError extends Error {}

/**
 * The repo root for `cwd`: the main checkout even when `cwd` is inside a linked worktree,
 * because worktrees share one common git directory.
 */
export function mainRoot(cwd: string): string {
  const common = git(
    ["rev-parse", "--path-format=absolute", "--git-common-dir"],
    cwd,
  );
  return dirname(common);
}

/** The top of the working tree that contains `cwd` (a worktree's own root inside a worktree). */
export function workTreeRoot(cwd: string): string {
  return git(["rev-parse", "--show-toplevel"], cwd);
}

export function readManifest(root: string): Manifest {
  const file = join(root, MANIFEST_PATH);
  if (!existsSync(file)) {
    throw new ManifestError(`no manifest at ${file}. Run /eng-init first.`);
  }
  return JSON.parse(readFileSync(file, "utf8")) as Manifest;
}

function git(args: string[], cwd: string): string {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    throw new ManifestError(`not inside a git repository: ${cwd}`);
  }
}
