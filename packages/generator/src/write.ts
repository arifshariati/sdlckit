import type { Dirent } from "node:fs";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import type { OutputFile } from "./build.js";

const PLUGINS_DIR = "plugins";
const MARKETPLACE_FILE = ".claude-plugin/marketplace.json";

/** Replaces the generated tree on disk. `plugins/` is cleared first, so removed items disappear. */
export async function writeOutputs(
  root: string,
  files: readonly OutputFile[],
): Promise<void> {
  await rm(join(root, PLUGINS_DIR), { recursive: true, force: true });
  await rm(join(root, MARKETPLACE_FILE), { force: true });

  for (const file of files) {
    const target = join(root, file.path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, file.contents);
  }
}

/**
 * Compares the expected output with what is on disk. Returns one message per problem.
 * An empty array means the committed output matches a fresh build.
 */
export async function checkOutputs(
  root: string,
  files: readonly OutputFile[],
): Promise<string[]> {
  const problems: string[] = [];
  const expected = new Map(files.map((file) => [file.path, file.contents]));

  for (const file of files) {
    const onDisk = await readOrUndefined(join(root, file.path));
    if (onDisk === undefined) {
      problems.push(`missing: ${file.path}`);
    } else if (onDisk !== file.contents) {
      problems.push(`out of date: ${file.path}`);
    }
  }

  for (const existing of await listFiles(
    join(root, PLUGINS_DIR),
    PLUGINS_DIR,
  )) {
    if (!expected.has(existing))
      problems.push(`stale, not generated: ${existing}`);
  }

  if (
    !expected.has(MARKETPLACE_FILE) &&
    (await readOrUndefined(join(root, MARKETPLACE_FILE))) !== undefined
  ) {
    problems.push(`stale, not generated: ${MARKETPLACE_FILE}`);
  }

  return problems;
}

async function readOrUndefined(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf8");
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw cause;
  }
}

async function listFiles(dir: string, prefix: string): Promise<string[]> {
  let entries: Dirent[];
  try {
    entries = await readdir(dir, { recursive: true, withFileTypes: true });
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw cause;
  }
  return entries
    .filter((entry) => entry.isFile())
    .map(
      (entry) =>
        `${prefix}/${relative(dir, join(entry.parentPath, entry.name)).split(sep).join("/")}`,
    );
}
