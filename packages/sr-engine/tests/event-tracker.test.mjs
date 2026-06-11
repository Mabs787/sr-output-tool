import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { EventTracker } = require("../dist/index.js");

test("EventTracker resets metadata and returns events in timestamp order", () => {
  const tracker = new EventTracker();

  tracker.start({
    url: "https://example.test/form",
    title: "Form",
    viewport: {
      width: 390,
      height: 844,
    },
  });
  tracker.push({
    timestamp: 40,
    type: "announcement",
    announcement: "Email, text field",
    snapshot: "email.png",
  });
  tracker.push({
    timestamp: 10,
    type: "focus",
    announcement: "Form",
    snapshot: "form.png",
  });

  const recording = tracker.toRecording();

  assert.equal(tracker.length, 2);
  assert.equal(recording.url, "https://example.test/form");
  assert.equal(recording.title, "Form");
  assert.deepEqual(recording.viewport, {
    width: 390,
    height: 844,
  });
  assert.match(recording.createdAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.deepEqual(
    recording.events.map((event) => event.timestamp),
    [10, 40],
  );

  tracker.start();

  assert.equal(tracker.length, 0);
  assert.deepEqual(tracker.toRecording().viewport, {
    width: 1280,
    height: 800,
  });
});
