import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/** Folders never searched: generated, vendored, or tool state. */
const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  ".turbo",
  "coverage",
  ".expo",
  ".delivery",
]);

export interface StackReport {
  root: string;
  packageManager: string;
  monorepo: string;
  domains: Record<string, boolean>;
  gateCandidates: Record<string, string>;
}

interface PackageJson {
  packageManager?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

/**
 * Reports what the files prove about a repo: package manager, monorepo tool, domains, and
 * candidate gate commands. Pure discovery: it writes nothing and never guesses beyond the files.
 * /eng-init confirms the result with the user before writing the manifest.
 */
export function detectStack(root: string): StackReport {
  const files = walk(root);
  const packages = files
    .filter((f) => f.endsWith("package.json"))
    .map((f) => readJson<PackageJson>(join(root, f)))
    .filter((p): p is PackageJson => p !== undefined);
  const deps = new Set(
    packages.flatMap((p) => [
      ...Object.keys(p.dependencies ?? {}),
      ...Object.keys(p.devDependencies ?? {}),
      ...Object.keys(p.peerDependencies ?? {}),
    ]),
  );
  const has = (path: string) => existsSync(join(root, path));
  const rootPkg = readJson<PackageJson>(join(root, "package.json"));

  let packageManager = "none";
  if (has("package-lock.json")) packageManager = "npm";
  if (has("yarn.lock")) packageManager = "yarn";
  if (has("pnpm-lock.yaml")) packageManager = "pnpm";
  if (has("bun.lockb") || has("bun.lock")) packageManager = "bun";
  if (has("Cargo.toml")) packageManager = "cargo";
  if (has("go.mod")) packageManager = "go";
  if (rootPkg?.packageManager)
    packageManager = rootPkg.packageManager.split("@")[0] ?? packageManager;

  let monorepo = "none";
  if (has("pnpm-workspace.yaml")) monorepo = "pnpm-workspaces";
  if (has("lerna.json")) monorepo = "lerna";
  if (has("nx.json")) monorepo = "nx";
  if (has("turbo.json")) monorepo = "turbo";

  const anyFile = (test: (f: string) => boolean) => files.some(test);
  const reactNative = deps.has("react-native") || deps.has("expo");
  const reactWeb = deps.has("react-dom") || (deps.has("react") && !reactNative);
  const supabase = has("supabase") || deps.has("@supabase/supabase-js");
  const terraform = anyFile((f) => f.endsWith(".tf"));
  const domains: Record<string, boolean> = {
    "react-web": reactWeb,
    "react-native": reactNative,
    nestjs: deps.has("@nestjs/core"),
    "vite-build": deps.has("vite"),
    supabase,
    postgres:
      supabase ||
      deps.has("pg") ||
      deps.has("postgres") ||
      anyFile((f) => /migrations\/.*\.sql$/.test(f)),
    terraform,
    aws:
      terraform ||
      [...deps].some(
        (d) =>
          d === "aws-sdk" || d.startsWith("@aws-sdk/") || d === "aws-cdk-lib",
      ),
    "bedrock-agentcore": [...deps].some((d) => d.includes("bedrock")),
    "turbo-monorepo": monorepo === "turbo",
  };

  const run = runPrefix(packageManager);
  const script = (name: string) =>
    rootPkg?.scripts?.[name] ? `${run} ${name}` : "";
  const gateCandidates: Record<string, string> = {
    lint: script("lint"),
    format:
      script("format:check") ||
      script("format") ||
      (deps.has("prettier") ? `${run} prettier --check .` : ""),
    typecheck: script("typecheck") || script("type-check"),
    test: script("test"),
    e2e:
      script("test:e2e") ||
      script("e2e") ||
      (deps.has("@playwright/test")
        ? "(playwright present: confirm the target)"
        : ""),
    build: script("build"),
  };

  return { root, packageManager, monorepo, domains, gateCandidates };
}

function runPrefix(pm: string): string {
  if (pm === "npm") return "npm run";
  if (pm === "bun") return "bun run";
  return pm;
}

function walk(
  root: string,
  dir = root,
  out: string[] = [],
  depth = 0,
): string[] {
  if (depth > 8) return out;
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (EXCLUDED_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    let isDir = false;
    try {
      isDir = statSync(full).isDirectory();
    } catch {
      continue;
    }
    if (isDir) walk(root, full, out, depth + 1);
    else out.push(relative(root, full).split("\\").join("/"));
  }
  return out;
}

function readJson<T>(file: string): T | undefined {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as T;
  } catch {
    return undefined;
  }
}
