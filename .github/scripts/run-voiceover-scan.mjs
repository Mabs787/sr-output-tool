import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const manifestPath = path.join(
  repoRoot,
  "packages/sr-engine/fixtures/voiceover-sites.json",
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
  return runAppleScript(`
tell application "Safari"
  activate
  open location ${appleString(url)}
end tell
`, 15000);
}

function launchVoiceOver() {
  run("open", ["-a", "VoiceOver"], { timeout: 10000 });
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
                    delay 1
                    exit repeat
                  end if
                end try
              end repeat
            end try
          end repeat
        end try
        delay 1
      end repeat
    end tell
  end if
end tell
return logText
`, 12000);
}

function navigateRight() {
  return runAppleScript(`
tell application "System Events"
  key code 124 using {control down, option down}
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

function renderEngineOutput(scanRootSelector) {
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

function compare(targetName, voiceOverSteps, engineResult) {
  const voiceOverLines = voiceOverSteps
    .map((step) => step.voiceOver?.lastPhrase || step.voiceOver?.voCursorText || "")
    .filter(Boolean);
  const engineLines = Array.isArray(engineResult?.announcements)
    ? engineResult.announcements
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
    url,
    steps: target.steps,
    startedAt: new Date().toISOString(),
  };

  const launchSafariResult = launchSafari(url);
  run("sleep", ["3"], { timeout: 5000 });
  const dismissSafariBeforeVoiceOver = dismissSafariDialogs();
  launchVoiceOver();
  run("sleep", ["5"], { timeout: 7000 });
  run("pkill", ["-x", "VoiceOver Quick"], { timeout: 5000 });
  activateSafari();
  const dismissSafariAfterVoiceOver = dismissSafariDialogs();
  run("sleep", ["1"], { timeout: 3000 });

  let engineRaw = renderEngineOutput(
    target.scanRootSelector || "[data-sr-scan-root]",
  );
  if (!engineRaw.ok) {
    dismissSafariDialogs();
    engineRaw = renderEngineOutput(
      target.scanRootSelector || "[data-sr-scan-root]",
    );
  }
  let engineResult;
  try {
    engineResult = JSON.parse(engineRaw.stdout || "{}");
  } catch (error) {
    engineResult = { error: `Unable to parse engine output: ${error.message}` };
  }

  const voiceOverSteps = [];
  for (let index = 0; index < Number(target.steps || 3); index += 1) {
    const navigation = navigateRight();
    run("sleep", ["1"], { timeout: 3000 });
    const voiceOverRaw = captureVoiceOverState();
    const focusRaw = captureSafariFocus();

    voiceOverSteps.push({
      index: index + 1,
      navigation,
      voiceOverRaw,
      voiceOver: parseVoiceOverText(voiceOverRaw.stdout || ""),
      focusRaw,
      focus: parseVoiceOverText(focusRaw.stdout || ""),
    });
  }

  summary.finishedAt = new Date().toISOString();
  summary.launchSafari = launchSafariResult;
  summary.dismissSafariBeforeVoiceOver = dismissSafariBeforeVoiceOver;
  summary.dismissSafariAfterVoiceOver = dismissSafariAfterVoiceOver;
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
