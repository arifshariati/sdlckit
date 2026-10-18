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
  /**
   * Executables (decision 26): command name → a workspace package's bundled file, relative
   * to the repo root. Each is written to the plugin's `bin/`, which Claude Code puts on PATH.
   */
  bin: z
    .record(
      z.string().regex(KEBAB_CASE, "bin names must be kebab-case"),
      z
        .string()
        .regex(
          /^packages\/[^.]\S*\.c?js$/,
          "bin targets must be a packages/**/*.js or .cjs file",
        ),
    )
    .optional(),
});

export type Pack = z.infer<typeof packSchema>;
