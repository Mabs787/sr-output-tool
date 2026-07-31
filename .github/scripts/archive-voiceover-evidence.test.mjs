import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createEvidenceManifest } from "./archive-voiceover-evidence.mjs";

test("builds a hashed evidence inventory with artifact categories", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "voiceover-archive-"));
  const runDir = path.join(root, "run-1");
  mkdirSync(path.join(runDir, "target-a"), { recursive: true });
  mkdirSync(path.join(runDir, "_artifacts/raw"), { recursive: true });
  writeFileSync(path.join(runDir, "target-a/06-promotion.json"), "{}\n");
  writeFileSync(path.join(runDir, "_artifacts/raw/voiceover-output.json"), "{}\n");

  const manifest = createEvidenceManifest(runDir, {
    repoRoot: root,
    branch: "codex/test",
    head: "abc123",
  });

  assert.equal(manifest.fileCount, 2);
  assert.equal(manifest.categoryCounts["raw-artifact"], 1);
  assert.equal(manifest.categoryCounts["receipt-or-summary"], 1);
  assert.equal(manifest.files.every((file) => file.sha256.length === 64), true);
});

test("can exclude downloaded artifacts from the archive inventory", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "voiceover-archive-small-"));
  const runDir = path.join(root, "run-2");
  mkdirSync(path.join(runDir, "_artifacts/raw"), { recursive: true });
  mkdirSync(path.join(runDir, "target-a"), { recursive: true });
  writeFileSync(path.join(runDir, "_artifacts/raw/voiceover-output.json"), "{}\n");
  writeFileSync(path.join(runDir, "target-a/00-scan-health.json"), "{}\n");

  const manifest = createEvidenceManifest(runDir, {
    repoRoot: root,
    includeArtifacts: false,
    branch: "codex/test",
    head: "abc123",
  });

  assert.equal(manifest.fileCount, 1);
  assert.equal(manifest.includeArtifacts, false);
});
