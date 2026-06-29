import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const reproFixturesDir = path.join(testDir, "fixtures/voiceover-repros");

function collectHtmlFiles(dir) {
  if (!existsSync(dir)) return [];

  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectHtmlFiles(entryPath);
    return entry.name.endsWith(".html") ? [entryPath] : [];
  });
}

test("VoiceOver repro fixtures are separate scan-rooted HTML files", () => {
  const htmlFiles = collectHtmlFiles(reproFixturesDir);
  assert.ok(htmlFiles.length > 0, "Expected at least one VoiceOver repro fixture.");

  for (const filePath of htmlFiles) {
    const html = readFileSync(filePath, "utf8");
    assert.match(
      html,
      /\bdata-sr-scan-root\b/,
      `${path.relative(testDir, filePath)} must define a data-sr-scan-root wrapper.`,
    );
  }
});
