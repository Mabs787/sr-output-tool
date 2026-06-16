import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  mkdtempSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawn, spawnSync } from "node:child_process";
import { JSDOM } from "jsdom";

const repoRoot = process.cwd();
const manifestPath = path.join(
  repoRoot,
  "packages/sr-engine/fixtures/voiceover-sites.json",
);
const scanManifestPath = process.env.VOICEOVER_SCAN_MANIFEST
  ? path.resolve(repoRoot, process.env.VOICEOVER_SCAN_MANIFEST)
  : manifestPath;
const scanTargetName = String(process.env.VOICEOVER_SCAN_TARGET || "").trim();
const engineRuntimePath = path.join(
  repoRoot,
  "packages/sr-extension/src/content/engine-runtime.js",
);
const outputRoot = path.join(repoRoot, "voiceover-smoke/scans");
const captureStepScreenshots =
  process.env.VOICEOVER_CAPTURE_STEP_SCREENSHOTS === "true";
const captureScreenRecording =
  process.env.VOICEOVER_CAPTURE_SCREEN_RECORDING === "true";
const requestedScreenRecordingSeconds = Number(
  process.env.VOICEOVER_SCREEN_RECORDING_SECONDS || 180,
);
const screenRecordingSeconds =
  Number.isFinite(requestedScreenRecordingSeconds) &&
  requestedScreenRecordingSeconds > 0
    ? Math.min(Math.floor(requestedScreenRecordingSeconds), 600)
    : 180;
const navigationMode =
  process.env.VOICEOVER_NAVIGATION_MODE === "plain-right-arrow"
    ? "plain-right-arrow"
    : "voiceover-right-arrow";

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

function startScreenRecording() {
  if (!captureScreenRecording) {
    return null;
  }

  const recordingsDir = path.join(repoRoot, "voiceover-smoke/recordings");
  mkdirSync(recordingsDir, { recursive: true });

  const filePath = path.join(recordingsDir, "voiceover-scan.mov");
  const child = spawn(
    "screencapture",
    ["-v", `-V${screenRecordingSeconds}`, filePath],
    {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  const recording = {
    filePath,
    relativePath: path.relative(path.join(repoRoot, "voiceover-smoke"), filePath),
    startedAt: new Date().toISOString(),
    stdout: "",
    stderr: "",
    child,
  };

  child.stdout.on("data", (chunk) => {
    recording.stdout += String(chunk);
  });
  child.stderr.on("data", (chunk) => {
    recording.stderr += String(chunk);
  });

  return recording;
}

function waitForChild(child, timeoutMs) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (code, signal) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve({ code, signal });
    };
    const timer = setTimeout(() => {
      if (!settled && child.exitCode === null) {
        child.kill("SIGTERM");
      }
    }, timeoutMs);

    child.once("exit", finish);
    if (child.exitCode !== null || child.signalCode !== null) {
      finish(child.exitCode, child.signalCode);
    }
  });
}

async function preflightScreenRecordingPermission() {
  if (!captureScreenRecording) {
    return { enabled: false };
  }

  const recordingsDir = path.join(repoRoot, "voiceover-smoke/recordings");
  mkdirSync(recordingsDir, { recursive: true });
  const filePath = path.join(recordingsDir, "screen-recording-preflight.mov");
  const child = spawn("screencapture", ["-v", "-V1", filePath], {
    cwd: repoRoot,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";
  const dismissals = [];
  child.stdout.on("data", (chunk) => {
    stdout += String(chunk);
  });
  child.stderr.on("data", (chunk) => {
    stderr += String(chunk);
  });

  for (let attempt = 1; attempt <= 8 && child.exitCode === null; attempt += 1) {
    run("sleep", ["0.5"], { timeout: 1500 });
    dismissals.push({
      attempt,
      result: dismissSystemDialogs(),
    });
  }

  const { code, signal } = await waitForChild(child, 10000);
  const fileExists = existsSync(filePath);
  return {
    enabled: true,
    path: path.relative(path.join(repoRoot, "voiceover-smoke"), filePath),
    fileExists,
    fileSize: fileExists ? statSync(filePath).size : 0,
    status: code,
    signal,
    stdout: stdout.trim(),
    stderr: stderr.trim(),
    dismissals,
  };
}

function stopScreenRecording(recording) {
  if (!recording) {
    return Promise.resolve({
      enabled: false,
    });
  }

  return new Promise((resolve) => {
    let settled = false;
    let forceStopTimer = null;

    const finish = (code, signal) => {
      if (settled) {
        return;
      }
      settled = true;
      if (forceStopTimer) {
        clearTimeout(forceStopTimer);
      }
      const fileExists = existsSync(recording.filePath);
      const fileSize = fileExists ? statSync(recording.filePath).size : 0;
      resolve({
        enabled: true,
        path: recording.relativePath,
        fileExists,
        fileSize,
        seconds: screenRecordingSeconds,
        startedAt: recording.startedAt,
        finishedAt: new Date().toISOString(),
        status: code,
        signal,
        stdout: recording.stdout.trim(),
        stderr: recording.stderr.trim(),
      });
    };

    recording.child.once("exit", finish);

    if (recording.child.exitCode !== null || recording.child.signalCode !== null) {
      finish(recording.child.exitCode, recording.child.signalCode);
      return;
    }

    // Let screencapture finish on its own so macOS finalizes the .mov file.
    forceStopTimer = setTimeout(() => {
      if (!settled && recording.child.exitCode === null) {
        recording.child.kill("SIGTERM");
      }
    }, (screenRecordingSeconds + 30) * 1000);
  });
}

function getScreenshotFileName(stepIndex, label) {
  const stepPart =
    typeof stepIndex === "number"
      ? String(stepIndex).padStart(3, "0")
      : String(stepIndex)
          .replace(/[^a-z0-9]+/gi, "-")
          .replace(/^-|-$/g, "")
          .toLowerCase() || "scan";
  const labelPart = String(label)
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return `${stepPart}-${labelPart}.png`;
}

function captureScreenshot(targetOutputDir, stepIndex, label) {
  const screenshotsDir = path.join(targetOutputDir, "screenshots");
  mkdirSync(screenshotsDir, { recursive: true });

  const fileName = getScreenshotFileName(stepIndex, label);
  const filePath = path.join(screenshotsDir, fileName);
  const result = toCommandResult(
    run("screencapture", ["-x", filePath], { timeout: 10000 }),
  );

  return {
    ...result,
    label,
    path: path.relative(targetOutputDir, filePath),
    filePath,
  };
}

let captionOcrTool = null;

function getCaptionOcrTool() {
  if (captionOcrTool) {
    return captionOcrTool;
  }

  const tempDir = mkdtempSync(path.join(os.tmpdir(), "sr-vo-ocr-tool-"));
  const scriptPath = path.join(tempDir, "read-voiceover-caption.swift");
  const binaryPath = path.join(tempDir, "read-voiceover-caption");
  writeFileSync(
    scriptPath,
    `
import AppKit
import Foundation
import Vision

let imagePath = CommandLine.arguments.dropFirst().first ?? ""
guard let image = NSImage(contentsOfFile: imagePath),
      let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
  FileHandle.standardError.write(Data("Unable to read screenshot\\n".utf8))
  exit(1)
}

final class Candidate {
  let text: String
  let confidence: Float
  let minX: CGFloat
  let minY: CGFloat
  let maxY: CGFloat

  init(text: String, confidence: Float, box: CGRect) {
    self.text = text
    self.confidence = confidence
    self.minX = box.minX
    self.minY = box.minY
    self.maxY = box.maxY
  }
}

var candidates: [Candidate] = []
let request = VNRecognizeTextRequest { request, error in
  if let error {
    FileHandle.standardError.write(Data("\\(error.localizedDescription)\\n".utf8))
    return
  }

  let observations = request.results as? [VNRecognizedTextObservation] ?? []
  for observation in observations {
    guard let recognized = observation.topCandidates(1).first else { continue }
    let text = recognized.string.trimmingCharacters(in: .whitespacesAndNewlines)
    if text.isEmpty || text == "×" || text.lowercased() == "x" { continue }
    // VoiceOver's caption panel is anchored near the lower-middle of the
    // hosted runner display. Keep only text inside that panel so page content
    // visible behind it is not mixed into the captured announcement.
    if observation.boundingBox.minX >= 0.095 &&
       observation.boundingBox.minY >= 0.10 &&
       observation.boundingBox.maxY <= 0.24 {
      candidates.append(Candidate(text: text, confidence: recognized.confidence, box: observation.boundingBox))
    }
  }
}

request.recognitionLevel = .accurate
request.usesLanguageCorrection = false

let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
try handler.perform([request])

let sorted = candidates.sorted {
  if abs($0.minY - $1.minY) > 0.025 {
    return $0.minY > $1.minY
  }
  return $0.minX < $1.minX
}

let caption = sorted.map { $0.text }.joined(separator: " ")
let debug = sorted.map {
  "\\($0.text)@confidence:\\(String(format: "%.2f", $0.confidence)),x:\\(String(format: "%.3f", Double($0.minX))),y:\\(String(format: "%.3f", Double($0.minY)))-\\(String(format: "%.3f", Double($0.maxY)))"
}.joined(separator: " | ")

print("captionOcrText=\\(caption)")
print("captionOcrDebug=\\(debug)")
`,
  );

  const compile = toCommandResult(
    run("swiftc", [scriptPath, "-o", binaryPath], { timeout: 60000 }),
  );
  captionOcrTool = {
    ok: compile.ok,
    path: binaryPath,
    compile,
  };
  return captionOcrTool;
}

function createFailedCaptionOcrResult(screenshot, message, extra = {}) {
  return {
    screenshot,
    ocr: {
      ok: false,
      status: extra.status ?? null,
      signal: extra.signal ?? null,
      stdout: extra.stdout || "",
      stderr: extra.stderr || "",
      error: extra.error || message,
    },
    parsed: {},
    tool: extra.tool || null,
  };
}

function captureVoiceOverCaptionOcrState(targetOutputDir, stepIndex) {
  const screenshot = captureScreenshot(
    targetOutputDir,
    stepIndex,
    "voiceover-caption",
  );
  if (!screenshot.ok) {
    return {
      screenshot,
      ocr: {
        ok: false,
        status: screenshot.status,
        signal: screenshot.signal,
        stdout: "",
        stderr: screenshot.stderr,
        error: screenshot.error || "Unable to capture screenshot for OCR",
      },
      parsed: {},
    };
  }

  const tool = getCaptionOcrTool();
  if (!tool.ok) {
    return createFailedCaptionOcrResult(
      screenshot,
      "Unable to compile VoiceOver caption OCR helper",
      {
        tool,
        status: tool.compile.status,
        signal: tool.compile.signal,
        stdout: tool.compile.stdout,
        stderr: tool.compile.stderr,
        error: tool.compile.error,
      },
    );
  }

  const ocr = toCommandResult(
    run(tool.path, [screenshot.filePath], { timeout: 10000 }),
  );

  return {
    screenshot,
    ocr,
    parsed: parseVoiceOverText(ocr.stdout || ""),
    tool: {
      ok: tool.ok,
      path: tool.path,
      compile: tool.compile,
    },
  };
}

function cleanCaptionOcrText(value) {
  return String(value || "")
    .replace(/^[x×]\s*/i, "")
    .replace(/^Safari .+? window /, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isInstructionalVoiceOverCaption(value) {
  return /^You are currently (on|in) /i.test(cleanCaptionOcrText(value));
}

function captureVoiceOverCaptionOcrBurst(targetOutputDir, stepIndex) {
  const delays = [0, 0.12, 0.28];
  const attempts = [];
  for (const [attemptIndex, delay] of delays.entries()) {
    if (delay > 0) {
      run("sleep", [String(delay)], { timeout: 2000 });
    }
    const attempt = {
      delay,
      ...captureVoiceOverCaptionOcrState(
        targetOutputDir,
        `${stepIndex}-attempt-${attemptIndex + 1}`,
      ),
    };
    attempts.push(attempt);

    const text = cleanCaptionOcrText(attempt.parsed?.captionOcrText);
    if (text && !isInstructionalVoiceOverCaption(text)) {
      return {
        ...attempt,
        attempts,
      };
    }
  }

  const withText = attempts.filter((attempt) =>
    cleanCaptionOcrText(attempt.parsed?.captionOcrText),
  );
  const selected =
    withText.find(
      (attempt) => !isInstructionalVoiceOverCaption(attempt.parsed?.captionOcrText),
    ) ||
    withText[0] ||
    attempts.at(-1);

  return {
    ...selected,
    attempts,
  };
}

function getTargetUrl(target) {
  if (target.url) {
    return target.url;
  }

  const fixturePath = path.resolve(repoRoot, target.fixturePath);
  return pathToFileURL(fixturePath).href;
}

function getScanRootSelector(target) {
  return (
    target.scanRootSelector || (target.fixturePath ? "[data-sr-scan-root]" : "body")
  );
}

function getTargetOutputName(target, index) {
  if (target.name) {
    return target.name;
  }

  if (!target.url) {
    return `target-${index + 1}`;
  }

  try {
    const url = new URL(target.url);
    return `${url.hostname}${url.pathname}`
      .replace(/\/$/, "")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();
  } catch {
    return `target-${index + 1}`;
  }
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
              try
                if exists button "Allow" of windowToRead then
                  click button "Allow" of windowToRead
                  set logText to logText & "clicked=Allow" & linefeed
                  set clickedButton to true
                  delay 1
                  exit repeat
                end if
              end try
              repeat with buttonToRead in buttons of windowToRead
                try
                  set buttonName to name of buttonToRead as text
                  set logText to logText & "    button=" & buttonName & linefeed
                  if buttonName contains "Not Now" or buttonName is "Cancel" or buttonName is "Close" or buttonName is "OK" or buttonName is "Allow" then
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
          try
            if exists button "Allow" of windowToRead then
              click button "Allow" of windowToRead
              set logText to logText & "clicked=" & processName & ":Allow" & linefeed
              delay 1
              return logText
            end if
          end try
          repeat with buttonToRead in buttons of windowToRead
            try
              set buttonName to name of buttonToRead as text
              set logText to logText & "  button=" & buttonName & linefeed
              if buttonName contains "Not Now" or buttonName is "OK" or buttonName is "Cancel" or buttonName is "Close" or buttonName is "Allow" then
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
  if (navigationMode === "plain-right-arrow") {
    return runAppleScript(`
tell application "System Events"
  key code 124
end tell
`, 8000);
  }

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
  set captionText to ""
  try
    set captionText to my safeText(content of caption window)
  end try
  set phraseText to my safeText(content of last phrase)
  set cursorText to my safeText(text under cursor of vo cursor)
  return "captionWindowEnabled=" & (captionState as text) & linefeed & "captionText=" & captionText & linefeed & "lastPhrase=" & phraseText & linefeed & "voCursorText=" & cursorText
end tell
`, 8000);
}

function captureVoiceOverCaptionUiState() {
  return runAppleScript(`
on safeText(valueToRead)
  try
    if valueToRead is missing value then return ""
    return valueToRead as text
  on error
    return ""
  end try
end safeText

on cleanLine(valueToClean)
  set textToClean to my safeText(valueToClean)
  set AppleScript's text item delimiters to linefeed
  set textParts to text items of textToClean
  set AppleScript's text item delimiters to " "
  set textToClean to textParts as text
  set AppleScript's text item delimiters to return
  set textParts to text items of textToClean
  set AppleScript's text item delimiters to " "
  set textToClean to textParts as text
  set AppleScript's text item delimiters to ""
  return textToClean
end cleanLine

set captionText to ""
set debugText to ""
tell application "System Events"
  repeat with processToRead in application processes
    try
      set processName to name of processToRead as text
      if processName contains "VoiceOver" then
        set debugText to debugText & "process:" & processName & " "
        repeat with windowToRead in windows of processToRead
          try
            set windowName to my cleanLine(name of windowToRead)
            set debugText to debugText & "window:" & windowName & " "
            set uiItems to entire contents of windowToRead
            repeat with uiItem in uiItems
              try
                set roleText to my cleanLine(role of uiItem)
                set nameText to ""
                set valueText to ""
                set descriptionText to ""
                try
                  set nameText to my cleanLine(name of uiItem)
                end try
                try
                  set valueText to my cleanLine(value of uiItem)
                end try
                try
                  set descriptionText to my cleanLine(description of uiItem)
                end try

                set candidateText to ""
                if valueText is not "" then
                  set candidateText to valueText
                else if nameText is not "" then
                  set candidateText to nameText
                else if descriptionText is not "" then
                  set candidateText to descriptionText
                end if

                if candidateText is not "" and candidateText is not "Close" and candidateText is not "close button" then
                  if roleText contains "text" or roleText contains "Text" or roleText contains "static" or roleText contains "Static" then
                    set captionText to captionText & " " & candidateText
                  end if
                end if
              end try
            end repeat
          end try
        end repeat
      end if
    end try
  end repeat
end tell

return "captionUiText=" & my cleanLine(captionText) & linefeed & "captionUiDebug=" & my cleanLine(debugText)
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

function captureVoiceOverStateWithRecovery(targetOutputDir, stepIndex) {
  const attempts = [];
  const screenshots = {};
  const dismissals = [];
  let voiceOverRaw = captureVoiceOverState();
  attempts.push(voiceOverRaw);

  if (voiceOverRaw.ok) {
    return {
      voiceOverRaw,
      attempts,
      screenshots,
      dismissals,
    };
  }

  screenshots.voiceOverReadFailed = captureScreenshot(
    targetOutputDir,
    stepIndex,
    "voiceover-read-failed",
  );

  for (let attempt = 1; attempt <= 3 && !voiceOverRaw.ok; attempt += 1) {
    dismissals.push(dismissSystemDialogs());
    activateSafari();
    run("sleep", [String(attempt)], { timeout: (attempt + 2) * 1000 });
    voiceOverRaw = captureVoiceOverState();
    attempts.push(voiceOverRaw);
  }

  return {
    voiceOverRaw,
    attempts,
    screenshots,
    dismissals,
  };
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
  if (target.fixturePath || target.url) {
    return {
      ok: true,
      status: 0,
      signal: null,
      stdout:
        "skipped: Safari JavaScript automation is not required for page scans",
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

async function getTargetSourceHtml(target) {
  if (target.fixturePath) {
    return readFileSync(path.resolve(repoRoot, target.fixturePath), "utf8");
  }

  if (target.url) {
    const response = await fetch(target.url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Unable to fetch ${target.url}: ${response.status} ${response.statusText}`,
      );
    }

    return response.text();
  }

  return "";
}

function getJsdomUrl(target) {
  if (target.fixturePath) {
    return pathToFileURL(path.resolve(repoRoot, target.fixturePath)).href;
  }

  return target.url || "https://example.test/";
}

async function renderEngineOutputInJsdom(target, scanRootSelector) {
  if (!target.fixturePath && !target.url) {
    return null;
  }

  try {
    const html = await getTargetSourceHtml(target);
    const engineRuntimeSource = readFileSync(engineRuntimePath, "utf8");
    const dom = new JSDOM(html, {
      url: getJsdomUrl(target),
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

async function renderEngineOutput(target, scanRootSelector) {
  return (
    (await renderEngineOutputInJsdom(target, scanRootSelector)) ||
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
    step.voiceOver?.captionOcrText || "",
    step.voiceOver?.captionUiText || "",
    step.voiceOver?.captionText || "",
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
  const captionCandidate =
    step.voiceOver?.captionOcrText ||
    step.voiceOver?.captionUiText ||
    step.voiceOver?.captionText ||
    "";
  const caption = isSystemNoise(cleanCaptionOcrText(captionCandidate))
    ? ""
    : captionCandidate;
  const phrase = step.voiceOver?.lastPhrase || "";
  const cursor = step.voiceOver?.voCursorText || "";
  let comparisonText = caption || phrase || cursor;

  if (!caption && cursor && phrase.startsWith("You are currently on a ")) {
    const role = phrase
      .replace(/^You are currently on an? /, "")
      .replace(/\..*$/, "")
      .trim();
    const lowerCursor = cursor.toLowerCase();
    const lowerRole = role.toLowerCase();
    if (role && lowerCursor.endsWith(` ${lowerRole}`)) {
      const name = cursor.slice(0, -role.length).trim();
      comparisonText = lowerRole.startsWith("heading level")
        ? `${role}, ${name}`
        : `${name}, ${role}`;
    } else if (role) {
      comparisonText = `${role}, ${cursor}`;
    }
  } else if (
    !caption &&
    cursor &&
    (phrase.includes(" To click this ") || phrase.includes(" To exit this "))
  ) {
    comparisonText = cursor;
  }

  return cleanCaptionOcrText(comparisonText);
}

function isSystemNoise(announcement) {
  return (
    announcement === "Edit button" ||
    announcement === "Edit customizations button" ||
    announcement === "Open System Settings button" ||
    announcement.includes("Open System Settings button") ||
    /^Safari .+ window$/.test(announcement) ||
    /^Safari, .+, window$/.test(announcement) ||
    /^application, alert, system dialog /.test(announcement) ||
    /^application alert system dialog /.test(announcement) ||
    announcement.includes("requesting to bypass the system private window picker")
  );
}

function isRefinementNoise(announcement) {
  return (
    /^You are currently (on|in) .+\.?( To .+)?$/i.test(announcement) ||
    announcement === "content information" ||
    announcement === "end of, content information"
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

  const meaningfulTexts = voiceOverSteps
    .map(getComparisonVoiceOverText)
    .filter(Boolean)
    .filter(
      (announcement) =>
        !isSystemNoise(announcement) && !isRefinementNoise(announcement),
    );
  if (meaningfulTexts.length >= 3) {
    const recent = meaningfulTexts.slice(-3);
    if (new Set(recent).size === 1) {
      return { stop: true, reason: "repeated-normalized-output" };
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

function getNormalizedVoiceOverOutput(voiceOverSteps) {
  const announcements = voiceOverSteps
    .map(getComparisonVoiceOverText)
    .filter(Boolean)
    .filter(
      (announcement) =>
        !isSystemNoise(announcement) && !isRefinementNoise(announcement),
    );

  while (
    announcements.length >= 2 &&
    announcements.at(-1) === announcements.at(-2)
  ) {
    announcements.pop();
  }

  return announcements;
}

function getNormalizedEngineOutput(engineResult) {
  return Array.isArray(engineResult?.announcements)
    ? engineResult.announcements
    : [];
}

function createAiRefinementInput({
  target,
  summary,
  voiceOverSteps,
  voiceOverOutput,
  engineOutput,
  sourceHtml,
}) {
  const minVoiceOverAnnouncements = Number(
    target.refinement?.minVoiceOverAnnouncements || 1,
  );
  const failedVoiceOverReads = voiceOverSteps.filter(
    (step) => step.voiceOverRaw && !step.voiceOverRaw.ok,
  );
  const recoveredVoiceOverReads = voiceOverSteps.filter(
    (step) => (step.voiceOverRawAttempts || []).length > 1,
  );
  const refinementSkipReasons = [];

  if (voiceOverOutput.length < minVoiceOverAnnouncements) {
    refinementSkipReasons.push(
        `VoiceOver captured ${voiceOverOutput.length} announcement(s), expected at least ${minVoiceOverAnnouncements}.`,
    );
  }

  if (failedVoiceOverReads.length) {
    refinementSkipReasons.push(
      `VoiceOver capture had ${failedVoiceOverReads.length} failed read(s); output may be incomplete.`,
    );
  }

  if (recoveredVoiceOverReads.length) {
    refinementSkipReasons.push(
      `VoiceOver capture needed ${recoveredVoiceOverReads.length} recovered read(s); output may include transient system UI.`,
    );
  }

  const refinementEligible = refinementSkipReasons.length === 0;

  return {
    schemaVersion: 1,
    purpose:
      "Use this payload to refine sr-engine output against real VoiceOver output.",
    instructions: [
      "Only refine sr-engine when refinement.eligible is true.",
      "Compare voiceOverOutput with engineOutput.",
      "Identify the smallest defensible sr-engine logic change needed to bring engineOutput closer to VoiceOver.",
      "Update only necessary sr-engine logic.",
      "Add or update only the relevant regression test.",
      "Do not modify this artifact or unrelated tests.",
    ],
    target: {
      name: target.name,
      mode: target.mode || "page",
      url: summary.url,
      fixturePath: target.fixturePath || "",
      scanRootSelector: target.scanRootSelector || "[data-sr-scan-root]",
    },
    scan: {
      stopReason: summary.stopReason,
      capturedSteps: summary.capturedSteps,
      startedAt: summary.startedAt,
      finishedAt: summary.finishedAt,
    },
    refinement: {
      eligible: refinementEligible,
      skipReasons: refinementSkipReasons,
      minVoiceOverAnnouncements,
    },
    voiceOverOutput,
    engineOutput,
    sourceHtml,
  };
}

async function scanTarget(target, index) {
  const targetName = getTargetOutputName(target, index);
  const scanRootSelector = getScanRootSelector(target);
  const targetOutputDir = path.join(outputRoot, targetName);
  mkdirSync(targetOutputDir, { recursive: true });

  const url = getTargetUrl(target);
  const summary = {
    name: targetName,
    mode: target.mode || "page",
    url,
    source: target.fixturePath ? "fixture" : "url",
    maxSteps: target.maxSteps,
    maxSeconds: target.maxSeconds,
    navigationMode,
    startedAt: new Date().toISOString(),
  };

  const launchSafariResult = launchSafari(url);
  run("sleep", ["3"], { timeout: 5000 });
  const dismissSafariBeforeVoiceOver = dismissSafariDialogs();
  const dismissSystemBeforeVoiceOver = dismissSystemDialogs();
  const prepareScanRootBeforeVoiceOver = prepareScanRoot(
    target,
    scanRootSelector,
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
    scanRootSelector,
  );
  run("sleep", ["1"], { timeout: 3000 });
  const resetVoiceOverAfterLoad = moveVoiceOverToStart();

  const voiceOverSteps = [];
  const scanStartedAt = Date.now();
  const maxSteps = Number(target.maxSteps || target.steps || 100);
  let stopReason = "maxSteps";

  const initialCaptionOcr = captureVoiceOverCaptionOcrBurst(targetOutputDir, 0);
  const initialDismissSystem = dismissSystemDialogs();
  const initialVoiceOverCapture = captureVoiceOverStateWithRecovery(
    targetOutputDir,
    0,
  );
  const initialVoiceOverRaw = initialVoiceOverCapture.voiceOverRaw;
  const initialCaptionUiRaw = captureVoiceOverCaptionUiState();
  const initialFocusRaw = captureSafariFocus();
  const initialVoiceOver = {
    ...parseVoiceOverText(initialVoiceOverRaw.stdout || ""),
    ...parseVoiceOverText(initialCaptionUiRaw.stdout || ""),
    ...initialCaptionOcr.parsed,
  };
  const initialScreenshots = { ...initialVoiceOverCapture.screenshots };
  initialScreenshots.voiceOverCaptionOcr = initialCaptionOcr.screenshot;
  if (captureStepScreenshots) {
    initialScreenshots.step = captureScreenshot(targetOutputDir, 0, "step");
  }
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
    captionUiRaw: initialCaptionUiRaw,
    captionOcrRaw: initialCaptionOcr.ocr,
    captionOcrAttempts: initialCaptionOcr.attempts,
    voiceOver: initialVoiceOver,
    focusRaw: initialFocusRaw,
    focus: parseVoiceOverText(initialFocusRaw.stdout || ""),
    recovery: null,
    voiceOverRawAttempts: initialVoiceOverCapture.attempts,
    dismissSystemAfterScreenshot: initialVoiceOverCapture.dismissals,
    screenshots: initialScreenshots,
  });

  for (let index = 0; index < maxSteps; index += 1) {
    const navigation = navigateRight();
    const stepNumber = index + 1;
    const captionOcr = captureVoiceOverCaptionOcrBurst(targetOutputDir, stepNumber);
    const dismissSystemAfterNavigation = dismissSystemDialogs();
    const voiceOverCapture = captureVoiceOverStateWithRecovery(
      targetOutputDir,
      stepNumber,
    );
    const voiceOverRaw = voiceOverCapture.voiceOverRaw;
    const captionUiRaw = captureVoiceOverCaptionUiState();
    const focusRaw = captureSafariFocus();
    const voiceOver = {
      ...parseVoiceOverText(voiceOverRaw.stdout || ""),
      ...parseVoiceOverText(captionUiRaw.stdout || ""),
      ...captionOcr.parsed,
    };
    const screenshots = { ...voiceOverCapture.screenshots };
    screenshots.voiceOverCaptionOcr = captionOcr.screenshot;
    if (captureStepScreenshots) {
      screenshots.step = captureScreenshot(targetOutputDir, stepNumber, "step");
    }

    voiceOverSteps.push({
      index: stepNumber,
      navigation,
      dismissSystemAfterNavigation,
      voiceOverRaw,
      captionUiRaw,
      captionOcrRaw: captionOcr.ocr,
      captionOcrAttempts: captionOcr.attempts,
      voiceOver,
      focusRaw,
      focus: parseVoiceOverText(focusRaw.stdout || ""),
      recovery: null,
      voiceOverRawAttempts: voiceOverCapture.attempts,
      dismissSystemAfterScreenshot: voiceOverCapture.dismissals,
      screenshots,
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
  const injectEngineRuntimeResult = target.fixturePath || target.url
    ? {
        ok: true,
        status: 0,
        signal: null,
        stdout: "skipped: engine output rendered in jsdom for page scan",
        stderr: "",
        error: "",
      }
    : injectEngineRuntime();
  let dismissSafariBeforeEngineRetry = null;
  let engineRaw = await renderEngineOutput(
    target,
    scanRootSelector,
  );
  if (!engineRaw.ok) {
    dismissSafariBeforeEngineRetry = dismissSafariDialogs();
    dismissSystemDialogs();
    activateSafari();
    run("sleep", ["1"], { timeout: 3000 });
    if (!target.fixturePath && !target.url) {
      injectEngineRuntime();
    }
    engineRaw = await renderEngineOutput(
      target,
      scanRootSelector,
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
  summary.captureStepScreenshots = captureStepScreenshots;
  summary.injectEngineRuntime = injectEngineRuntimeResult;
  summary.dismissSafariBeforeEngineRetry = dismissSafariBeforeEngineRetry;
  summary.engineRaw = engineRaw;
  const voiceOverOutput = getNormalizedVoiceOverOutput(voiceOverSteps);
  const engineOutput = getNormalizedEngineOutput(engineResult);
  const sourceHtml = await getTargetSourceHtml(target).catch(() => "");

  writeJson(path.join(targetOutputDir, "raw.json"), {
    summary,
    engine: engineResult,
    voiceOverSteps,
  });
  writeJson(path.join(targetOutputDir, "engine-output.json"), engineResult);
  writeJson(path.join(targetOutputDir, "voiceover-output.json"), {
    announcements: voiceOverOutput,
    source: "VoiceOver",
    normalization: "system-noise-filtered",
  });
  writeJson(
    path.join(targetOutputDir, "ai-refinement-input.json"),
    createAiRefinementInput({
      target,
      summary,
      voiceOverSteps,
      voiceOverOutput,
      engineOutput,
      sourceHtml,
    }),
  );
  writeText(
    path.join(targetOutputDir, "engine-output.txt"),
    engineOutput.length
      ? engineOutput.join("\n")
      : JSON.stringify(engineResult, null, 2),
  );
  writeText(
    path.join(targetOutputDir, "voiceover-output.txt"),
    voiceOverSteps
      .map((step) => {
        const stored = getComparisonVoiceOverText(step);
        const captionOcr = step.voiceOver?.captionOcrText || "";
        const captionOcrDebug = step.voiceOver?.captionOcrDebug || "";
        const captionOcrAttempts = (step.captionOcrAttempts || [])
          .map((attempt) => {
            const text = cleanCaptionOcrText(
              attempt.parsed?.captionOcrText || "",
            );
            return `${attempt.delay}s:${text}`;
          })
          .join(" | ");
        const captionUi = step.voiceOver?.captionUiText || "";
        const captionUiDebug = step.voiceOver?.captionUiDebug || "";
        const caption = step.voiceOver?.captionText || "";
        const phrase = step.voiceOver?.lastPhrase || "";
        const cursor = step.voiceOver?.voCursorText || "";
        const focusName = step.focus?.name || "";
        const focusRole = step.focus?.role || "";
        return [
          `step ${step.index}`,
          `storedOutput: ${stored}`,
          `captionOcrText: ${captionOcr}`,
          `captionOcrAttempts: ${captionOcrAttempts}`,
          `captionOcrDebug: ${captionOcrDebug}`,
          `captionUiText: ${captionUi}`,
          `captionUiDebug: ${captionUiDebug}`,
          `captionText: ${caption}`,
          `lastPhrase: ${phrase}`,
          `voCursorText: ${cursor}`,
          `focused: ${focusRole} ${focusName}`.trim(),
        ].join("\n");
      })
      .join("\n\n"),
  );
}

mkdirSync(outputRoot, { recursive: true });

const screenRecordingPreflight = await preflightScreenRecordingPermission();
writeJson(
  path.join(repoRoot, "voiceover-smoke/screen-recording-preflight.json"),
  screenRecordingPreflight,
);
const screenRecording = startScreenRecording();
let manifest = JSON.parse(readFileSync(scanManifestPath, "utf8"));
if (scanTargetName) {
  manifest = manifest.filter((target) => target.name === scanTargetName);
  if (manifest.length === 0) {
    throw new Error(`No VoiceOver scan target matched "${scanTargetName}".`);
  }
} else {
  manifest = manifest.filter((target) => target.default !== false);
}
for (const [index, target] of manifest.entries()) {
  await scanTarget(target, index);
}
const screenRecordingResult = await stopScreenRecording(screenRecording);
writeJson(
  path.join(repoRoot, "voiceover-smoke/screen-recording.json"),
  screenRecordingResult,
);
