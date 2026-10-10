import { z } from "zod";

/** The six installable packs. Each maps to one plugin in the marketplace. */
export const CATEGORIES = [
  "workflow",
  "cost",
  "backend",
  "frontend",
  "cicd",
  "infra",
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
