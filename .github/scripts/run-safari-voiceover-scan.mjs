import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = process.cwd();
const outputRoot = path.join(repoRoot, "voiceover-smoke/safari-scans");
const manifestPath = process.env.VOICEOVER_SCAN_MANIFEST
  ? path.resolve(repoRoot, process.env.VOICEOVER_SCAN_MANIFEST)
  : "";
const scanMarkerTexts = {
  start: "SR Output Tool VoiceOver scan start marker",
  end: "SR Output Tool VoiceOver scan end marker",
};
const captureStepScreenshots = process.env.VOICEOVER_CAPTURE_STEP_SCREENSHOTS === "true";
let stepScreenshotsEnabled = captureStepScreenshots;
const captureStepSnapshots = process.env.VOICEOVER_CAPTURE_STEP_SNAPSHOTS === "true";
const captureScreenRecording = process.env.VOICEOVER_CAPTURE_SCREEN_RECORDING === "true";
const navigationMode = process.env.VOICEOVER_NAVIGATION_MODE === "plain-right-arrow"
  ? "plain-right-arrow"
  : "voiceover-right-arrow";
const defaultMaxSteps = positiveInteger(process.env.VOICEOVER_MAX_STEPS, 400);
const defaultMaxStepSeconds = positiveNumber(process.env.VOICEOVER_MAX_STEP_SECONDS, 30);
const postNavigationSettleSeconds = nonNegativeNumber(
  process.env.VOICEOVER_POST_NAVIGATION_SETTLE_SECONDS,
  3,
);
const viewport = {
  width: positiveInteger(process.env.VOICEOVER_VIEWPORT_WIDTH, 1200),
  height: positiveInteger(process.env.VOICEOVER_VIEWPORT_HEIGHT, 700),
};
const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

function positiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function nonNegativeNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function positiveInteger(value, fallback) {
  return Math.floor(positiveNumber(value, fallback));
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    input: options.input,
    timeout: options.timeout || 15000,
  });
  return {
    ok: result.status === 0 && !result.error,
    status: result.status,
    signal: result.signal,
    stdout: String(result.stdout || "").trim(),
    stderr: String(result.stderr || "").trim(),
    error: result.error ? String(result.error.message || result.error) : "",
  };
}

function runAppleScript(script, timeout = 15000) {
  return run("osascript", ["-"], { input: script, timeout });
}

function sleep(seconds) {
  return run("sleep", [String(seconds)], { timeout: Math.ceil((seconds + 2) * 1000) });
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

function parseKeyValueOutput(stdout) {
  const result = {};
  for (const line of String(stdout || "").split(/\r?\n/)) {
    const separator = line.indexOf("=");
    if (separator > 0) result[line.slice(0, separator)] = line.slice(separator + 1);
  }
  return result;
}

function normalizeWhitespace(value) {
  return String(value || "").replace(/[\r\n\t ]+/g, " ").trim();
}

export function isSafariSystemNoise(value) {
  const announcement = normalizeWhitespace(value);
  return (
    announcement === "Edit button" ||
    announcement === "Edit customizations button" ||
    announcement === "Open System Settings button" ||
    announcement.includes("Open System Settings button") ||
    /^Safari(?:,)? .+ window$/i.test(announcement) ||
    /^Safari, .+, window(?:, .+ web content, has)?$/i.test(announcement) ||
    /^Safari .+ window .+ web content has keyboard focus$/i.test(announcement) ||
    /^application,? alert,? system dialog/i.test(announcement) ||
    /requesting to bypass the system private window picker/i.test(announcement)
  );
}

export function normalizeDirectVoiceOverText(value) {
  const normalized = normalizeWhitespace(value);
  if (!normalized || /^error=-?\d+\b/.test(normalized) || isSafariSystemNoise(normalized)) return "";
  return normalized;
}

export function selectDirectVoiceOverSource(state) {
  const rawPhrase = normalizeWhitespace(state?.lastPhrase);
  const rawCursor = normalizeWhitespace(state?.voCursorText);
  if (getScanBoundary(rawPhrase)) return { source: "lastPhrase", text: rawPhrase, direct: true };
  if (getScanBoundary(rawCursor)) return { source: "voCursorText", text: rawCursor, direct: true };
  const lastPhrase = normalizeDirectVoiceOverText(state?.lastPhrase);
  const voCursorText = normalizeDirectVoiceOverText(state?.voCursorText);
  if (lastPhrase) return { source: "lastPhrase", text: lastPhrase, direct: true };
  if (voCursorText) return { source: "voCursorText", text: voCursorText, direct: true };
  return { source: "none", text: "", direct: false };
}

export function getScanBoundary(value) {
  const normalized = normalizeWhitespace(value).toLowerCase();
  if (normalized.includes(scanMarkerTexts.start.toLowerCase())) return "start";
  if (normalized.includes(scanMarkerTexts.end.toLowerCase())) return "end";
  return "";
}

export function normalizeCapturedAnnouncements(steps) {
  const hasStart = steps.some((step) => getScanBoundary(step.selected?.text) === "start");
  const announcements = [];
  let withinScan = !hasStart;
  for (const step of steps) {
    const text = normalizeDirectVoiceOverText(step.selected?.text);
    const boundary = getScanBoundary(text);
    if (boundary === "start") {
      withinScan = true;
      continue;
    }
    if (boundary === "end") break;
    if (withinScan && text) announcements.push(text);
  }
  while (announcements.length > 1 && announcements.at(-1) === announcements.at(-2)) {
    announcements.pop();
  }
  return announcements;
}

export function detectSafariStall(steps, repeatedLimit = 8, emptyLimit = 5) {
  const recent = steps.slice(-repeatedLimit).map((step) => normalizeDirectVoiceOverText(step.selected?.text));
  if (recent.length >= repeatedLimit && recent.every((text) => text && text === recent[0])) {
    return "repeated-direct-output";
  }
  const empty = steps.slice(-emptyLimit);
  if (empty.length >= emptyLimit && empty.every((step) => !normalizeDirectVoiceOverText(step.selected?.text))) {
    return "no-direct-output";
  }
  return "";
}

export function assessSafariCaptureTrust(runs) {
  const reasons = [];
  if (!Array.isArray(runs) || runs.length !== 3) reasons.push("exactly three runs are required");
  for (const [index, runResult] of (runs || []).entries()) {
    if (!runResult?.markers?.startReached) reasons.push(`run ${index + 1} did not reach the start marker`);
    if (!runResult?.markers?.endReached) reasons.push(`run ${index + 1} did not reach the end marker`);
    if (runResult?.errors?.length) reasons.push(`run ${index + 1} contains runner errors`);
    if ((runResult?.sources || []).some((source) => !["lastPhrase", "voCursorText"].includes(source))) {
      reasons.push(`run ${index + 1} contains a non-direct source`);
    }
  }
  const sequences = (runs || []).map((runResult) => JSON.stringify(runResult?.announcements || []));
  if (sequences.length === 3 && new Set(sequences).size !== 1) reasons.push("ordered announcements differ between runs");
  const fingerprints = (runs || []).map((runResult) => runResult?.semanticFingerprint || "").filter(Boolean);
  if (fingerprints.length === 3 && new Set(fingerprints).size !== 1) reasons.push("semantic fingerprints differ between runs");
  return { trusted: reasons.length === 0, status: reasons.length ? "candidate" : "trusted", reasons };
}

function targetUrl(target) {
  return target.url || pathToFileURL(path.resolve(repoRoot, target.fixturePath)).href;
}

function targetName(target, index) {
  if (target.name) return target.name;
  try {
    const url = new URL(targetUrl(target));
    return `${url.hostname}${url.pathname}`.replace(/\/$/, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
  } catch {
    return `target-${index + 1}`;
  }
}

function safariJavaScript(script, timeout = 15000) {
  const appleScript = `
tell application "Safari"
  do JavaScript ${appleString(script)} in document 1
end tell
`;
  const attempts = [];
  const dismissals = [];
  let result = runAppleScript(appleScript, timeout);
  attempts.push(result);
  for (let attempt = 1; attempt <= 3 && !result.ok; attempt += 1) {
    dismissals.push(dismissAutomationPermissionDialog());
    activateSafari();
    sleep(attempt);
    result = runAppleScript(appleScript, timeout);
    attempts.push(result);
  }
  return { ...result, attempts, dismissals };
}

function launchSafari(url) {
  const quit = runAppleScript('tell application "Safari" to quit', 5000);
  run("killall", ["Safari"], { timeout: 5000 });
  sleep(2);
  const open = run("open", ["-a", "Safari", url], { timeout: 15000 });
  sleep(2);
  const windowSetupScript = `
tell application "Safari"
  activate
  try
    set bounds of front window to {0, 0, ${viewport.width}, ${viewport.height}}
  end try
end tell
`;
  let windowSetup = runAppleScript(windowSetupScript, 10000);
  if (!windowSetup.ok) {
    const permission = dismissAutomationPermissionDialog();
    windowSetup = { ...runAppleScript(windowSetupScript, 10000), permission };
  }
  return { quit, open, windowSetup };
}

function activateSafari() {
  return runAppleScript('tell application "Safari" to activate', 8000);
}

function launchVoiceOver() {
  run("pkill", ["-x", "VoiceOver Quick"], { timeout: 5000 });
  run("pkill", ["-x", "VoiceOver"], { timeout: 5000 });
  sleep(2);
  const open = run("open", ["-a", "VoiceOver"], { timeout: 10000 });
  sleep(3);
  run("pkill", ["-x", "VoiceOver Quick"], { timeout: 5000 });
  return open;
}

function dismissAutomationPermissionDialog() {
  return runAppleScript(`
tell application "System Events"
  repeat with processToRead in application processes
    try
      repeat with windowToRead in windows of processToRead
        if exists button "Allow" of windowToRead then
          click button "Allow" of windowToRead
          return "clicked=" & (name of processToRead as text) & ":Allow"
        end if
      end repeat
    end try
  end repeat
end tell
return "no permission dialog"
`, 10000);
}

function dismissSafariDialogs() {
  return runAppleScript(`
tell application "System Events"
  if exists process "Safari" then
    tell process "Safari"
      repeat with windowToRead in windows
        repeat with buttonName in {"Not Now", "Cancel", "Close", "OK"}
          try
            if exists button (buttonName as text) of windowToRead then
              click button (buttonName as text) of windowToRead
              return "clicked=" & (buttonName as text)
            end if
          end try
        end repeat
      end repeat
    end tell
  end if
end tell
return "no Safari dialog"
`, 10000);
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
  set phraseText to my safeText(content of last phrase)
  set cursorText to my safeText(text under cursor of vo cursor)
  return "lastPhrase=" & phraseText & linefeed & "voCursorText=" & cursorText
end tell
`, 8000);
}

function captureVoiceOverStateWithRecovery() {
  const attempts = [];
  let result = captureVoiceOverState();
  attempts.push(result);
  for (let attempt = 1; attempt <= 3 && !result.ok; attempt += 1) {
    dismissAutomationPermissionDialog();
    activateSafari();
    sleep(attempt);
    result = captureVoiceOverState();
    attempts.push(result);
  }
  return { result, attempts };
}

function captureVoiceOverAfterNavigation(previousText = "") {
  const pollDelays = [0.25, 0.5, 0.75, 1];
  const polls = [];
  let latest = null;
  for (const delay of pollDelays) {
    sleep(delay);
    latest = captureVoiceOverStateWithRecovery();
    const raw = parseKeyValueOutput(latest.result.stdout);
    const selected = selectDirectVoiceOverSource(raw);
    polls.push({ delay, raw, selected, capture: latest });
    if (selected.text && (selected.text !== previousText || getScanBoundary(selected.text))) {
      return { ...latest, raw, selected, polls };
    }
  }
  const fallback = polls.at(-1);
  return {
    ...latest,
    raw: fallback?.raw || {},
    selected: fallback?.selected || { source: "none", text: "", direct: false },
    polls,
  };
}

function captureSafariFocus() {
  return runAppleScript(`
tell application "System Events"
  tell process "Safari"
    try
      set focusedElement to value of attribute "AXFocusedUIElement"
      set focusedRole to role of focusedElement as text
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

function navigateRight() {
  if (navigationMode === "plain-right-arrow") {
    return runAppleScript('tell application "System Events" to key code 124', 8000);
  }
  return runAppleScript('tell application "System Events" to key code 124 using {control down, option down}', 8000);
}

function pageStateSnapshot() {
  const script = `JSON.stringify((() => {
    const active = document.activeElement;
    const root = active && active !== document.body ? active : document.body;
    return {
      url: location.href,
      title: document.title,
      readyState: document.readyState,
      activeElement: active ? {
        tagName: active.tagName.toLowerCase(),
        role: active.getAttribute('role') || '',
        name: active.getAttribute('aria-label') || active.innerText || active.value || '',
        html: active.outerHTML?.slice(0, 4000) || ''
      } : null,
      domExcerpt: root?.outerHTML?.slice(0, 12000) || '',
      semanticFingerprint: Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6,a[href],button,input,select,textarea,ul,ol,li,[role]'))
        .map((element) => [element.tagName, element.getAttribute('role') || '', element.getAttribute('aria-label') || '', (element.innerText || element.value || '').replace(/\\s+/g, ' ').trim()].join('|'))
        .join('\\n')
    };
  })())`;
  const result = safariJavaScript(script, 20000);
  let parsed = null;
  try { parsed = JSON.parse(result.stdout); } catch {}
  return { capture: result, parsed };
}

function injectBoundaryMarkers() {
  const script = `JSON.stringify((() => {
    document.querySelectorAll('[data-sr-voiceover-scan-boundary]').forEach((element) => element.remove());
    const make = (boundary, text) => {
      const marker = document.createElement('p');
      marker.dataset.srVoiceoverScanBoundary = boundary;
      marker.tabIndex = -1;
      marker.textContent = text;
      marker.style.cssText = 'display:block;margin:0;padding:0;font-size:1px;line-height:1px;color:transparent;background:transparent';
      return marker;
    };
    const start = make('start', ${JSON.stringify(scanMarkerTexts.start)});
    const end = make('end', ${JSON.stringify(scanMarkerTexts.end)});
    document.body.insertBefore(start, document.body.firstChild);
    document.body.appendChild(end);
    return { start: start.textContent, end: end.textContent };
  })())`;
  return safariJavaScript(script, 15000);
}

function focusStartMarker() {
  const script = `JSON.stringify((() => {
    const marker = document.querySelector('[data-sr-voiceover-scan-boundary="start"]');
    if (!marker) return { action: 'missing' };
    marker.scrollIntoView({ block: 'start' });
    marker.focus({ preventScroll: true });
    return { action: 'focused', text: marker.textContent };
  })())`;
  return safariJavaScript(script, 15000);
}

function dismissPageConsent() {
  const script = `JSON.stringify((() => {
    const labels = ['reject all','reject optional','reject non-essential','decline all','continue without accepting','necessary cookies only','essential cookies only','save choices','accept all','accept cookies'];
    const candidates = Array.from(document.querySelectorAll('button,[role="button"],input[type="button"],input[type="submit"]'));
    const normalize = (value) => String(value || '').replace(/\\s+/g, ' ').trim().toLowerCase();
    for (const label of labels) {
      const match = candidates.find((element) => normalize(element.getAttribute('aria-label') || element.value || element.innerText || element.textContent) === label);
      if (match) { match.click(); return { action: 'clicked', label }; }
    }
    return { action: 'none' };
  })())`;
  return safariJavaScript(script, 15000);
}

function captureRenderedHtml() {
  const script = `(() => {
    document.querySelectorAll('[data-sr-voiceover-scan-boundary]').forEach((element) => element.remove());
    return document.documentElement.outerHTML;
  })()`;
  return safariJavaScript(script, 30000);
}

function captureScreenshot(outputDir, index, force = false) {
  if (!stepScreenshotsEnabled && !force) return null;
  const screenshotDir = path.join(outputDir, "screenshots");
  mkdirSync(screenshotDir, { recursive: true });
  const filePath = path.join(screenshotDir, `${String(index).padStart(4, "0")}.png`);
  const attempts = [];
  let result = run("screencapture", ["-x", filePath], { timeout: 15000 });
  attempts.push(result);
  const permission = dismissAutomationPermissionDialog();
  if (permission.stdout.startsWith("clicked=")) {
    sleep(1);
    result = run("screencapture", ["-x", filePath], { timeout: 15000 });
    attempts.push(result);
  }
  return { ...result, path: path.relative(outputDir, filePath), permission, attempts };
}

function startScreenRecording(outputDir) {
  if (!captureScreenRecording) return null;
  const filePath = path.join(outputDir, "safari-voiceover.mov");
  const child = spawn("screencapture", ["-v", filePath], { cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"] });
  return { child, filePath, startedAt: new Date().toISOString(), stdout: "", stderr: "" };
}

async function stopScreenRecording(recording) {
  if (!recording) return { enabled: false };
  recording.child.kill("SIGINT");
  await new Promise((resolve) => {
    const timeout = setTimeout(resolve, 5000);
    recording.child.once("exit", () => { clearTimeout(timeout); resolve(); });
  });
  const exists = existsSync(recording.filePath);
  return {
    enabled: true,
    path: path.basename(recording.filePath),
    fileExists: exists,
    fileSize: exists ? statSync(recording.filePath).size : 0,
    startedAt: recording.startedAt,
    finishedAt: new Date().toISOString(),
  };
}

function runnerEnvironment() {
  return {
    schemaVersion: 1,
    browserProfile: "safari-voiceover",
    capturedAt: new Date().toISOString(),
    platform: run("sw_vers", [], { timeout: 5000 }).stdout,
    safariVersion: run("defaults", ["read", "/Applications/Safari.app/Contents/Info", "CFBundleShortVersionString"], { timeout: 5000 }).stdout,
    voiceOverVersion: run("defaults", ["read", "/System/Library/CoreServices/VoiceOver.app/Contents/Info", "CFBundleShortVersionString"], { timeout: 5000 }).stdout,
    locale: process.env.LANG || "",
    viewport,
    navigationMode,
    recognitionDisabled: true,
    announcementSources: ["lastPhrase", "voCursorText"],
  };
}

function writeProgress(outputDir, summary, steps, partial = true) {
  const announcements = normalizeCapturedAnnouncements(steps);
  const sources = steps
    .filter((step) => step.selected?.text && !getScanBoundary(step.selected.text))
    .map((step) => step.selected.source);
  writeJson(path.join(outputDir, "voiceover-output.json"), {
    schemaVersion: 1,
    browserProfile: "safari-voiceover",
    normalization: "direct-voiceover-system-noise-filtered",
    expectedSource: "direct-voiceover-api",
    partial,
    announcements,
    markers: summary.markers,
    stopReason: summary.stopReason || "in-progress",
  });
  writeJson(path.join(outputDir, "voiceover-sources.json"), {
    schemaVersion: 1,
    browserProfile: "safari-voiceover",
    partial,
    sources,
    steps: steps.map((step) => ({
      index: step.index,
      raw: step.raw,
      selected: step.selected,
      boundary: getScanBoundary(step.selected?.text),
      timing: step.timing,
      captureOk: step.captureOk,
    })),
  });
  writeJson(path.join(outputDir, "scan-debug.json"), { ...summary, partial, capturedSteps: steps.length });
}

async function scanTarget(target, index) {
  const name = targetName(target, index);
  const outputDir = path.join(outputRoot, name);
  mkdirSync(outputDir, { recursive: true });
  const maxSteps = positiveInteger(target.maxSteps, defaultMaxSteps);
  const maxStepSeconds = positiveNumber(target.maxStepSeconds, defaultMaxStepSeconds);
  const summary = {
    schemaVersion: 1,
    name,
    url: targetUrl(target),
    browserProfile: "safari-voiceover",
    navigationMode,
    viewport,
    maxSteps,
    maxStepSeconds,
    startedAt: new Date().toISOString(),
    markers: { startReached: false, endReached: false },
    errors: [],
  };
  writeJson(path.join(outputDir, "runner-environment.json"), runnerEnvironment());
  const launch = launchSafari(summary.url);
  sleep(5);
  dismissSafariDialogs();
  const consent = dismissPageConsent();
  sleep(postNavigationSettleSeconds);
  const markers = injectBoundaryMarkers();
  const initialPageState = pageStateSnapshot();
  const semanticFingerprint = initialPageState.parsed?.semanticFingerprint || "";
  const screenshotPermissionPreflight = captureStepScreenshots
    ? captureScreenshot(outputDir, "permission-preflight", true)
    : { enabled: false };
  if (captureStepScreenshots && !screenshotPermissionPreflight.ok) stepScreenshotsEnabled = false;
  const voiceOverLaunch = launchVoiceOver();
  sleep(3);
  dismissAutomationPermissionDialog();
  const voiceOverPermissionPreflight = captureVoiceOverStateWithRecovery();
  activateSafari();
  const focus = focusStartMarker();
  sleep(2);
  const recording = startScreenRecording(outputDir);
  const steps = [];
  const snapshots = [];
  let stopReason = "max-steps";

  for (let stepIndex = 0; stepIndex < maxSteps; stepIndex += 1) {
    const startedAt = Date.now();
    const navigation = stepIndex === 0 ? { ok: true, stdout: "initial capture" } : navigateRight();
    if (stepIndex > 0 && stepIndex % 10 === 0) dismissAutomationPermissionDialog();
    if (stepIndex > 0 && stepIndex % 25 === 0) dismissSafariDialogs();
    const captured = captureVoiceOverAfterNavigation(steps.at(-1)?.selected?.text || "");
    const raw = captured.raw;
    const selected = captured.selected;
    const focusState = parseKeyValueOutput(captureSafariFocus().stdout);
    const durationMs = Date.now() - startedAt;
    const timing = {
      startedAt: new Date(startedAt).toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs,
      maxStepSeconds,
      exceededMaxStepSeconds: durationMs > maxStepSeconds * 1000,
    };
    const boundary = getScanBoundary(selected.text);
    if (boundary === "start") summary.markers.startReached = true;
    if (boundary === "end") summary.markers.endReached = true;
    const step = {
      index: stepIndex,
      navigation,
      captureOk: captured.result.ok,
      captureAttempts: captured.attempts,
      directPolls: captured.polls.map((poll) => ({ delay: poll.delay, raw: poll.raw, selected: poll.selected })),
      raw,
      selected,
      focus: focusState,
      timing,
      screenshot: captureScreenshot(outputDir, stepIndex),
    };
    steps.push(step);
    if (captureStepSnapshots) snapshots.push({ index: stepIndex, announcement: selected.text, focus: focusState, ...pageStateSnapshot() });
    writeProgress(outputDir, summary, steps, true);

    if (!captured.result.ok) {
      summary.errors.push(`VoiceOver direct read failed at step ${stepIndex}`);
      stopReason = "direct-read-failure";
      break;
    }
    if (timing.exceededMaxStepSeconds) {
      summary.errors.push(`Step ${stepIndex} exceeded ${maxStepSeconds} seconds`);
      stopReason = "step-timeout";
      break;
    }
    if (boundary === "end") {
      stopReason = "scan-end-marker";
      break;
    }
    const stall = detectSafariStall(steps);
    if (stall) {
      summary.errors.push(`Traversal stalled: ${stall}`);
      stopReason = stall;
      break;
    }
  }

  summary.stopReason = stopReason;
  summary.finishedAt = new Date().toISOString();
  summary.capturedSteps = steps.length;
  if (!summary.markers.startReached) summary.errors.push("Start marker was not reached");
  if (!summary.markers.endReached) summary.errors.push("End marker was not reached");
  const rendered = captureRenderedHtml();
  if (!rendered.ok) summary.errors.push("Safari rendered HTML capture failed");
  writeText(path.join(outputDir, "rendered-html.html"), rendered.stdout || "");
  if (captureStepSnapshots) writeJson(path.join(outputDir, "step-snapshots.json"), { schemaVersion: 1, snapshots });
  const screenRecording = await stopScreenRecording(recording);
  writeJson(path.join(outputDir, "capture-manifest.json"), {
    schemaVersion: 1,
    browserProfile: "safari-voiceover",
    sourceCommit: process.env.GITHUB_SHA || "",
    target,
    launch,
    consent,
    markers,
    focus,
    voiceOverLaunch,
    voiceOverPermissionPreflight,
    screenshotPermissionPreflight,
    semanticFingerprint,
    screenRecording,
    files: ["voiceover-output.json", "voiceover-sources.json", "rendered-html.html", "scan-debug.json", "runner-environment.json"],
  });
  writeProgress(outputDir, summary, steps, Boolean(summary.errors.length));
  if (summary.errors.length) throw new Error(`${name}: ${summary.errors.join("; ")}`);
}

async function main() {
  if (!manifestPath) throw new Error("VOICEOVER_SCAN_MANIFEST is required");
  mkdirSync(outputRoot, { recursive: true });
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  for (const [index, target] of manifest.entries()) await scanTarget(target, index);
}

if (isCli) {
  try {
    await main();
  } catch (error) {
    console.error(error?.stack || error?.message || String(error));
    process.exitCode = 1;
  }
}
