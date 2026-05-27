import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(packageRoot, "..", "..");

const engineDistPath = path.join(
  repoRoot,
  "packages/sr-engine/dist/announcements.js",
);
const engineDomDistPath = path.join(repoRoot, "packages/sr-engine/dist/dom.js");
const extensionRuntimePath = path.join(packageRoot, "engine-runtime.js");

const compiledAnnouncementsSource = readFileSync(engineDistPath, "utf8");
const compiledDomSource = readFileSync(engineDomDistPath, "utf8");

const wrappedSource = `// Generated from packages/sr-engine/dist/announcements.js and dist/dom.js\n(() => {\n  {\n    const module = { exports: {} };\n    const exports = module.exports;\n${compiledAnnouncementsSource}\n    window.__srEngineGenerateAnnouncement =\n      module.exports.generateAnnouncement || generateAnnouncement;\n    window.__srEngineGetContextEndAnnouncement =\n      module.exports.getContextEndAnnouncement || getContextEndAnnouncement;\n  }\n\n  {\n    const module = { exports: {} };\n    const exports = module.exports;\n${compiledDomSource}\n    window.__srEngineCreateDomScanner =\n      module.exports.createDomScanner || createDomScanner;\n  }\n})();\n`;

mkdirSync(path.dirname(extensionRuntimePath), { recursive: true });
writeFileSync(extensionRuntimePath, wrappedSource);