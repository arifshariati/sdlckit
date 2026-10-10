/**
 * Publish-safety scan. Catches values that must never reach the public repo:
 * machine-specific paths, secrets, and personal terms.
 *
 * Personal terms (your name, project names) come from a denylist file passed
 * at runtime, never committed. The built-in patterns below are generic.
 */

export interface ScanHit {
  rule: string;
  match: string;
  line: number;
}

interface Pattern {
  rule: string;
  regex: RegExp;
}

const BUILTIN_PATTERNS: readonly Pattern[] = [
  { rule: "machine-path", regex: /\/Users\/[^/\s"'`]+/g },
  { rule: "machine-path", regex: /\/home\/[^/\s"'`]+/g },
  { rule: "machine-path", regex: /[A-Za-z]:\\Users\\[^\\\s"'`]+/g },
  { rule: "secret", regex: /sk-ant-[A-Za-z0-9_-]{20,}/g },
  { rule: "secret", regex: /AKIA[0-9A-Z]{16}/g },
  { rule: "secret", regex: /ghp_[A-Za-z0-9]{36}/g },
  { rule: "aws-account-id", regex: /\b\d{12}\b/g },
];

const ALLOWED_EMAIL_DOMAINS = new Set([
  "example.com",
  "anthropic.com",
  "users.noreply.github.com",
]);
const EMAIL = /[\w.+-]+@([\w-]+\.[\w.-]+)/g;

export function scanText(
  text: string,
  denylist: readonly string[] = [],
): ScanHit[] {
  const hits: ScanHit[] = [];
  const lines = text.split("\n");

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    for (const { rule, regex } of BUILTIN_PATTERNS) {
      for (const match of line.matchAll(regex)) {
        hits.push({ rule, match: match[0], line: lineNumber });
      }
    }

    for (const match of line.matchAll(EMAIL)) {
      const domain = match[1]?.toLowerCase() ?? "";
      if (!ALLOWED_EMAIL_DOMAINS.has(domain)) {
        hits.push({ rule: "email", match: match[0], line: lineNumber });
      }
    }

    const lowered = line.toLowerCase();
    for (const term of denylist) {
      if (term && lowered.includes(term.toLowerCase())) {
        hits.push({ rule: "denylist", match: term, line: lineNumber });
      }
    }
  });

  return hits;
}

/** Parses a denylist file: one term per line, blank lines and `#` comments ignored. */
export function parseDenylist(contents: string): string[] {
  return contents
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}
