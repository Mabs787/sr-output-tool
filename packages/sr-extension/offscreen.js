chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== "SR_OFFSCREEN_COPY") {
    return undefined;
  }

  navigator.clipboard
    .writeText(msg.text || "")
    .then(() => sendResponse({ ok: true }))
    .catch((error) => {
      sendResponse({
        ok: false,
        error: error?.message || String(error),
      });
    });

  return true;
});
