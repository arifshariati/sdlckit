import { z } from "zod";

const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SEMVER = /^\d+\.\d+\.\d+$/;

/**
 * `content/<pack>/pack.json`: the lockstep version and description of one plugin.
 * Per decision 12, a pack's version moves as one unit.
 */
export const packSchema = z.object({
  version: z.string().regex(SEMVER, "pack version must be semver (x.y.z)"),
  description: z
    .string()
    .min(20, "pack description must be at least 20 characters")
    .max(300),
  dependencies: z
    .array(z.string().regex(KEBAB_CASE, "dependency names must be kebab-case"))
    .optional(),
});

export type Pack = z.infer<typeof packSchema>;
