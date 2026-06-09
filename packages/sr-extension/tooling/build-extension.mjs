import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  rmSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, "..");
const sourceRoot = path.join(packageRoot, "src");
const sourceManifestPath = path.join(sourceRoot, "manifest.json");
const distRoot = path.join(packageRoot, "dist");
const extensionBuildRoot = path.join(distRoot, "sr-extension-chrome");
const extensionSourceRoot = path.join(extensionBuildRoot, "src");

if (!existsSync(sourceManifestPath)) {
  throw new Error("src/manifest.json was not found in the extension package.");
}

rmSync(distRoot, { recursive: true, force: true });

mkdirSync(extensionSourceRoot, { recursive: true });

cpSync(sourceRoot, extensionSourceRoot, {
  recursive: true,
  filter(sourcePath) {
    const basename = path.basename(sourcePath);
    return basename !== "manifest.json" && basename !== "engine-runtime-entry.js";
  },
});

copyFileSync(sourceManifestPath, path.join(extensionBuildRoot, "manifest.json"));