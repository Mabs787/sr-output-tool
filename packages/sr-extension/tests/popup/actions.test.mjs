import test from "node:test";
import assert from "node:assert/strict";
import { flushAsyncWork, loadPopup, toPlain } from "./harness.mjs";

test("pick button starts and cancels page selection", async () => {
  const { document, calls } = await loadPopup();
  const selectBtn = document.querySelector("#select-btn");

  selectBtn.click();
  await flushAsyncWork();

  assert.equal(selectBtn.textContent, "Cancel Picking");
  assert.equal(selectBtn.classList.contains("active"), true);
  assert.equal(document.querySelector("#clear-btn").disabled, true);
  assert.deepEqual(toPlain(calls.sessionSet.at(-1)), {
    sr_selecting: true,
    sr_scanning: false,
    sr_log: [],
  });
  assert.deepEqual(toPlain(calls.tabsSendMessage.at(-1)), {
    tabId: 123,
    message: { type: "SR_START_SELECTION" },
  });
  assert.deepEqual(toPlain(calls.executeScript.at(-1)), {
    target: { tabId: 123, allFrames: true },
    files: ["src/content/engine-runtime.js", "src/content/content.js"],
  });

  selectBtn.click();
  await flushAsyncWork();

  assert.equal(selectBtn.textContent, "Pick On Page");
  assert.equal(selectBtn.classList.contains("active"), false);
  assert.equal(document.querySelector("#clear-btn").disabled, true);
  assert.equal(
    document.querySelector("#log-container").classList.contains("hidden"),
    true,
  );
  assert.deepEqual(toPlain(calls.sessionSet.at(-1)), { sr_selecting: false });
  assert.deepEqual(toPlain(calls.tabsSendMessage.at(-1)), {
    tabId: 123,
    message: { type: "SR_CANCEL_SELECTION" },
  });
});

test("scan page button scans the full page", async () => {
  const { document, calls } = await loadPopup({
    sessionData: {
      sr_log: [{ announcement: "Old output" }],
      sr_selected_element: "main",
      sr_selecting: true,
    },
  });

  document.querySelector("#scan-page-btn").click();
  await flushAsyncWork();

  assert.equal(document.querySelector("#select-btn").textContent, "Pick On Page");
  assert.equal(document.querySelector("#select-btn").classList.contains("active"), false);
  assert.equal(
    document.querySelector("#log-list .announcement").textContent,
    "Waiting for output...",
  );
  assert.equal(document.querySelector("#status").textContent, "");
  assert.equal(document.querySelector("#clear-btn").disabled, true);
  assert.equal(document.querySelector("#copy-btn").disabled, true);
  assert.deepEqual(toPlain(calls.sessionSet.at(-1)), {
    sr_selecting: false,
    sr_scanning: true,
    sr_log: [],
    sr_selected_element: "",
  });
  assert.deepEqual(toPlain(calls.tabsSendMessage.at(-1)), {
    tabId: 123,
    message: { type: "SR_SCAN_PAGE" },
  });
});

test("copy sends joined screen reader output to the background worker", async () => {
  const { document, calls } = await loadPopup({
    sessionData: {
      sr_log: [
        { announcement: "Name edit text" },
        { announcement: "Required" },
      ],
    },
  });

  document.querySelector("#copy-btn").click();
  await flushAsyncWork();

  assert.deepEqual(toPlain(calls.runtimeSendMessage.at(-1)), {
    type: "SR_COPY_TEXT",
    text: "Name edit text\nRequired",
  });
  assert.equal(
    document.querySelector("#status").textContent,
    "Output copied to clipboard.",
  );
});

test("clear resets stored state and tells the content script", async () => {
  const { document, calls } = await loadPopup({
    sessionData: {
      sr_log: [{ announcement: "Heading level 1" }],
      sr_selected_element: "h1",
    },
  });

  document.querySelector("#clear-btn").click();
  await flushAsyncWork();

  assert.equal(document.querySelector("#copy-btn").disabled, true);
  assert.equal(document.querySelector("#clear-btn").disabled, true);
  assert.equal(
    document.querySelector("#log-container").classList.contains("hidden"),
    true,
  );
  assert.equal(
    document.querySelector("#selected-element").classList.contains("hidden"),
    true,
  );
  assert.deepEqual(toPlain(calls.sessionSet.at(-1)), {
    sr_log: [],
    sr_selected_element: "",
    sr_selecting: false,
    sr_scanning: false,
  });
  assert.deepEqual(toPlain(calls.tabsSendMessage.at(-1)), {
    tabId: 123,
    message: { type: "SR_CLEAR" },
  });
});
