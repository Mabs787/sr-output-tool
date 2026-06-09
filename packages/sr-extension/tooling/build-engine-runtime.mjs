import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(packageRoot, "..", "..");
const runtimeEntryPath = path.join(
  packageRoot,
  "src",
  "content",
  "engine-runtime-entry.js",
);
const runtimeOutputPath = path.join(
  packageRoot,
  "src",
  "content",
  "engine-runtime.js",
);

await build({
  entryPoints: [runtimeEntryPath],
  outfile: runtimeOutputPath,
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2022",
  logLevel: "silent",
  banner: {
    js: "// Bundled from packages/sr-engine via @sr-output/engine\n",
  },
});