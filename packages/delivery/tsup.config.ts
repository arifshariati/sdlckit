import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { index: "src/index.ts" },
    format: ["esm"],
    target: "node22",
    platform: "node",
    dts: true,
    clean: true,
  },
  {
    // The plugin's bin/ file has no extension and no package.json nearby, so Node loads it as
    // CommonJS: ship one self-contained CJS bundle with nothing external (decision 26).
    entry: { bin: "src/bin.ts" },
    format: ["cjs"],
    outExtension: () => ({ js: ".cjs" }),
    target: "node22",
    platform: "node",
    noExternal: [/.*/],
  },
]);
