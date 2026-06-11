import test from "node:test";
import assert from "node:assert/strict";
import { loadPopup } from "./harness.mjs";

test("popup initializes from stored log and selected element", async () => {
  const { document } = await loadPopup({
    sessionData: {
      sr_log: [
        {
          announcement: "Submit button",
          role: "button",
          srId: "sr-1",
        },
      ],
      sr_selected_element: "button#submit",
      sr_selecting: false,
    },
  });

  assert.equal(
    document.querySelector("#selected-element").classList.contains("hidden"),
    false,
  );
  assert.equal(
    document.querySelector("#selected-element-text").textContent,
    "button#submit",
  );
  assert.equal(
    document.querySelector("#log-list .announcement").textContent,
    "Submit button",
  );
  assert.equal(document.querySelector("#log-list .role-tag").textContent, "button");
  assert.equal(document.querySelector("#copy-btn").disabled, false);
  assert.equal(document.querySelector("#clear-btn").disabled, false);
});

test("runtime scan result renders output and enables copy", async () => {
  const { document, emitRuntimeMessage } = await loadPopup();

  emitRuntimeMessage({
    type: "SR_SCAN_RESULT",
    selectedElement: "a.learn-more",
    log: [
      {
        announcement: "Learn more link",
        role: "link",
        srId: "sr-2",
      },
    ],
  });

  assert.equal(document.querySelector("#select-btn").textContent, "Pick On Page");
  assert.equal(
    document.querySelector("#selected-element-text").textContent,
    "a.learn-more",
  );
  assert.equal(
    document.querySelector("#log-list .announcement").textContent,
    "Learn more link",
  );
  assert.equal(document.querySelector("#copy-btn").disabled, false);
});
