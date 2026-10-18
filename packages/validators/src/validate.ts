import { readdir, readFile, stat } from "node:fs/promises";
import { basename, extname, join, relative, sep } from "node:path";
import { parseItem } from "./frontmatter.js";
import { type ScanHit, scanText } from "./scan.js";
import {
  CATEGORIES,
  CONTENT_TYPES,
  frontmatterSchema,
  RUNTIME_FIELDS,
  type RuntimeField,
} from "./schema.js";

export type Severity = "error" | "warning";

export interface Finding {
  file: string;
  severity: Severity;
  rule: string;
  message: string;
  line?: number;
}

export interface ValidateOptions {
  /** Repo root that contains `content/`. */
  root: string;
  /** Terms that must not appear in content. Loaded from outside the repo. */
  denylist?: readonly string[];
  /** Current date, injected for testable staleness checks. */
  now?: Date;
  /** Days without re-verification before an item is flagged. */
  staleAfterDays?: number;
}

const DEFAULT_STALE_DAYS = 90;

export async function validateContent(
  options: ValidateOptions,
): Promise<Finding[]> {
  const contentRoot = join(options.root, "content");
  const files = await listMarkdownFiles(contentRoot);
  const findings: Finding[] = [];
  const seenNames = new Map<string, string>();
  const now = options.now ?? new Date();
  const staleAfterDays = options.staleAfterDays ?? DEFAULT_STALE_DAYS;

  // Assets (decision 25) are not items: no layout or frontmatter rules, but publish safety still applies.
  for (const absolutePath of await listAssetFiles(contentRoot)) {
    const file = relative(options.root, absolutePath).split(sep).join("/");
    const raw = await readFile(absolutePath, "utf8");
    for (const hit of scanText(raw, options.denylist ?? [])) {
      findings.push(scanFinding(file, hit));
    }
  }

  for (const absolutePath of files) {
    const file = relative(options.root, absolutePath).split(sep).join("/");
    const raw = await readFile(absolutePath, "utf8");
    const parts = relative(contentRoot, absolutePath).split(sep);
    const [pack = "", type = ""] = parts;
    if (parts[1] === "assets") continue;

    // Layout is content/<pack>/<type>/<name>.md. The pack folder is the source of truth.
    if (
      parts.length !== 3 ||
      !(CATEGORIES as readonly string[]).includes(pack) ||
      !(CONTENT_TYPES as readonly string[]).includes(type)
    ) {
      findings.push(
        error(
          file,
          "location",
          `must live at content/<pack>/<type>/<name>.md, with pack one of: ${CATEGORIES.join(", ")} and type one of: ${CONTENT_TYPES.join(", ")}`,
        ),
      );
      continue;
    }

    const parsed = frontmatterSchema.safeParse(parseItem(raw).data);

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path.join(".") || "frontmatter";
        findings.push(error(file, "frontmatter", `${field}: ${issue.message}`));
      }
    } else {
      const item = parsed.data;
      const expectedName = basename(absolutePath, extname(absolutePath));

      if (item.category !== pack) {
        findings.push(
          error(
            file,
            "category",
            `category "${item.category}" must match its pack folder "${pack}"`,
          ),
        );
      }

      if (item.name !== expectedName) {
        findings.push(
          error(
            file,
            "name",
            `frontmatter name "${item.name}" must match filename "${expectedName}"`,
          ),
        );
      }

      for (const field of Object.keys(RUNTIME_FIELDS) as RuntimeField[]) {
        const allowed: readonly string[] = RUNTIME_FIELDS[field];
        if (item[field] !== undefined && !allowed.includes(type)) {
          findings.push(
            error(
              file,
              "runtime-field",
              `"${field}" applies only to ${allowed.join(" and ")}, not ${type}`,
            ),
          );
        }
      }

      const previous = seenNames.get(item.name);
      if (previous) {
        findings.push(
          error(
            file,
            "unique-name",
            `name "${item.name}" already used by ${previous}`,
          ),
        );
      } else {
        seenNames.set(item.name, file);
      }

      if (
        item.status === "current" &&
        isStale(item.verified, now, staleAfterDays)
      ) {
        findings.push({
          file,
          severity: "warning",
          rule: "stale",
          message: `last verified ${item.verified}, older than ${staleAfterDays} days`,
        });
      }
    }

    const hits = scanText(raw, options.denylist ?? []);
    for (const hit of hits) {
      findings.push(scanFinding(file, hit));
    }
  }

  return findings;
}

async function listMarkdownFiles(dir: string): Promise<string[]> {
  let entries: string[];
  try {
    entries = await readdir(dir, { recursive: true });
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw cause;
  }
  return entries
    .filter((entry) => entry.endsWith(".md"))
    .map((entry) => join(dir, entry));
}

/** Every file under `content/<pack>/assets/`, any extension. */
async function listAssetFiles(contentRoot: string): Promise<string[]> {
  let entries: string[];
  try {
    entries = await readdir(contentRoot, { recursive: true });
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw cause;
  }
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.split(sep)[1] !== "assets") continue;
    const absolute = join(contentRoot, entry);
    if ((await stat(absolute)).isFile()) files.push(absolute);
  }
  return files.sort();
}

function isStale(verified: string, now: Date, staleAfterDays: number): boolean {
  const ageMs = now.getTime() - Date.parse(verified);
  return ageMs > staleAfterDays * 24 * 60 * 60 * 1000;
}

function error(file: string, rule: string, message: string): Finding {
  return { file, severity: "error", rule, message };
}

function scanFinding(file: string, hit: ScanHit): Finding {
  return {
    file,
    severity: "error",
    rule: `scan:${hit.rule}`,
    message: `matched "${hit.match}"`,
    line: hit.line,
  };
}
