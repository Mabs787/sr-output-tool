import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const fixturesRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");

test("benchmark manifest freezes four development and two holdout targets", () => {
  const manifest = JSON.parse(readFileSync(path.join(fixturesRoot, "benchmark-manifest.json"), "utf8"));
  assert.equal(manifest.targets.length, 6);
  assert.equal(new Set(manifest.targets.map((target) => target.name)).size, 6);
  assert.equal(manifest.targets.filter((target) => target.use === "development").length, 4);
  assert.equal(manifest.targets.filter((target) => target.use === "holdout").length, 2);
  assert.equal(manifest.browserSettings.repeatRuns, 3);
  for (const target of manifest.targets) assert.match(target.url, /^https:\/\//);
});

test("assembled browser fixtures cannot contain manually refined output", () => {
  for (const directoryName of ["safari", "chrome-fresh"]) {
    const directory = path.join(fixturesRoot, directoryName);
    if (!existsSync(directory)) continue;
    for (const fileName of readdirSync(directory).filter((name) => name.endsWith(".fixture.json"))) {
      const fixture = JSON.parse(readFileSync(path.join(directory, fileName), "utf8"));
      assert.equal("refinedAnnouncements" in fixture, false);
      assert.equal(fixture.rawRuns.length, 3);
      if (fixture.status === "trusted") assert.ok(fixture.expectedAnnouncements.length > 0);
      if (fixture.status === "candidate") assert.deepEqual(fixture.expectedAnnouncements, []);
    }
  }
});
