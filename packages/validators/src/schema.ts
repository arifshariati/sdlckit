import { z } from "zod";

/** The installable packs. Each maps to one plugin in the marketplace (decisions 16 and 23). */
export const CATEGORIES = [
  "workflow",
  "cost",
  "backend",
  "frontend",
  "cicd",
  "infra",
  "team",
] as const;

/** Content folders under `content/`. Each folder holds one item type. */
export const CONTENT_TYPES = [
  "skills",
  "agents",
  "commands",
  "hooks",
  "rulebooks",
] as const;

const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** A skill reference: `name`, or `plugin:name` for a skill in another plugin. */
const SKILL_REF = /^([a-z0-9]+(-[a-z0-9]+)*:)?[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Runtime fields Claude Code reads, kept in generated output (decision 24).
 * Each belongs to the item types listed; the validator rejects it anywhere else.
 */
export const RUNTIME_FIELDS = {
  model: ["agents", "commands"],
  tools: ["agents"],
  effort: ["agents"],
  skills: ["agents"],
  "argument-hint": ["commands"],
  "allowed-tools": ["commands"],
} as const satisfies Record<string, readonly string[]>;

export type RuntimeField = keyof typeof RUNTIME_FIELDS;
const SEMVER = /^\d+\.\d+\.\d+$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const frontmatterSchema = z
  .object({
    name: z.string().regex(KEBAB_CASE, "must be kebab-case"),
    description: z
      .string()
      .min(20, "must be at least 20 characters")
      .max(300, "must be at most 300 characters"),
    category: z.enum(CATEGORIES),
    version: z.string().regex(SEMVER, "must be semver (x.y.z)"),
    status: z.enum(["current", "superseded", "deprecated"]),
    verified: z
      .string()
      .regex(ISO_DATE, "must be YYYY-MM-DD")
      // Date.parse rolls 2026-02-30 over to March, so require the date to round-trip unchanged.
      .refine(
        (value) =>
          !Number.isNaN(Date.parse(value)) &&
          new Date(value).toISOString().startsWith(value),
        "must be a real date",
      ),
    claudeCodeVersion: z
      .string()
      .min(1, "must name the Claude Code version it was verified against"),
    replacedBy: z.string().min(1).optional(),
    model: z.string().min(1).optional(),
    tools: z.string().min(1).optional(),
    effort: z.enum(["low", "medium", "high", "xhigh", "max"]).optional(),
    skills: z
      .array(
        z.string().regex(SKILL_REF, "must be a skill name or plugin:skill"),
      )
      .min(1)
      .optional(),
    "argument-hint": z.string().min(1).optional(),
    "allowed-tools": z.string().min(1).optional(),
  })
  .superRefine((item, ctx) => {
    if (item.status === "superseded" && !item.replacedBy) {
      ctx.addIssue({
        code: "custom",
        path: ["replacedBy"],
        message: "superseded items must name their replacement",
      });
    }
  });

export type Frontmatter = z.infer<typeof frontmatterSchema>;
