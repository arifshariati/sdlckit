import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

/** One command the runner executes. Its exit code and output are the only evidence it reports. */
export interface CommandGate {
  kind: "command";
  id: string;
  label: string;
  command: string;
  args: readonly string[];
}

/** Validates each plugin folder with the Claude Code CLI, so the marketplace is checked by the tool that installs it. */
export interface PluginValidateGate {
  kind: "plugin-validate";
  id: string;
  label: string;
  claudeBin: string;
  targets: readonly string[];
}

export type Gate = CommandGate | PluginValidateGate;

/** Gates that run on every sdlckit PR. Order is the order they run and print. */
export function defaultGates(): CommandGate[] {
  return [
    {
      kind: "command",
      id: "lint",
      label: "Lint and format check",
      command: "pnpm",
      args: ["lint"],
    },
    {
      kind: "command",
      id: "typecheck",
      label: "Typecheck",
      command: "pnpm",
      args: ["typecheck"],
    },
    {
      kind: "command",
      id: "build",
      label: "Build",
      command: "pnpm",
      args: ["build"],
    },
    {
      kind: "command",
      id: "test",
      label: "Tests",
      command: "pnpm",
      args: ["test"],
    },
    {
      kind: "command",
      id: "content-validate",
      label: "Content validation (frontmatter, lifecycle, publish safety)",
      command: "pnpm",
      args: ["content:validate"],
    },
    {
      kind: "command",
      id: "content-generate-check",
      label: "Generated plugins match a fresh build",
      command: "pnpm",
      args: ["content:check"],
    },
  ];
}

/**
 * Builds the plugin-validate gate from the generated tree. Returns undefined when nothing
 * has been generated yet, so an empty repo doesn't fail on a missing plugin.
 */
export async function pluginValidateGate(
  root: string,
  claudeBin: string,
): Promise<PluginValidateGate | undefined> {
  const targets: string[] = [];
  const marketplace = join(root, ".claude-plugin", "marketplace.json");
  if (await exists(marketplace)) targets.push(".");

  const pluginsDir = join(root, "plugins");
  if (await exists(pluginsDir)) {
    const entries = await readdir(pluginsDir, { withFileTypes: true });
    for (const entry of entries
      .filter((e) => e.isDirectory())
      .sort((a, b) => a.name.localeCompare(b.name))) {
      targets.push(join("plugins", entry.name));
    }
  }

  if (targets.length === 0) return undefined;
  return {
    kind: "plugin-validate",
    id: "plugin-validate",
    label: "Claude Code validates the marketplace and every plugin",
    claudeBin,
    targets,
  };
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}
