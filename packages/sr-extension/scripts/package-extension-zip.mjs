import { existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, "..");
const distDir = path.join(packageRoot, "dist");
const manifestPath = path.join(packageRoot, "manifest.json");
const runtimePath = path.join(packageRoot, "engine-runtime.js");

if (!existsSync(manifestPath)) {
  throw new Error("manifest.json was not found in the extension package.");
}

if (!existsSync(runtimePath)) {
  throw new Error(
    "engine-runtime.js is missing. Run `npm run build` from the repo root first.",
  );
}

const { default: manifest } = await import(`file://${manifestPath}`, {
  with: { type: "json" },
});

const zipName = `sr-output-tool-extension-v${manifest.version}.zip`;
const zipPath = path.join(distDir, zipName);

mkdirSync(distDir, { recursive: true });
rmSync(zipPath, { force: true });

const filesToZip = [
  "manifest.json",
  "background.js",
  "content.js",
  "engine-runtime.js",
  "offscreen.html",
  "offscreen.js",
  "popup.css",
  "popup.html",
  "popup.js",
  "icons",
];

const result = spawnSync("zip", ["-r", zipPath, ...filesToZip], {
  cwd: packageRoot,
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
