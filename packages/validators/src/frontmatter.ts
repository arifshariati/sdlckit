import matter from "gray-matter";
import { dump, JSON_SCHEMA, load } from "js-yaml";

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

export interface ParsedItem {
  data: Record<string, unknown>;
  body: string;
}

/** Splits a content file into its frontmatter data and body, parsed the same way everywhere. */
export function parseItem(raw: string): ParsedItem {
  const { data, content } = matter(raw, MATTER_OPTIONS);
  return { data: data as Record<string, unknown>, body: content };
}
