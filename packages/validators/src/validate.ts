import { readdir, readFile } from "node:fs/promises";
import { basename, extname, join, relative, sep } from "node:path";
import matter from "gray-matter";
import { dump, JSON_SCHEMA, load } from "js-yaml";
import { type ScanHit, scanText } from "./scan.js";
import { CONTENT_TYPES, frontmatterSchema } from "./schema.js";

/** JSON_SCHEMA keeps dates as written. The default YAML schema would turn 2026-02-30 into a Date. */
const MATTER_OPTIONS = {
  engines: {
    yaml: {
      parse: (source: string) =>
        load(source, { schema: JSON_SCHEMA }) as object,
      stringify: (data: object) => dump(data),
    },
  },
};

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

  for (const absolutePath of files) {
    const file = relative(options.root, absolutePath).split(sep).join("/");
    const raw = await readFile(absolutePath, "utf8");
    const parts = relative(contentRoot, absolutePath).split(sep);
    const type = parts[0] ?? "";

    if (!(CONTENT_TYPES as readonly string[]).includes(type)) {
      findings.push(
        error(
          file,
          "location",
          `must live under one of: ${CONTENT_TYPES.join(", ")}`,
        ),
      );
      continue;
    }

    const { data } = matter(raw, MATTER_OPTIONS);
    const parsed = frontmatterSchema.safeParse(data);

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path.join(".") || "frontmatter";
        findings.push(error(file, "frontmatter", `${field}: ${issue.message}`));
      }
    } else {
      const item = parsed.data;
      const expectedName = basename(absolutePath, extname(absolutePath));

      if (item.name !== expectedName) {
        findings.push(
          error(
            file,
            "name",
            `frontmatter name "${item.name}" must match filename "${expectedName}"`,
          ),
        );
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
