import { readFileSync, writeFileSync } from "node:fs";
import { DeliveryError } from "./errors.js";

/** A frontmatter value: the YAML subset records use (scalars, inline lists, inline maps). */
export type Value =
  | string
  | number
  | boolean
  | null
  | Value[]
  | { [key: string]: Value };
export type Frontmatter = Record<string, Value>;

/** One record file (epic, ticket, or ADR). `docStyle` marks a repo-style ADR with no frontmatter. */
export interface Rec {
  file: string;
  fm: Frontmatter;
  body: string;
  docStyle?: boolean;
}

export function str(v: Value | undefined): string {
  return typeof v === "string"
    ? v
    : v === null || v === undefined
      ? ""
      : String(v);
}

export function num(v: Value | undefined): number {
  return typeof v === "number" ? v : 0;
}

export function list(v: Value | undefined): string[] {
  return Array.isArray(v) ? v.map((x) => str(x)) : [];
}

export function map(v: Value | undefined): Record<string, Value> {
  return v && typeof v === "object" && !Array.isArray(v) ? v : {};
}

export function parseScalar(raw: string): Value {
  const s = raw.trim();
  if (s === "" || s === "null" || s === "~") return null;
  if (s === "true") return true;
  if (s === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    return s.slice(1, -1);
  }
  if (s.startsWith("[") && s.endsWith("]")) {
    const inner = s.slice(1, -1).trim();
    return inner ? splitTop(inner).map(parseScalar) : [];
  }
  if (s.startsWith("{") && s.endsWith("}")) {
    const inner = s.slice(1, -1).trim();
    const out: Record<string, Value> = {};
    if (inner) {
      for (const part of splitTop(inner)) {
        const i = part.indexOf(":");
        out[part.slice(0, i).trim()] = parseScalar(part.slice(i + 1));
      }
    }
    return out;
  }
  return s;
}

/** Splits on top-level commas, ignoring commas inside quotes, brackets, or braces. */
function splitTop(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  let quote: string | null = null;
  for (const ch of s) {
    if (quote) {
      cur += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      cur += ch;
      continue;
    }
    if (ch === "[" || ch === "{") depth++;
    if (ch === "]" || ch === "}") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

export function formatScalar(v: Value | undefined): string {
  if (v === null || v === undefined) return "null";
  if (Array.isArray(v)) return `[${v.map(formatScalar).join(", ")}]`;
  if (typeof v === "object") {
    return `{${Object.entries(v)
      .map(([k, x]) => `${k}: ${formatScalar(x)}`)
      .join(", ")}}`;
  }
  if (
    typeof v === "string" &&
    (/[:#,[\]{}]/.test(v) || /^\s|\s$/.test(v) || v === "")
  ) {
    return JSON.stringify(v);
  }
  return String(v);
}

export function readRec(file: string): Rec {
  const txt = readFileSync(file, "utf8");
  const m = txt.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new DeliveryError(`no frontmatter in ${file}`);
  const fm: Frontmatter = {};
  for (const line of (m[1] ?? "").split("\n")) {
    if (!line.trim()) continue;
    const i = line.indexOf(":");
    fm[line.slice(0, i).trim()] = parseScalar(line.slice(i + 1));
  }
  return { file, fm, body: m[2] ?? "" };
}

export function writeRec(rec: Rec): void {
  if (rec.docStyle) {
    writeFileSync(
      rec.file,
      rec.body.replace(
        /^(- \*\*Status:\*\*\s*)\S+/m,
        `$1${str(rec.fm.status)}`,
      ),
    );
    return;
  }
  const head = Object.entries(rec.fm)
    .map(([k, v]) => `${k}: ${formatScalar(v)}`)
    .join("\n");
  writeFileSync(rec.file, `---\n${head}\n---\n${rec.body}`);
}

/** The body of `## <name>` up to the next `## ` heading, or null when the section is absent. */
export function section(body: string, name: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = body.match(
    new RegExp(`^## ${escaped}\\s*\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, "m"),
  );
  return m ? (m[1] ?? "") : null;
}

/** True when a section holds more than template comments and empty placeholders. */
export function meaningful(text: string | null): boolean {
  return (
    (text ?? "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/^\s*-\s*(AC\d+:|\[ \] TAC\d+:)?\s*$/gm, "")
      .trim().length > 0
  );
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Appends a dated line to `## History`, creating the section when missing. The section is script-owned. */
export function appendHistory(rec: Rec, line: string): void {
  const entry = `- ${today()} ${line}`;
  rec.body = /^## History\s*$/m.test(rec.body)
    ? rec.body.replace(/\s*$/, `\n${entry}\n`)
    : `${rec.body.trimEnd()}\n\n## History\n${entry}\n`;
}

export function slug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}
