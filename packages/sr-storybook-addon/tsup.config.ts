import type { Options } from "tsup";

export default {
  entry: {
    index: "./src/index.ts",
    manager: "./src/manager.tsx",
    preview: "./src/preview.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  // Storybook and React are provided by the host — don't bundle them.
  // Bundle @sr-output/engine so the addon is self-contained.
  external: [/^storybook/, /^react/],
  noExternal: ["@sr-output/engine"],
  splitting: false,
  clean: true,
} satisfies Options;
