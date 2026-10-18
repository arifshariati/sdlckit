import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import {
  CATEGORIES,
  type Frontmatter,
  frontmatterSchema,
  parseItem,
  RUNTIME_FIELDS,
  type RuntimeField,
} from "@sdlckit/validators";
import { type Pack, packSchema } from "./pack.js";

export const MARKETPLACE_NAME = "sdlckit";
export const AUTHOR_NAME = "Mohammad Arif";
export const REPO_URL = "https://github.com/arifshariati/sdlckit";

/** Content types that compile to skill folders. A rulebook is a reference skill. */
const SKILL_TYPES = ["skills", "rulebooks"] as const;
/** Content types that compile to flat Markdown files. */
const FLAT_TYPES = ["agents", "commands"] as const;
/** Types the generator knows how to emit. Anything else under a pack is an error. */
const SUPPORTED_TYPES = [...SKILL_TYPES, ...FLAT_TYPES] as const;
/** Pack folders that are not item types: copied as-is into the plugin root (decision 25). */
const ASSETS_DIR = "assets";
/** File mode for generated executables in `bin/` (decision 26). */
export const EXECUTABLE_MODE = 0o755;

/** A generated file. `path` is relative to the repo root and always uses forward slashes. */
export interface OutputFile {
  path: string;
  contents: string;
  /** Set only for executables; everything else is written with the default mode. */
  mode?: number;
}

/**
 * Builds every plugin folder and the marketplace manifest from `content/`.
 * Pure with respect to the output: it reads `content/` and returns files, and writes nothing.
 */
export async function buildPlugins(root: string): Promise<OutputFile[]> {
  const contentRoot = join(root, "content");
  const outputs: OutputFile[] = [];
  const marketplacePlugins: {
    name: string;
    source: string;
    description: string;
  }[] = [];

  for (const category of CATEGORIES) {
    const packDir = join(contentRoot, category);
    const pack = await readPack(packDir);
    if (!pack) continue;

    const pluginName = `sdlckit-${category}`;
    const pluginRoot = `plugins/${pluginName}`;

    outputs.push({
      path: `${pluginRoot}/.claude-plugin/plugin.json`,
      contents: json(pluginManifest(pluginName, category, pack)),
    });

    for (const asset of await listFiles(join(packDir, ASSETS_DIR))) {
      outputs.push({
        path: `${pluginRoot}/${asset}`,
        contents: await readFile(join(packDir, ASSETS_DIR, asset), "utf8"),
      });
    }

    for (const [command, target] of Object.entries(pack.bin ?? {})) {
      outputs.push({
        path: `${pluginRoot}/bin/${command}`,
        contents: executable(await readBin(root, target, category)),
        mode: EXECUTABLE_MODE,
      });
    }

    for (const type of await listTypes(packDir)) {
      if (type === ASSETS_DIR) continue;
      if (!(SUPPORTED_TYPES as readonly string[]).includes(type)) {
        throw new Error(
          `content/${category}/${type} is not supported by the generator yet. Supported types: ${SUPPORTED_TYPES.join(", ")}`,
        );
      }
      for (const file of await listMarkdown(join(packDir, type))) {
        const item = await readItem(join(packDir, type, file), root);
        outputs.push(emitItem(pluginRoot, type, item));
      }
    }

    marketplacePlugins.push({
      name: pluginName,
      source: `./${pluginRoot}`,
      description: pack.description,
    });
  }

  if (marketplacePlugins.length > 0) {
    outputs.push({
      path: ".claude-plugin/marketplace.json",
      contents: json({
        name: MARKETPLACE_NAME,
        description:
          "Claude Code, engineered. An opinionated SDLC workflow for Claude Code.",
        owner: { name: AUTHOR_NAME },
        plugins: marketplacePlugins,
      }),
    });
  }

  return outputs.sort((a, b) => a.path.localeCompare(b.path));
}

async function readPack(packDir: string): Promise<Pack | undefined> {
  let raw: string;
  try {
    raw = await readFile(join(packDir, "pack.json"), "utf8");
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw cause;
  }
  const parsed = packSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw new Error(
      `${join(packDir, "pack.json")}: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`,
    );
  }
  return parsed.data;
}

async function listTypes(packDir: string): Promise<string[]> {
  const entries = await readdir(packDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

/** Every file under `dir`, relative to it with forward slashes. A missing folder has none. */
async function listFiles(dir: string): Promise<string[]> {
  let entries: string[];
  try {
    entries = await readdir(dir, { recursive: true });
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw cause;
  }
  const files: string[] = [];
  for (const entry of entries) {
    if ((await stat(join(dir, entry))).isFile())
      files.push(entry.split(sep).join("/"));
  }
  return files.sort();
}

async function readBin(
  root: string,
  target: string,
  category: string,
): Promise<string> {
  try {
    return await readFile(join(root, target), "utf8");
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(
        `content/${category}/pack.json: bin target ${target} does not exist. Run the build first.`,
      );
    }
    throw cause;
  }
}

/** Ensures exactly one Node shebang, so the file runs as a bare command from `bin/`. */
function executable(source: string): string {
  return `#!/usr/bin/env node\n${source.replace(/^#!.*\n/, "")}`;
}

async function listMarkdown(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true });
  return entries.filter((entry) => entry.endsWith(".md")).sort();
}

interface SourceItem {
  frontmatter: Frontmatter;
  body: string;
}

async function readItem(
  absolutePath: string,
  root: string,
): Promise<SourceItem> {
  const file = relative(root, absolutePath).split(sep).join("/");
  const { data, body } = parseItem(await readFile(absolutePath, "utf8"));
  const parsed = frontmatterSchema.safeParse(data);
  if (!parsed.success) {
    // Generation only runs on validated content. Fail loudly if it is reached with invalid input.
    throw new Error(
      `${file}: invalid frontmatter. Run sdlckit-validate first.`,
    );
  }
  return { frontmatter: parsed.data, body };
}

function emitItem(
  pluginRoot: string,
  type: string,
  item: SourceItem,
): OutputFile {
  const { name, description } = item.frontmatter;
  // JSON strings are valid YAML, so quoting with JSON.stringify is always safe here.
  // Runtime fields (decision 24) follow in a fixed order, so output is stable.
  const runtime = (Object.keys(RUNTIME_FIELDS) as RuntimeField[])
    .filter((field) => item.frontmatter[field] !== undefined)
    .map((field) => `${field}: ${JSON.stringify(item.frontmatter[field])}\n`)
    .join("");
  const header = `---\nname: ${JSON.stringify(name)}\ndescription: ${JSON.stringify(description)}\n${runtime}---\n`;
  // Drop the blank lines gray-matter leaves between the closing fence and the body.
  const body = item.body.replace(/^\s*\n/, "");
  const path = (SKILL_TYPES as readonly string[]).includes(type)
    ? `${pluginRoot}/skills/${name}/SKILL.md`
    : `${pluginRoot}/${type}/${name}.md`;

  return { path, contents: `${header}${body}` };
}

function pluginManifest(
  name: string,
  category: string,
  pack: Pack,
): Record<string, unknown> {
  return {
    name,
    version: pack.version,
    description: pack.description,
    author: { name: AUTHOR_NAME },
    homepage: REPO_URL,
    repository: REPO_URL,
    license: "MIT",
    keywords: ["claude-code", "sdlc", category],
    ...(pack.dependencies && pack.dependencies.length > 0
      ? { dependencies: pack.dependencies }
      : {}),
  };
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
