import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, "..");
const distDir = path.join(packageRoot, "dist");
const extensionBuildRoot = path.join(distDir, "sr-extension-chrome");
const manifestPath = path.join(extensionBuildRoot, "manifest.json");
const runtimePath = path.join(
  extensionBuildRoot,
  "src",
  "content",
  "engine-runtime.js",
);

if (!existsSync(manifestPath)) {
  throw new Error("manifest.json was not found in dist/sr-extension-chrome. Run `yarn build -w packages/sr-extension` first.");
}

if (!existsSync(runtimePath)) {
  throw new Error(
    "src/content/engine-runtime.js is missing from dist/sr-extension-chrome. Run `yarn workspace @sr-output/extension build` first.",
  );
}

await import(`file://${manifestPath}`, {
  with: { type: "json" },
});

const zipName = "sr-extension-chrome.zip";
const zipPath = path.join(distDir, zipName);

mkdirSync(distDir, { recursive: true });
for (const fileName of readdirSync(distDir)) {
  if (
    fileName === zipName ||
    /^sr-output-tool-extension-v.*\.zip$/.test(fileName)
  ) {
    rmSync(path.join(distDir, fileName), { force: true });
  }
}

const filesToZip = ["manifest.json", "src"];

const result = spawnSync("zip", ["-r", zipPath, ...filesToZip], {
  cwd: extensionBuildRoot,
  stdio: "inherit",
});

if (result.error) {
  throw new Error(
    `Failed to execute zip: ${result.error.message}. Install the zip CLI or package manually.`,
  );
}

if (result.status !== 0) {
  throw new Error(`zip exited with status ${result.status}.`);
}

console.log(`Created ${zipPath}`);
