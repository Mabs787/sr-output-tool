import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { JSDOM } from "jsdom";

const repoRoot = process.cwd();
const manifestPath = path.join(
  repoRoot,
  "packages/sr-engine/fixtures/voiceover-sites.json",
);
const engineRuntimePath = path.join(
  repoRoot,
  "packages/sr-extension/src/content/engine-runtime.js",
);
const outputRoot = path.join(repoRoot, "voiceover-smoke/scans");

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    timeout: options.timeout ?? 15000,
    input: options.input,
  });
}

function runAppleScript(script, timeout = 15000) {
  const result = run("osascript", ["-"], { input: script, timeout });
  return {
    ok: result.status === 0 && !result.error,
    status: result.status,
    signal: result.signal,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
    error: result.error ? String(result.error.message || result.error) : "",
  };
}

function toCommandResult(result) {
  return {
    ok: result.status === 0 && !result.error,
    status: result.status,
    signal: result.signal,
    stdout: String(result.stdout || "").trim(),
    stderr: String(result.stderr || "").trim(),
    error: result.error ? String(result.error.message || result.error) : "",
  };
}

function appleString(value) {
  return JSON.stringify(String(value));
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(filePath, value) {
  writeFileSync(filePath, `${String(value).trimEnd()}\n`);
}

function getTargetUrl(target) {
  if (target.url) {
    return target.url;
  }

  const fixturePath = path.resolve(repoRoot, target.fixturePath);
  return pathToFileURL(fixturePath).href;
}

function launchSafari(url) {
  const stopSafariResult = runAppleScript(`
tell application "Safari"
  quit
end tell
`, 5000);
  run("killall", ["Safari"], { timeout: 5000 });
  run("sleep", ["2"], { timeout: 4000 });
  const openResult = toCommandResult(
    run("open", ["-a", "Safari", url], { timeout: 15000 }),
  );
  const activateResult = activateSafari();

  return {
    ...openResult,
    stopSafari: stopSafariResult,
    activateSafari: activateResult,
  };
}

function launchVoiceOver() {
  run("pkill", ["-x", "VoiceOver Quick"], { timeout: 5000 });
  run("pkill", ["-x", "VoiceOver"], { timeout: 5000 });
  run("sleep", ["2"], { timeout: 4000 });
  run("open", ["-a", "VoiceOver"], { timeout: 10000 });
  run("sleep", ["2"], { timeout: 4000 });
  run("pkill", ["-x", "VoiceOver Quick"], { timeout: 5000 });
}

function activateSafari() {
  return runAppleScript('tell application "Safari" to activate', 8000);
}

function dismissSafariDialogs() {
  return runAppleScript(`
set logText to ""
tell application "System Events"
  if exists process "Safari" then
    tell process "Safari"
      repeat with attemptNumber from 1 to 5
        set clickedButton to false
        try
          set logText to logText & "attempt=" & attemptNumber & " windowCount=" & ((count of windows) as text) & linefeed
          repeat with windowToRead in windows
            try
              set logText to logText & "  window=" & ((name of windowToRead) as text) & linefeed
              repeat with buttonToRead in buttons of windowToRead
                try
                  set buttonName to name of buttonToRead as text
                  set logText to logText & "    button=" & buttonName & linefeed
                  if buttonName contains "Not Now" or buttonName contains "Don" or buttonName is "Cancel" or buttonName is "Close" or buttonName is "OK" then
                    click buttonToRead
                    set logText to logText & "clicked=" & buttonName & linefeed
                    set clickedButton to true
                    delay 1
                    exit repeat
                  end if
                end try
              end repeat
            end try
          end repeat
        end try
        if clickedButton is false then set logText to logText & "no dialog action" & linefeed
        delay 1
      end repeat
    end tell
  end if
end tell
return logText
`, 12000);
}

function dismissSystemDialogs() {
  return runAppleScript(`
set logText to ""
tell application "System Events"
  repeat with processToRead in application processes
    try
      set processName to name of processToRead as text
      repeat with windowToRead in windows of processToRead
        try
          set windowName to name of windowToRead as text
          set logText to logText & "process=" & processName & " window=" & windowName & linefeed
          repeat with buttonToRead in buttons of windowToRead
            try
              set buttonName to name of buttonToRead as text
              set logText to logText & "  button=" & buttonName & linefeed
              if buttonName contains "Don" or buttonName contains "Not Now" or buttonName is "OK" or buttonName is "Cancel" or buttonName is "Close" then
                click buttonToRead
                set logText to logText & "clicked=" & processName & ":" & buttonName & linefeed
                delay 1
                return logText
              end if
            end try
          end repeat
        end try
      end repeat
    end try
  end repeat
end tell
return logText
`, 10000);
}

function navigateRight() {
  return runAppleScript(`
tell application "System Events"
  key code 124 using {control down, option down}
end tell
`, 8000);
}

function moveVoiceOverToStart() {
  return runAppleScript(`
tell application "System Events"
  key code 115 using {control down, option down}
  delay 0.5
end tell
`, 8000);
}

function captureVoiceOverState() {
  return runAppleScript(`
on safeText(valueToRead)
  try
    if valueToRead is missing value then return ""
    return valueToRead as text
  on error errorMessage number errorNumber
    return "error=" & errorNumber & " " & errorMessage
  end try
end safeText

tell application "VoiceOver"
  set captionState to false
  try
    set captionState to enabled of caption window
  end try
  set phraseText to my safeText(content of last phrase)
  set cursorText to my safeText(text under cursor of vo cursor)
  return "captionWindowEnabled=" & (captionState as text) & linefeed & "lastPhrase=" & phraseText & linefeed & "voCursorText=" & cursorText
end tell
`, 8000);
}

function captureSafariFocus() {
  return runAppleScript(`
tell application "System Events"
  tell process "Safari"
    try
      set focusedElement to value of attribute "AXFocusedUIElement"
      set focusedRole to role of focusedElement
      set focusedName to ""
      set focusedValue to ""
      try
        set focusedName to name of focusedElement as text
      end try
      try
        set focusedValue to value of focusedElement as text
      end try
      return "role=" & focusedRole & linefeed & "name=" & focusedName & linefeed & "value=" & focusedValue
    on error errorMessage number errorNumber
      return "error=" & errorNumber & " " & errorMessage
    end try
  end tell
end tell
`, 8000);
}

function prepareScanRootInSafari(scanRootSelector) {
  const script = [
    "(() => {",
    `const root = document.querySelector(${JSON.stringify(scanRootSelector)}) || document.body;`,
    "root.setAttribute('tabindex', root.getAttribute('tabindex') || '-1');",
    "root.scrollIntoView({ block: 'start', inline: 'nearest' });",
    "root.focus({ preventScroll: true });",
    "return JSON.stringify({",
    "title: document.title,",
    "readyState: document.readyState,",
    "url: location.href,",
    "activeTagName: document.activeElement?.tagName || '',",
    "activeText: document.activeElement?.innerText || document.activeElement?.value || '',",
    "});",
    "})()",
  ].join(" ");

  return runAppleScript(`
tell application "Safari"
  do JavaScript ${appleString(script)} in document 1
end tell
`, 15000);
}

function prepareScanRoot(target, scanRootSelector) {
  if (target.fixturePath) {
    return {
      ok: true,
      status: 0,
      signal: null,
      stdout:
        "skipped: Safari JavaScript automation is not required for fixture scans",
      stderr: "",
      error: "",
    };
  }

  return prepareScanRootInSafari(scanRootSelector);
}

function injectEngineRuntime() {
  const engineRuntimeSource = readFileSync(engineRuntimePath, "utf8");
  return runAppleScript(`
tell application "Safari"
  do JavaScript ${appleString(engineRuntimeSource)} in document 1
end tell
`, 20000);
}

function renderEngineOutputInJsdom(target, scanRootSelector) {
  if (!target.fixturePath) {
    return null;
  }

  try {
    const fixturePath = path.resolve(repoRoot, target.fixturePath);
    const html = readFileSync(fixturePath, "utf8");
    const engineRuntimeSource = readFileSync(engineRuntimePath, "utf8");
    const dom = new JSDOM(html, {
      url: pathToFileURL(fixturePath).href,
      runScripts: "dangerously",
      pretendToBeVisual: true,
    });
    const { window } = dom;

    if (
      !Object.getOwnPropertyDescriptor(window.HTMLElement.prototype, "innerText")
    ) {
      Object.defineProperty(window.HTMLElement.prototype, "innerText", {
        configurable: true,
        get() {
          return this.textContent || "";
        },
        set(value) {
          this.textContent = value;
        },
      });
    }

    if (!window.CSS) {
      window.CSS = {};
    }

    if (!window.CSS.escape) {
      window.CSS.escape = (value) => String(value);
    }

    window.HTMLElement.prototype.scrollIntoView ||= function scrollIntoView() {};
    window.Date.now = () => 1700000000000;
    window.eval(engineRuntimeSource);

    const createDomScanner = window.__srEngineCreateDomScanner;
    const generateAnnouncement = window.__srEngineGenerateAnnouncement;
    const getContextEndAnnouncement = window.__srEngineGetContextEndAnnouncement;
    if (typeof createDomScanner !== "function") {
      return {
        ok: false,
        status: 1,
        signal: null,
        stdout: "",
        stderr: "engine runtime was not available in jsdom",
        error: "",
      };
    }

    const scanner = createDomScanner({
      generateAnnouncement,
      getContextEndAnnouncement,
      now: () => 1700000000000,
    });
    const root =
      window.document.querySelector(scanRootSelector) || window.document.body;
    const log = scanner.scanSubtree(root);
    return {
      ok: true,
      status: 0,
      signal: null,
      stdout: JSON.stringify({
        source: "jsdom",
        announcements: log.map((entry) => entry.announcement),
        entries: log.map((entry) => ({
          announcement: entry.announcement,
          role: entry.descriptor?.role || "",
          name: entry.descriptor?.name || "",
          tagName: entry.element?.tagName || "",
        })),
      }),
      stderr: "",
      error: "",
    };
  } catch (error) {
    return {
      ok: false,
      status: 1,
      signal: null,
      stdout: "",
      stderr: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function renderEngineOutputInSafari(scanRootSelector) {
  const script = [
    "(() => {",
    "const createDomScanner = window.__srEngineCreateDomScanner;",
    "const generateAnnouncement = window.__srEngineGenerateAnnouncement;",
    "const getContextEndAnnouncement = window.__srEngineGetContextEndAnnouncement;",
    "if (typeof createDomScanner !== 'function') return JSON.stringify({ error: 'engine runtime was not available' });",
    "const scanner = createDomScanner({ generateAnnouncement, getContextEndAnnouncement, now: () => 1700000000000 });",
    `const root = document.querySelector(${JSON.stringify(scanRootSelector)}) || document.body;`,
    "const log = scanner.scanSubtree(root);",
    "return JSON.stringify({",
    "announcements: log.map((entry) => entry.announcement),",
    "entries: log.map((entry) => ({",
    "announcement: entry.announcement,",
    "role: entry.descriptor?.role || '',",
    "name: entry.descriptor?.name || '',",
    "tagName: entry.element?.tagName || '',",
    "})),",
    "});",
    "})()",
  ].join(" ");

  return runAppleScript(`
tell application "Safari"
  do JavaScript ${appleString(script)} in document 1
end tell
`, 15000);
}

function renderEngineOutput(target, scanRootSelector) {
  return (
    renderEngineOutputInJsdom(target, scanRootSelector) ||
    renderEngineOutputInSafari(scanRootSelector)
  );
}

function parseVoiceOverText(stdout) {
  const lines = stdout.split(/\r?\n/);
  const result = {};
  for (const line of lines) {
    const index = line.indexOf("=");
    if (index > -1) {
      result[line.slice(0, index)] = line.slice(index + 1);
    }
  }
  return result;
}

function getCaptureText(step) {
  return [
    step.voiceOver?.lastPhrase || "",
    step.voiceOver?.voCursorText || "",
    step.focus?.role || "",
    step.focus?.name || "",
    step.focus?.value || "",
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function getComparisonVoiceOverText(step) {
  const phrase = step.voiceOver?.lastPhrase || "";
  const cursor = step.voiceOver?.voCursorText || "";
  let comparisonText = phrase || cursor;

  if (
    cursor &&
    (phrase.startsWith("You are currently on ") ||
      phrase.includes(" To click this ") ||
      phrase.includes(" To exit this "))
  ) {
    comparisonText = cursor;
  }

  return comparisonText
    .replace(/^Safari .+? window /, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isComparisonNoise(announcement) {
  return (
    announcement === "main" ||
    announcement === "toolbar" ||
    announcement === "collection" ||
    announcement === "Edit button" ||
    announcement === "Edit customizations button" ||
    announcement.endsWith(" web content") ||
    announcement.includes(" splitter")
  );
}

function getStopPhrases(target) {
  const values = [];
  const stopWhen = target.stopWhen || {};

  if (typeof stopWhen.voiceOverIncludes === "string") {
    values.push(stopWhen.voiceOverIncludes);
  }

  if (Array.isArray(stopWhen.voiceOverIncludes)) {
    values.push(...stopWhen.voiceOverIncludes);
  }

  return values.map((value) => value.toLowerCase());
}

function shouldStopScan({ target, voiceOverSteps, startedAt }) {
  const maxSeconds = Number(target.maxSeconds || 120);
  const elapsedSeconds = (Date.now() - startedAt) / 1000;
  if (elapsedSeconds >= maxSeconds) {
    return { stop: true, reason: `maxSeconds:${maxSeconds}` };
  }

  const latestStep = voiceOverSteps.at(-1);
  const latestText = latestStep ? getCaptureText(latestStep) : "";
  const latestLower = latestText.toLowerCase();
  const stopPhrase = getStopPhrases(target).find((phrase) =>
    latestLower.includes(phrase),
  );
  if (stopPhrase) {
    return { stop: true, reason: `stopWhen.voiceOverIncludes:${stopPhrase}` };
  }

  const meaningfulTexts = voiceOverSteps.map(getCaptureText).filter(Boolean);
  if (meaningfulTexts.length >= 4) {
    const recent = meaningfulTexts.slice(-4);
    if (new Set(recent).size === 1) {
      return { stop: true, reason: "repeated-output" };
    }
  }

  if (voiceOverSteps.length >= 5) {
    const recent = voiceOverSteps.slice(-5).map(getCaptureText);
    if (recent.every((text) => text === "")) {
      return { stop: true, reason: "no-captured-progress" };
    }
  }

  return { stop: false, reason: "" };
}

function compare(targetName, voiceOverSteps, engineResult) {
  const voiceOverLines = voiceOverSteps
    .map(getComparisonVoiceOverText)
    .filter(Boolean)
    .filter((announcement) => !isComparisonNoise(announcement));
  const engineLines = Array.isArray(engineResult?.announcements)
    ? engineResult.announcements.filter(
        (announcement) => !isComparisonNoise(announcement),
      )
    : [];

  const lines = [
    `# ${targetName}`,
    "",
    "## VoiceOver Captures",
    ...voiceOverLines.map((line, index) => `${index + 1}. ${line}`),
    "",
    "## Engine Output",
    ...engineLines.map((line, index) => `${index + 1}. ${line}`),
    "",
    "## Notes",
    "This comparison is artifact-only for now. It does not fail CI.",
  ];

  return `${lines.join("\n")}\n`;
}

function scanTarget(target) {
  const targetOutputDir = path.join(outputRoot, target.name);
  mkdirSync(targetOutputDir, { recursive: true });

  const url = getTargetUrl(target);
  const summary = {
    name: target.name,
    mode: target.mode || "page",
    url,
    maxSteps: target.maxSteps,
    maxSeconds: target.maxSeconds,
    startedAt: new Date().toISOString(),
  };

  const launchSafariResult = launchSafari(url);
  run("sleep", ["3"], { timeout: 5000 });
  const dismissSafariBeforeVoiceOver = dismissSafariDialogs();
  const dismissSystemBeforeVoiceOver = dismissSystemDialogs();
  const prepareScanRootBeforeVoiceOver = prepareScanRoot(
    target,
    target.scanRootSelector || "[data-sr-scan-root]",
  );
  launchVoiceOver();
  run("sleep", ["5"], { timeout: 7000 });
  run("pkill", ["-x", "VoiceOver Quick"], { timeout: 5000 });
  activateSafari();
  const dismissSafariAfterVoiceOver = dismissSafariDialogs();
  const dismissSystemAfterVoiceOver = dismissSystemDialogs();
  activateSafari();
  const prepareScanRootAfterVoiceOver = prepareScanRoot(
    target,
    target.scanRootSelector || "[data-sr-scan-root]",
  );
  run("sleep", ["1"], { timeout: 3000 });
  const resetVoiceOverAfterLoad = moveVoiceOverToStart();
  run("sleep", ["2"], { timeout: 4000 });

  const voiceOverSteps = [];
  const scanStartedAt = Date.now();
  const maxSteps = Number(target.maxSteps || target.steps || 100);
  let stopReason = "maxSteps";

  const initialDismissSystem = dismissSystemDialogs();
  const initialVoiceOverRaw = captureVoiceOverState();
  const initialFocusRaw = captureSafariFocus();
  voiceOverSteps.push({
    index: 0,
    navigation: {
      ok: true,
      status: 0,
      signal: null,
      stdout: "initial capture before navigation",
      stderr: "",
      error: "",
    },
    dismissSystemAfterNavigation: initialDismissSystem,
    voiceOverRaw: initialVoiceOverRaw,
    voiceOver: parseVoiceOverText(initialVoiceOverRaw.stdout || ""),
    focusRaw: initialFocusRaw,
    focus: parseVoiceOverText(initialFocusRaw.stdout || ""),
    recovery: null,
  });

  for (let index = 0; index < maxSteps; index += 1) {
    const navigation = navigateRight();
    run("sleep", ["1"], { timeout: 3000 });
    const dismissSystemAfterNavigation = dismissSystemDialogs();
    const voiceOverRaw = captureVoiceOverState();
    const focusRaw = captureSafariFocus();

    voiceOverSteps.push({
      index: index + 1,
      navigation,
      dismissSystemAfterNavigation,
      voiceOverRaw,
      voiceOver: parseVoiceOverText(voiceOverRaw.stdout || ""),
      focusRaw,
      focus: parseVoiceOverText(focusRaw.stdout || ""),
      recovery: null,
    });

    const stopCheck = shouldStopScan({
      target,
      voiceOverSteps,
      startedAt: scanStartedAt,
    });
    if (stopCheck.stop) {
      stopReason = stopCheck.reason;
      break;
    }
  }

  activateSafari();
  run("sleep", ["1"], { timeout: 3000 });
  const injectEngineRuntimeResult = target.fixturePath
    ? {
        ok: true,
        status: 0,
        signal: null,
        stdout: "skipped: engine output rendered in jsdom for fixture scan",
        stderr: "",
        error: "",
      }
    : injectEngineRuntime();
  let dismissSafariBeforeEngineRetry = null;
  let engineRaw = renderEngineOutput(
    target,
    target.scanRootSelector || "[data-sr-scan-root]",
  );
  if (!engineRaw.ok) {
    dismissSafariBeforeEngineRetry = dismissSafariDialogs();
    dismissSystemDialogs();
    activateSafari();
    run("sleep", ["1"], { timeout: 3000 });
    if (!target.fixturePath) {
      injectEngineRuntime();
    }
    engineRaw = renderEngineOutput(
      target,
      target.scanRootSelector || "[data-sr-scan-root]",
    );
  }
  let engineResult;
  try {
    engineResult = JSON.parse(engineRaw.stdout || "{}");
  } catch (error) {
    engineResult = { error: `Unable to parse engine output: ${error.message}` };
  }

  summary.finishedAt = new Date().toISOString();
  summary.stopReason = stopReason;
  summary.capturedSteps = voiceOverSteps.length;
  summary.launchSafari = launchSafariResult;
  summary.dismissSafariBeforeVoiceOver = dismissSafariBeforeVoiceOver;
  summary.dismissSystemBeforeVoiceOver = dismissSystemBeforeVoiceOver;
  summary.prepareScanRootBeforeVoiceOver = prepareScanRootBeforeVoiceOver;
  summary.dismissSafariAfterVoiceOver = dismissSafariAfterVoiceOver;
  summary.dismissSystemAfterVoiceOver = dismissSystemAfterVoiceOver;
  summary.prepareScanRootAfterVoiceOver = prepareScanRootAfterVoiceOver;
  summary.resetVoiceOverAfterLoad = resetVoiceOverAfterLoad;
  summary.injectEngineRuntime = injectEngineRuntimeResult;
  summary.dismissSafariBeforeEngineRetry = dismissSafariBeforeEngineRetry;
  summary.engineRaw = engineRaw;

  writeJson(path.join(targetOutputDir, "raw.json"), {
    summary,
    engine: engineResult,
    voiceOverSteps,
  });
  writeJson(path.join(targetOutputDir, "engine-output.json"), engineResult);
  writeText(
    path.join(targetOutputDir, "engine-output.txt"),
    Array.isArray(engineResult.announcements)
      ? engineResult.announcements.join("\n")
      : JSON.stringify(engineResult, null, 2),
  );
  writeText(
    path.join(targetOutputDir, "voiceover-output.txt"),
    voiceOverSteps
      .map((step) => {
        const phrase = step.voiceOver?.lastPhrase || "";
        const cursor = step.voiceOver?.voCursorText || "";
        const focusName = step.focus?.name || "";
        const focusRole = step.focus?.role || "";
        return [
          `step ${step.index}`,
          `lastPhrase: ${phrase}`,
          `voCursorText: ${cursor}`,
          `focused: ${focusRole} ${focusName}`.trim(),
        ].join("\n");
      })
      .join("\n\n"),
  );
  writeText(
    path.join(targetOutputDir, "comparison.md"),
    compare(target.name, voiceOverSteps, engineResult),
  );
}

mkdirSync(outputRoot, { recursive: true });

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
for (const target of manifest) {
  scanTarget(target);
}
