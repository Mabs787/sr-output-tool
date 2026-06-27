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
const scanManifestPath = process.env.VOICEOVER_SCAN_MANIFEST
  ? path.resolve(repoRoot, process.env.VOICEOVER_SCAN_MANIFEST)
  : "";
const scanTargetName = String(process.env.VOICEOVER_SCAN_TARGET || "").trim();
const outputRoot = path.join(repoRoot, "voiceover-smoke/scans");
const captureStepScreenshots =
  process.env.VOICEOVER_CAPTURE_STEP_SCREENSHOTS === "true";
const captureScreenRecording =
  process.env.VOICEOVER_CAPTURE_SCREEN_RECORDING === "true";
const captureStepSnapshots =
  process.env.VOICEOVER_CAPTURE_STEP_SNAPSHOTS === "true";
const scanMarkerTexts = {
  start: "SR Output Tool VoiceOver scan start marker",
  end: "SR Output Tool VoiceOver scan end marker",
};
const navigationMode =
  process.env.VOICEOVER_NAVIGATION_MODE === "plain-right-arrow"
    ? "plain-right-arrow"
    : "voiceover-right-arrow";
const defaultMaxStepSeconds = Number(
  process.env.VOICEOVER_MAX_STEP_SECONDS || 30,
);
const chromeDebuggingPort = Number(
  process.env.CHROME_REMOTE_DEBUGGING_PORT || 9222,
);
const chromeViewportWidth = parsePositiveInteger(
  process.env.VOICEOVER_VIEWPORT_WIDTH,
  1200,
);
const chromeViewportHeight = parsePositiveInteger(
  process.env.VOICEOVER_VIEWPORT_HEIGHT,
  543,
);

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

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

async function evaluateJavaScriptInChrome(expression, timeout = 15000) {
  if (!globalThis.WebSocket) {
    return commandResult({
      ok: false,
      stderr: "WebSocket is unavailable in this Node runtime.",
      extras: { source: "chrome-devtools" },
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const deadline = Date.now() + timeout;
  let lastError = "";
  let lastStderr = "";

  try {
    let page = null;

    while (Date.now() < deadline && !page) {
      try {
        const targetsResponse = await fetch(
          `http://127.0.0.1:${chromeDebuggingPort}/json/list`,
          { signal: controller.signal },
        );
        if (!targetsResponse.ok) {
          lastStderr = `Chrome DevTools target list returned HTTP ${targetsResponse.status}.`;
        } else {
          const targets = await targetsResponse.json();
          page =
            targets.find(
              (target) =>
                target.type === "page" && target.url !== "chrome://newtab/",
            ) || targets.find((target) => target.type === "page");
          if (!page?.webSocketDebuggerUrl) {
            page = null;
            lastStderr =
              "No Chrome page target with a DevTools WebSocket was found.";
          }
        }
      } catch (error) {
        lastError = error?.message || String(error);
      }

      if (!page) {
        run("sleep", ["1"], { timeout: 2000 });
      }
    }

    if (!page?.webSocketDebuggerUrl) {
      return commandResult({
        ok: false,
        stderr: lastStderr,
        error: lastError || "Chrome DevTools target was not available.",
        extras: { source: "chrome-devtools" },
      });
    }

    const result = await new Promise((resolve, reject) => {
      const socket = new WebSocket(page.webSocketDebuggerUrl);
      const requestId = 1;
      const closeSocket = () => {
        try {
          socket.close();
        } catch {
          // Best effort cleanup only.
        }
      };

      socket.addEventListener("open", () => {
        socket.send(
          JSON.stringify({
            id: requestId,
            method: "Runtime.evaluate",
            params: {
              expression,
              awaitPromise: true,
              returnByValue: true,
            },
          }),
        );
      });

      socket.addEventListener("message", (event) => {
        let message = null;
        try {
          message = JSON.parse(String(event.data || ""));
        } catch (error) {
          closeSocket();
          reject(error);
          return;
        }

        if (message.id !== requestId) {
          return;
        }

        closeSocket();
        resolve(message);
      });

      socket.addEventListener("error", () => {
        closeSocket();
        reject(new Error("Chrome DevTools WebSocket error."));
      });
    });

    if (result.error) {
      return commandResult({
        ok: false,
        stderr: JSON.stringify(result.error),
        extras: { source: "chrome-devtools" },
      });
    }

    const evaluation = result.result || {};
    if (evaluation.exceptionDetails) {
      return commandResult({
        ok: false,
        stderr: JSON.stringify(evaluation.exceptionDetails),
        extras: { source: "chrome-devtools" },
      });
    }

    const remoteObject = evaluation.result || {};
    return commandResult({
      ok: true,
      stdout:
        remoteObject.value === undefined
          ? remoteObject.description || ""
          : String(remoteObject.value),
      extras: { source: "chrome-devtools" },
    });
  } catch (error) {
    return commandResult({
      ok: false,
      stderr: error?.name === "AbortError" ? "Chrome DevTools request timed out." : "",
      error: error?.message || String(error),
      extras: { source: "chrome-devtools" },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function sendChromeDevToolsCommand(method, params = {}, timeout = 15000) {
  if (!globalThis.WebSocket) {
    return commandResult({
      ok: false,
      stderr: "WebSocket is unavailable in this Node runtime.",
      extras: { source: "chrome-devtools" },
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const deadline = Date.now() + timeout;
  let lastError = "";
  let lastStderr = "";

  try {
    let page = null;

    while (Date.now() < deadline && !page) {
      try {
        const targetsResponse = await fetch(
          `http://127.0.0.1:${chromeDebuggingPort}/json/list`,
          { signal: controller.signal },
        );
        if (!targetsResponse.ok) {
          lastStderr = `Chrome DevTools target list returned HTTP ${targetsResponse.status}.`;
        } else {
          const targets = await targetsResponse.json();
          page =
            targets.find(
              (target) =>
                target.type === "page" && target.url !== "chrome://newtab/",
            ) || targets.find((target) => target.type === "page");
          if (!page?.webSocketDebuggerUrl) {
            page = null;
            lastStderr =
              "No Chrome page target with a DevTools WebSocket was found.";
          }
        }
      } catch (error) {
        lastError = error?.message || String(error);
      }

      if (!page) {
        run("sleep", ["1"], { timeout: 2000 });
      }
    }

    if (!page?.webSocketDebuggerUrl) {
      return commandResult({
        ok: false,
        stderr: lastStderr,
        error: lastError || "Chrome DevTools target was not available.",
        extras: { source: "chrome-devtools" },
      });
    }

    const result = await new Promise((resolve, reject) => {
      const socket = new WebSocket(page.webSocketDebuggerUrl);
      const requestId = 1;
      const closeSocket = () => {
        try {
          socket.close();
        } catch {
          // Best effort cleanup only.
        }
      };

      socket.addEventListener("open", () => {
        socket.send(
          JSON.stringify({
            id: requestId,
            method,
            params,
          }),
        );
      });

      socket.addEventListener("message", (event) => {
        let message = null;
        try {
          message = JSON.parse(String(event.data || ""));
        } catch (error) {
          closeSocket();
          reject(error);
          return;
        }

        if (message.id !== requestId) {
          return;
        }

        closeSocket();
        resolve(message);
      });

      socket.addEventListener("error", () => {
        closeSocket();
        reject(new Error("Chrome DevTools WebSocket error."));
      });
    });

    if (result.error) {
      return commandResult({
        ok: false,
        stderr: JSON.stringify(result.error),
        extras: { source: "chrome-devtools" },
      });
    }

    return commandResult({
      ok: true,
      stdout: JSON.stringify(result.result || {}),
      extras: { source: "chrome-devtools", method },
    });
  } catch (error) {
    return commandResult({
      ok: false,
      stderr: error?.name === "AbortError" ? "Chrome DevTools request timed out." : "",
      error: error?.message || String(error),
      extras: { source: "chrome-devtools", method },
    });
  } finally {
    clearTimeout(timer);
  }
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

function commandResult({
  ok,
  stdout = "",
  stderr = "",
  error = "",
  status = ok ? 0 : 1,
  signal = null,
  extras = {},
}) {
  return {
    ok,
    status,
    signal,
    stdout: String(stdout || "").trim(),
    stderr: String(stderr || "").trim(),
    error: String(error || ""),
    ...extras,
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

function parseJson(value) {
  try {
    return JSON.parse(String(value || ""));
  } catch {
    return null;
  }
}

function getEnvironmentValue(name) {
  return process.env[name] || "";
}

async function fetchJsonWithTimeout(url, timeout = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": "sr-output-tool-voiceover-scan",
      },
      signal: controller.signal,
    });
    const text = await response.text();
    const json = parseJson(text);
    return {
      ok: response.ok,
      status: response.status,
      url,
      json,
      error: response.ok ? "" : text.slice(0, 500),
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      url,
      json: null,
      error:
        error?.name === "AbortError"
          ? "Request timed out."
          : error?.message || String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function capturePublicNetworkEnvironment() {
  const geo = await fetchJsonWithTimeout("https://ipapi.co/json/", 5000);
  if (geo.ok && geo.json) {
    return {
      ok: true,
      provider: "ipapi.co",
      ip: geo.json.ip || "",
      city: geo.json.city || "",
      region: geo.json.region || "",
      countryCode: geo.json.country_code || "",
      countryName: geo.json.country_name || "",
      timezone: geo.json.timezone || "",
      org: geo.json.org || geo.json.asn || "",
    };
  }

  const ip = await fetchJsonWithTimeout(
    "https://api.ipify.org?format=json",
    5000,
  );
  return {
    ok: Boolean(ip.ok && ip.json?.ip),
    provider: ip.ok ? "api.ipify.org" : "ipapi.co",
    ip: ip.json?.ip || "",
    city: "",
    region: "",
    countryCode: "",
    countryName: "",
    timezone: "",
    org: "",
    error: ip.ok ? geo.error || "" : ip.error || geo.error || "",
  };
}

async function captureBrowserEnvironment() {
  const expression = `JSON.stringify((() => ({
    href: location.href,
    userAgent: navigator.userAgent,
    language: navigator.language,
    languages: Array.from(navigator.languages || []),
    platform: navigator.platform,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    locale: Intl.DateTimeFormat().resolvedOptions().locale,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio
    },
    screen: {
      width: window.screen.width,
      height: window.screen.height,
      availWidth: window.screen.availWidth,
      availHeight: window.screen.availHeight
    }
  }))())`;
  const capture = await evaluateJavaScriptInChrome(expression, 15000);
  const value = capture.ok ? parseJson(capture.stdout) : null;

  return {
    ok: Boolean(capture.ok && value),
    capture,
    value,
  };
}

async function captureRunnerEnvironment() {
  let runtimeTimeZone = "";
  let runtimeLocale = "";
  try {
    const resolvedOptions = Intl.DateTimeFormat().resolvedOptions();
    runtimeTimeZone = resolvedOptions.timeZone || "";
    runtimeLocale = resolvedOptions.locale || "";
  } catch {
    // Best effort only.
  }

  const publicNetwork = await capturePublicNetworkEnvironment();
  const browser = await captureBrowserEnvironment();

  return {
    schemaVersion: 1,
    capturedAt: new Date().toISOString(),
    github: {
      actions: getEnvironmentValue("GITHUB_ACTIONS"),
      runnerName: getEnvironmentValue("RUNNER_NAME"),
      runnerOs: getEnvironmentValue("RUNNER_OS"),
      runnerArch: getEnvironmentValue("RUNNER_ARCH"),
      runId: getEnvironmentValue("GITHUB_RUN_ID"),
      runAttempt: getEnvironmentValue("GITHUB_RUN_ATTEMPT"),
      repository: getEnvironmentValue("GITHUB_REPOSITORY"),
      ref: getEnvironmentValue("GITHUB_REF"),
      sha: getEnvironmentValue("GITHUB_SHA"),
    },
    host: {
      hostname: os.hostname(),
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      node: process.version,
      locale: runtimeLocale,
      timeZone: runtimeTimeZone,
      timezoneOffsetMinutes: new Date().getTimezoneOffset(),
    },
    publicNetwork,
    browser,
  };
}

function getMaxStepSeconds(target) {
  const value = Number(target.maxStepSeconds || defaultMaxStepSeconds);
  return Number.isFinite(value) && value > 0 ? value : 30;
}

function getStepTiming(startedAt, maxStepSeconds) {
  const durationMs = Date.now() - startedAt;
  return {
    startedAt: new Date(startedAt).toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs,
    durationSeconds: Number((durationMs / 1000).toFixed(3)),
    maxStepSeconds,
    exceededMaxStepSeconds: durationMs / 1000 > maxStepSeconds,
  };
}

function getSnapshotSearchText({ announcement = "", focus = {} } = {}) {
  return [
    announcement,
    focus.role || "",
    focus.name || "",
    focus.value || "",
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\b(button|link|heading|navigation|group|list|item|collapsed|expanded|visited)\b/gi, " ")
    .replace(/\b\d+\s+of\s+\d+\b/gi, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function getSearchTokens(value) {
  return Array.from(
    new Set(
      String(value || "")
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 3)
        .slice(0, 12),
    ),
  );
}

function scoreAxSnapshotNode(node, tokens) {
  const haystack = [
    node.role || "",
    node.name || "",
    node.value || "",
    node.description || "",
  ]
    .join(" ")
    .toLowerCase();
  if (!haystack || tokens.length === 0) {
    return 0;
  }
  return tokens.reduce(
    (score, token) => score + (haystack.includes(token) ? 1 : 0),
    0,
  );
}

function startScreenRecording() {
  if (!captureScreenRecording) {
    return null;
  }

  const recordingsDir = path.join(repoRoot, "voiceover-smoke/recordings");
  mkdirSync(recordingsDir, { recursive: true });

  const filePath = path.join(recordingsDir, "voiceover-scan.mov");
  const child = spawn("screencapture", ["-v", filePath], {
    cwd: repoRoot,
    stdio: ["ignore", "pipe", "pipe"],
  });

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
        mode: "manual-stop",
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

    recording.child.kill("SIGINT");
    forceStopTimer = setTimeout(() => {
      if (!settled && recording.child.exitCode === null) {
        recording.child.kill("SIGTERM");
      }
    }, 30000);
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

function captureScreenshot(targetOutputDir, stepIndex, label, options = {}) {
  const persist = options.persist ?? captureStepScreenshots;
  const screenshotsDir = persist
    ? path.join(targetOutputDir, "screenshots")
    : mkdtempSync(path.join(os.tmpdir(), "sr-vo-screenshot-"));
  mkdirSync(screenshotsDir, { recursive: true });

  const fileName = getScreenshotFileName(stepIndex, label);
  const filePath = path.join(screenshotsDir, fileName);
  const result = toCommandResult(
    run("screencapture", ["-x", filePath], { timeout: 10000 }),
  );

  return {
    ...result,
    label,
    persisted: persist,
    path: persist ? path.relative(targetOutputDir, filePath) : "",
    filePath,
  };
}

let captionOcrTool = null;
let captionAxTool = null;
let captionWindowTool = null;
let pageConsentOcrTool = null;

function getCaptionAxTool() {
  if (captionAxTool) {
    return captionAxTool;
  }

  const tempDir = mkdtempSync(path.join(os.tmpdir(), "sr-vo-ax-tool-"));
  const scriptPath = path.join(tempDir, "read-voiceover-caption-ax.swift");
  const binaryPath = path.join(tempDir, "read-voiceover-caption-ax");
  writeFileSync(
    scriptPath,
    `
import AppKit
import ApplicationServices
import CoreGraphics
import Foundation

func clean(_ value: String) -> String {
  return value
    .replacingOccurrences(of: "\\n", with: " ")
    .replacingOccurrences(of: "\\r", with: " ")
    .trimmingCharacters(in: .whitespacesAndNewlines)
}

func attr(_ element: AXUIElement, _ name: CFString) -> Any? {
  var value: CFTypeRef?
  let error = AXUIElementCopyAttributeValue(element, name, &value)
  if error != .success {
    return nil
  }
  return value
}

func stringAttr(_ element: AXUIElement, _ name: CFString) -> String {
  if let value = attr(element, name) {
    return clean(String(describing: value))
  }
  return ""
}

func children(_ element: AXUIElement) -> [AXUIElement] {
  return attr(element, kAXChildrenAttribute as CFString) as? [AXUIElement] ?? []
}

func collectText(_ element: AXUIElement, depth: Int, lines: inout [String], debug: inout [String]) {
  if depth > 8 {
    return
  }

  let role = stringAttr(element, kAXRoleAttribute as CFString)
  let subrole = stringAttr(element, kAXSubroleAttribute as CFString)
  let title = stringAttr(element, kAXTitleAttribute as CFString)
  let value = stringAttr(element, kAXValueAttribute as CFString)
  let description = stringAttr(element, kAXDescriptionAttribute as CFString)
  let text = [value, title, description]
    .first(where: { !$0.isEmpty && $0 != "Close" && $0 != "close button" }) ?? ""

  if !role.isEmpty || !text.isEmpty {
    debug.append("\\(String(repeating: ">", count: depth))role:\\(role) subrole:\\(subrole) title:\\(title) value:\\(value) description:\\(description)")
  }

  if !text.isEmpty && (role.contains("StaticText") || role.contains("Text") || role.contains("Group")) {
    lines.append(text)
  }

  for child in children(element) {
    collectText(child, depth: depth + 1, lines: &lines, debug: &debug)
  }
}

let apps = NSWorkspace.shared.runningApplications.filter {
  ($0.localizedName ?? "").contains("VoiceOver") || ($0.bundleIdentifier ?? "").contains("VoiceOver")
}

var allLines: [String] = []
var allDebug: [String] = []
var cgDebug: [String] = []

let cgWindows = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]] ?? []
for window in cgWindows {
  let owner = window[kCGWindowOwnerName as String] as? String ?? ""
  let ownerPid = window[kCGWindowOwnerPID as String] as? Int ?? 0
  let name = window[kCGWindowName as String] as? String ?? ""
  if owner.contains("VoiceOver") || name.contains("VoiceOver") {
    let layer = window[kCGWindowLayer as String] as? Int ?? 0
    let alpha = window[kCGWindowAlpha as String] as? Double ?? 0
    let bounds = window[kCGWindowBounds as String] as? [String: Any] ?? [:]
    let x = bounds["X"] ?? ""
    let y = bounds["Y"] ?? ""
    let width = bounds["Width"] ?? ""
    let height = bounds["Height"] ?? ""
    cgDebug.append("owner:\\(clean(owner)) pid:\\(ownerPid) name:\\(clean(name)) layer:\\(layer) alpha:\\(alpha) bounds:\\(x),\\(y),\\(width),\\(height)")
  }
}

for app in apps {
  let appElement = AXUIElementCreateApplication(app.processIdentifier)
  allDebug.append("app:\\(app.localizedName ?? "") pid:\\(app.processIdentifier) bundle:\\(app.bundleIdentifier ?? "")")
  let windows = attr(appElement, kAXWindowsAttribute as CFString) as? [AXUIElement] ?? []
  allDebug.append("windows:\\(windows.count)")
  for window in windows {
    collectText(window, depth: 0, lines: &allLines, debug: &allDebug)
  }
}

let uniqueLines = allLines.reduce(into: [String]()) { result, line in
  if !line.isEmpty && !result.contains(line) {
    result.append(line)
  }
}

print("captionAxText=\\(uniqueLines.joined(separator: " "))")
print("captionAxDebug=\\(allDebug.joined(separator: " | "))")
print("captionCgDebug=\\(cgDebug.joined(separator: " | "))")
`,
  );

  const compile = toCommandResult(
    run("swiftc", [scriptPath, "-o", binaryPath], { timeout: 60000 }),
  );
  captionAxTool = {
    ok: compile.ok,
    path: binaryPath,
    compile,
  };
  return captionAxTool;
}

function getCaptionWindowTool() {
  if (captionWindowTool) {
    return captionWindowTool;
  }

  const tempDir = mkdtempSync(path.join(os.tmpdir(), "sr-vo-caption-window-"));
  const scriptPath = path.join(tempDir, "find-voiceover-caption-window.swift");
  const binaryPath = path.join(tempDir, "find-voiceover-caption-window");
  writeFileSync(
    scriptPath,
    `
import Foundation
import CoreGraphics

func clean(_ value: String) -> String {
  return value
    .replacingOccurrences(of: "\\n", with: " ")
    .replacingOccurrences(of: "\\r", with: " ")
    .trimmingCharacters(in: .whitespacesAndNewlines)
}

var debug: [String] = []
var candidates: [(id: Int, x: Int, y: Int, width: Int, height: Int, layer: Int, area: Int)] = []

let windows = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]] ?? []
for window in windows {
  let owner = window[kCGWindowOwnerName as String] as? String ?? ""
  let name = window[kCGWindowName as String] as? String ?? ""
  guard owner.contains("VoiceOver") || name.contains("VoiceOver") else { continue }

  let id = window[kCGWindowNumber as String] as? Int ?? 0
  let layer = window[kCGWindowLayer as String] as? Int ?? 0
  let alpha = window[kCGWindowAlpha as String] as? Double ?? 0
  let bounds = window[kCGWindowBounds as String] as? [String: Any] ?? [:]
  let x = Int((bounds["X"] as? Double) ?? 0)
  let y = Int((bounds["Y"] as? Double) ?? 0)
  let width = Int((bounds["Width"] as? Double) ?? 0)
  let height = Int((bounds["Height"] as? Double) ?? 0)
  let area = width * height
  debug.append("id:\\(id) owner:\\(clean(owner)) name:\\(clean(name)) layer:\\(layer) alpha:\\(alpha) bounds:\\(x),\\(y),\\(width),\\(height)")

  if id > 0 && alpha > 0 && width >= 250 && height >= 50 && width <= 1200 && height <= 250 {
    candidates.append((id: id, x: x, y: y, width: width, height: height, layer: layer, area: area))
  }
}

let selected = candidates.sorted {
  if $0.layer != $1.layer {
    return $0.layer > $1.layer
  }
  return $0.area < $1.area
}.first

let boundsText: String
if let selected {
  boundsText = "\\(selected.x),\\(selected.y),\\(selected.width),\\(selected.height)"
} else {
  boundsText = ""
}

print("captionWindowId=\\(selected?.id ?? 0)")
print("captionWindowBounds=\\(boundsText)")
print("captionWindowDebug=\\(debug.joined(separator: " | "))")
`,
  );

  const compile = toCommandResult(
    run("swiftc", [scriptPath, "-o", binaryPath], { timeout: 60000 }),
  );
  captionWindowTool = {
    ok: compile.ok,
    path: binaryPath,
    compile,
  };
  return captionWindowTool;
}

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
    candidates.append(Candidate(text: text, confidence: recognized.confidence, box: observation.boundingBox))
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

function getPageConsentOcrTool() {
  if (pageConsentOcrTool) {
    return pageConsentOcrTool;
  }

  const tempDir = mkdtempSync(path.join(os.tmpdir(), "sr-vo-consent-tool-"));
  const scriptPath = path.join(tempDir, "find-page-consent.swift");
  const binaryPath = path.join(tempDir, "find-page-consent");
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

struct Target {
  let preference: String
  let label: String
}

struct Match {
  let target: Target
  let text: String
  let confidence: Float
  let x: Int
  let y: Int
}

let targets = [
  Target(preference: "system-permission", label: "allow"),
  Target(preference: "essential", label: "essential cookies only"),
  Target(preference: "reject", label: "reject all"),
  Target(preference: "reject", label: "decline"),
  Target(preference: "reject", label: "continue without accepting"),
  Target(preference: "reject", label: "necessary cookies only"),
  Target(preference: "save", label: "save choices"),
  Target(preference: "save", label: "save settings"),
  Target(preference: "accept", label: "accept all"),
  Target(preference: "accept", label: "accept"),
  Target(preference: "accept", label: "allow all"),
  Target(preference: "accept", label: "accept cookies"),
  Target(preference: "close", label: "no thanks"),
  Target(preference: "close", label: "maybe later"),
  Target(preference: "close", label: "close")
]

func normalize(_ value: String) -> String {
  value
    .replacingOccurrences(of: "\\\\s+", with: " ", options: .regularExpression)
    .trimmingCharacters(in: .whitespacesAndNewlines)
    .lowercased()
}

var matches: [Match] = []
var debug: [String] = []
var recognizedLines: [String] = []
let request = VNRecognizeTextRequest { request, error in
  if let error {
    FileHandle.standardError.write(Data("\\(error.localizedDescription)\\n".utf8))
    return
  }

  let observations = request.results as? [VNRecognizedTextObservation] ?? []
  for observation in observations {
    guard let recognized = observation.topCandidates(1).first else { continue }
    let text = recognized.string.trimmingCharacters(in: .whitespacesAndNewlines)
    if text.isEmpty { continue }
    let normalized = normalize(text)
    recognizedLines.append(normalized)
    debug.append("\\(text)@confidence:\\(String(format: "%.2f", recognized.confidence))")

    let hasSystemPermissionPrompt = recognizedLines.contains { line in
      line.contains("access to control") || line.contains("wants access")
    }

    if let target = targets.first(where: { target in
      if target.preference == "system-permission" {
        return hasSystemPermissionPrompt && normalized == target.label
      }

      if normalized == target.label {
        return true
      }

      let buttonLikeLengthLimit = target.label.count + 18
      return normalized.count <= buttonLikeLengthLimit && normalized.contains(target.label)
    }) {
      let x = Int(observation.boundingBox.midX * CGFloat(cgImage.width))
      let y = Int((1 - observation.boundingBox.midY) * CGFloat(cgImage.height))
      matches.append(Match(target: target, text: text, confidence: recognized.confidence, x: x, y: y))
    }
  }
}

request.recognitionLevel = .accurate
request.usesLanguageCorrection = false

let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
try handler.perform([request])

if let match = matches.first {
  print("action=found")
  print("preference=\\(match.target.preference)")
  print("label=\\(match.target.label)")
  print("text=\\(match.text)")
  print("x=\\(match.x)")
  print("y=\\(match.y)")
  print("confidence=\\(String(format: "%.2f", match.confidence))")
} else {
  print("action=none")
}
print("debug=\\(debug.prefix(40).joined(separator: " | "))")
`,
  );

  const compile = toCommandResult(
    run("swiftc", [scriptPath, "-o", binaryPath], { timeout: 60000 }),
  );
  pageConsentOcrTool = {
    ok: compile.ok,
    path: binaryPath,
    compile,
  };
  return pageConsentOcrTool;
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

function captureVoiceOverCaptionWindowState() {
  const tool = getCaptionWindowTool();
  if (!tool.ok) {
    return {
      ok: false,
      status: tool.compile.status,
      signal: tool.compile.signal,
      stdout: "",
      stderr: tool.compile.stderr,
      error: tool.compile.error || "Unable to compile VoiceOver caption window helper",
      parsed: {},
      tool,
    };
  }

  const result = toCommandResult(run(tool.path, [], { timeout: 10000 }));
  return {
    ...result,
    parsed: parseVoiceOverText(result.stdout || ""),
    tool: {
      ok: tool.ok,
      path: tool.path,
      compile: tool.compile,
    },
  };
}

function captureVoiceOverCaptionScreenshot(targetOutputDir, stepIndex) {
  const captionWindow = captureVoiceOverCaptionWindowState();
  const persist = captureStepScreenshots;
  const screenshotsDir = persist
    ? path.join(targetOutputDir, "screenshots")
    : mkdtempSync(path.join(os.tmpdir(), "sr-vo-screenshot-"));
  mkdirSync(screenshotsDir, { recursive: true });

  const fileName = getScreenshotFileName(stepIndex, "voiceover-caption");
  const filePath = path.join(screenshotsDir, fileName);
  const captionWindowId = Number(captionWindow.parsed?.captionWindowId || 0);
  const args =
    captionWindow.ok && captionWindowId > 0
      ? ["-x", "-l", String(captionWindowId), filePath]
      : ["-x", filePath];
  const result = toCommandResult(
    run("screencapture", args, { timeout: 10000 }),
  );

  return {
    ...result,
    label: "voiceover-caption",
    persisted: persist,
    path: persist ? path.relative(targetOutputDir, filePath) : "",
    filePath,
    captionWindow: {
      ok: captionWindow.ok,
      status: captionWindow.status,
      signal: captionWindow.signal,
      stdout: captionWindow.stdout,
      stderr: captionWindow.stderr,
      error: captionWindow.error,
      parsed: captionWindow.parsed,
    },
    captionWindowId,
    source: captionWindowId > 0 ? "voiceover-caption-window" : "full-screen",
  };
}

function captureVoiceOverCaptionOcrState(targetOutputDir, stepIndex) {
  const screenshot = captureVoiceOverCaptionScreenshot(targetOutputDir, stepIndex);
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

function captureVoiceOverCaptionAxState() {
  const tool = getCaptionAxTool();
  if (!tool.ok) {
    return {
      ok: false,
      status: tool.compile.status,
      signal: tool.compile.signal,
      stdout: "",
      stderr: tool.compile.stderr,
      error: tool.compile.error || "Unable to compile VoiceOver AX caption helper",
      tool,
    };
  }

  return {
    ...toCommandResult(run(tool.path, [], { timeout: 10000 })),
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
    .replace(/^Google Chrome .+? window /, "")
    .replace(/\bvisited,\s+(?=link\b)/gi, "")
    .replace(/^[.,;:]\s+(?=end of\b)/i, "")
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

function launchChrome(url) {
  const chromeUserDataDir = mkdtempSync(
    path.join(os.tmpdir(), "sr-vo-chrome-profile-"),
  );
  const openChrome = () =>
    toCommandResult(
      run(
        "open",
        [
          "-na",
          "Google Chrome",
          url,
          "--args",
          `--remote-debugging-port=${chromeDebuggingPort}`,
          "--remote-allow-origins=*",
          `--user-data-dir=${chromeUserDataDir}`,
          "--no-first-run",
          "--force-renderer-accessibility",
          `--window-size=${chromeViewportWidth},${chromeViewportHeight}`,
        ],
        { timeout: 15000 },
      ),
    );
  const stopChromeResult = runAppleScript(`
tell application "Google Chrome"
  quit
end tell
`, 5000);
  run("killall", ["Google Chrome"], { timeout: 5000 });
  run("sleep", ["2"], { timeout: 4000 });
  let openResult = openChrome();
  let firstLaunchDialog = null;
  let retryOpen = null;
  if (!openResult.ok) {
    firstLaunchDialog = dismissSystemDialogs();
    run("sleep", ["2"], { timeout: 4000 });
    retryOpen = openChrome();
    if (retryOpen.ok) {
      openResult = retryOpen;
    }
  }
  const activateResult = activateChrome();
  const windowBoundsResult = runAppleScript(`
tell application "System Events"
  if exists process "Google Chrome" then
    tell process "Google Chrome"
      if exists window 1 then
        set position of window 1 to {0, 0}
        set size of window 1 to {${chromeViewportWidth}, ${chromeViewportHeight}}
      end if
    end tell
  end if
end tell
`, 8000);

  return {
    ...openResult,
    chromeDebuggingPort,
    chromeUserDataDir,
    requestedViewport: {
      width: chromeViewportWidth,
      height: chromeViewportHeight,
    },
    stopChrome: stopChromeResult,
    firstLaunchDialog,
    retryOpen,
    activateChrome: activateResult,
    windowBounds: windowBoundsResult,
  };
}

async function applyChromeViewportOverride() {
  const result = await sendChromeDevToolsCommand(
    "Emulation.setDeviceMetricsOverride",
    {
      width: chromeViewportWidth,
      height: chromeViewportHeight,
      deviceScaleFactor: 1,
      mobile: false,
      screenWidth: chromeViewportWidth,
      screenHeight: chromeViewportHeight,
      positionX: 0,
      positionY: 0,
    },
    15000,
  );
  const browserEnvironment = await captureBrowserEnvironment();

  return {
    requestedViewport: {
      width: chromeViewportWidth,
      height: chromeViewportHeight,
    },
    devtools: result,
    browserEnvironment,
  };
}

function launchVoiceOver() {
  const stopQuickBefore = toCommandResult(
    run("pkill", ["-x", "VoiceOver Quick"], { timeout: 5000 }),
  );
  const stopVoiceOverBefore = toCommandResult(
    run("pkill", ["-x", "VoiceOver"], { timeout: 5000 }),
  );
  run("sleep", ["2"], { timeout: 4000 });
  const openResult = toCommandResult(
    run("open", ["-a", "VoiceOver"], { timeout: 10000 }),
  );
  run("sleep", ["2"], { timeout: 4000 });
  const stopQuickAfter = toCommandResult(
    run("pkill", ["-x", "VoiceOver Quick"], { timeout: 5000 }),
  );
  run("sleep", ["2"], { timeout: 4000 });
  const processCheck = toCommandResult(
    run("pgrep", ["-al", "VoiceOver"], { timeout: 5000 }),
  );

  return {
    open: openResult,
    processCheck,
    stopQuickBefore,
    stopVoiceOverBefore,
    stopQuickAfter,
  };
}

function activateChrome() {
  return runAppleScript('tell application "Google Chrome" to activate', 8000);
}

function dismissChromeDialogs() {
  return runAppleScript(`
set logText to ""
tell application "System Events"
  if exists process "Google Chrome" then
    tell process "Google Chrome"
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
                  if buttonName contains "Not Now" or buttonName is "Cancel" or buttonName is "Close" or buttonName is "OK" or buttonName is "Allow" or buttonName is "Open" then
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
            if exists button "Open" of windowToRead then
              click button "Open" of windowToRead
              set logText to logText & "clicked=" & processName & ":Open" & linefeed
              delay 1
              return logText
            end if
          end try
          try
            if exists button "Allow" of windowToRead then
              click button "Allow" of windowToRead
              set logText to logText & "clicked=" & processName & ":Allow" & linefeed
              delay 1
              return logText
            end if
          end try
          try
            if exists button "OK" of windowToRead then
              click button "OK" of windowToRead
              set logText to logText & "clicked=" & processName & ":OK" & linefeed
              delay 1
              return logText
            end if
          end try
          try
            if exists button "Not Now" of windowToRead then
              click button "Not Now" of windowToRead
              set logText to logText & "clicked=" & processName & ":Not Now" & linefeed
              delay 1
              return logText
            end if
          end try
          try
            if exists button "Close" of windowToRead then
              click button "Close" of windowToRead
              set logText to logText & "clicked=" & processName & ":Close" & linefeed
              delay 1
              return logText
            end if
          end try
          repeat with buttonToRead in buttons of windowToRead
            try
              set buttonName to name of buttonToRead as text
              set logText to logText & "  button=" & buttonName & linefeed
              if buttonName is "Cancel" then
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

function interactWithVoiceOverItem() {
  return runAppleScript(`
tell application "System Events"
  key code 125 using {control down, option down, shift down}
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
  set captionWindowEnabledError to ""
  try
    set captionState to enabled of caption window
  on error errorMessage number errorNumber
    set captionWindowEnabledError to "error=" & errorNumber & " " & errorMessage
  end try
  set captionText to ""
  set captionWindowContentError to ""
  try
    set captionText to my safeText(content of caption window)
  on error errorMessage number errorNumber
    set captionWindowContentError to "error=" & errorNumber & " " & errorMessage
  end try
  set captionContentText to ""
  set captionContentError to ""
  try
    set captionContentText to my safeText(content of caption)
  on error errorMessage number errorNumber
    set captionContentError to "error=" & errorNumber & " " & errorMessage
  end try
  set phraseText to my safeText(content of last phrase)
  set cursorText to my safeText(text under cursor of vo cursor)
  return "captionWindowEnabled=" & (captionState as text) & linefeed & "captionWindowEnabledError=" & captionWindowEnabledError & linefeed & "captionText=" & captionText & linefeed & "captionWindowContentError=" & captionWindowContentError & linefeed & "captionContentText=" & captionContentText & linefeed & "captionContentError=" & captionContentError & linefeed & "lastPhrase=" & phraseText & linefeed & "voCursorText=" & cursorText
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

function captureChromeFocus() {
  return runAppleScript(`
tell application "System Events"
  tell process "Google Chrome"
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
    { persist: captureStepScreenshots },
  );

  for (let attempt = 1; attempt <= 3 && !voiceOverRaw.ok; attempt += 1) {
    dismissals.push(dismissSystemDialogs());
    activateChrome();
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

async function prepareScanRootInChrome(scanRootSelector) {
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

  return evaluateJavaScriptInChrome(script, 15000);
}

async function prepareScanRoot(target, scanRootSelector) {
  if (target.url && !target.fixturePath) {
    return {
      ok: true,
      status: 0,
      signal: null,
      stdout:
        "skipped: scan root preparation is handled by scan markers for live URL scans",
      stderr: "",
      error: "",
    };
  }

  return prepareScanRootInChrome(scanRootSelector);
}

async function injectScanBoundaryMarkers(target, scanRootSelector) {
  if (!target.url && !target.fixturePath) {
    return {
      ok: true,
      status: 0,
      signal: null,
      stdout: "skipped: scan boundary markers are only injected for live URL scans",
      stderr: "",
      error: "",
    };
  }

const script = `
JSON.stringify((() => {
  const markers = ${JSON.stringify(scanMarkerTexts)};
  const root = document.querySelector(${JSON.stringify(scanRootSelector)}) || document.body;
  const style = [
    "display:block",
    "margin:0",
    "padding:0",
    "font-size:1px",
    "line-height:1px",
    "color:transparent",
    "background:transparent"
  ].join(";");

  function createMarker(boundary, text) {
    const marker = document.createElement("p");
    marker.dataset.srVoiceoverScanBoundary = boundary;
    marker.tabIndex = -1;
    marker.textContent = text;
    marker.style.cssText = style;
    return marker;
  }

  document
    .querySelectorAll("[data-sr-voiceover-scan-boundary], [data-sr-voiceover-scan-end]")
    .forEach((marker) => marker.remove());

  const startMarker = createMarker("start", markers.start);
  const endMarker = createMarker("end", markers.end);
  root.insertBefore(startMarker, root.firstChild);
  root.appendChild(endMarker);
  return {
    action: "inserted",
    rootSelector: ${JSON.stringify(scanRootSelector)},
    rootTagName: root.tagName,
    startText: startMarker.textContent,
    endText: endMarker.textContent
  };
})())
`;

  return evaluateJavaScriptInChrome(script, 15000);
}

async function focusScanStartMarker(target) {
  if (!target.url && !target.fixturePath) {
    return moveVoiceOverToStart();
  }

  const script = `
JSON.stringify((() => {
  const marker = document.querySelector('[data-sr-voiceover-scan-boundary="start"]');
  if (!marker) {
    return {
      action: "missing",
      activeTagName: document.activeElement?.tagName || "",
      activeText: document.activeElement?.innerText || document.activeElement?.value || ""
    };
  }

  marker.setAttribute("tabindex", "-1");
  marker.scrollIntoView({ block: "start", inline: "nearest" });
  marker.focus({ preventScroll: true });

  return {
    action: "focused",
    activeTagName: document.activeElement?.tagName || "",
    activeText: document.activeElement?.innerText || document.activeElement?.value || "",
    markerText: marker.textContent || ""
  };
})())
`;

  return evaluateJavaScriptInChrome(script, 15000);
}

async function dismissPageConsent(target) {
  if (!target.url) {
    return {
      ok: true,
      status: 0,
      signal: null,
      stdout: "skipped: consent handling is only applied to live URL scans",
      stderr: "",
      error: "",
    };
  }

  const script = `
JSON.stringify((() => {
  const preferenceGroups = [
    {
      preference: "reject",
      labels: [
        "reject all",
        "reject optional",
        "reject non-essential",
        "reject non essential",
        "decline all",
        "decline",
        "deny all",
        "continue without accepting",
        "necessary cookies only",
        "essential cookies only",
      ],
    },
    {
      preference: "save",
      labels: [
        "save choices",
        "save settings",
        "confirm choices",
        "confirm my choices",
      ],
    },
    {
      preference: "accept",
      labels: [
        "accept all",
        "accept",
        "allow all",
        "agree",
        "i agree",
        "accept cookies",
      ],
    },
  ];

  const selectors = [
    "button",
    "[role='button']",
    "input[type='button']",
    "input[type='submit']",
    "a[href]",
  ];
  const consentTextPattern =
    /cookie|cookies|consent|privacy|personal data|trusted partners/i;

  const normalize = (value) =>
    String(value || "")
      .replace(/\\s+/g, " ")
      .trim()
      .toLowerCase();

  const getLabel = (element) =>
    normalize(
      element.getAttribute("aria-label") ||
        element.getAttribute("title") ||
        element.value ||
        element.innerText ||
        element.textContent ||
        "",
    );

  const isVisible = (element) => {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      Number(style.opacity || "1") > 0 &&
      rect.width > 0 &&
      rect.height > 0
    );
  };

  const candidates = Array.from(document.querySelectorAll(selectors.join(",")))
    .slice(0, 500)
    .filter((element, index, all) => all.indexOf(element) === index)
    .map((element) => ({
      element,
      label: getLabel(element),
      tagName: element.tagName.toLowerCase(),
      role: element.getAttribute("role") || "",
      visible: isVisible(element),
    }))
    .filter((candidate) => candidate.visible && candidate.label);

  for (const group of preferenceGroups) {
    for (const label of group.labels) {
      const exactMatch = candidates.find((candidate) => candidate.label === label);
      const partialMatch = candidates.find((candidate) =>
        candidate.label.includes(label),
      );
      const match = exactMatch || partialMatch;
      if (match) {
        match.element.click();
        return {
          action: "clicked",
          preference: group.preference,
          label: match.label,
          tagName: match.tagName,
          role: match.role,
          candidateCount: candidates.length,
          url: location.href,
        };
      }
    }
  }

  const overlayCandidates = Array.from(
    document.querySelectorAll(
      [
        "[role='dialog']",
        "[aria-modal='true']",
        "[class*='cookie' i]",
        "[id*='cookie' i]",
        "[class*='consent' i]",
        "[id*='consent' i]",
        "[class*='privacy' i]",
        "[id*='privacy' i]",
      ].join(","),
    ),
  )
    .slice(0, 50)
    .filter((element) => isVisible(element))
    .filter((element) => consentTextPattern.test(element.innerText || element.textContent || ""));

  if (overlayCandidates.length) {
    for (const element of overlayCandidates) {
      element.setAttribute("data-sr-voiceover-hidden-consent", "true");
      element.style.setProperty("display", "none", "important");
      element.style.setProperty("visibility", "hidden", "important");
    }

    return {
      action: "hidden",
      preference: "neutral",
      reason: "visible consent overlay hidden after no matching button was found",
      hiddenCount: overlayCandidates.length,
      candidateCount: candidates.length,
      candidateLabels: candidates.slice(0, 20).map((candidate) => candidate.label),
      url: location.href,
    };
  }

  return {
    action: "none",
    candidateCount: candidates.length,
    candidateLabels: candidates.slice(0, 20).map((candidate) => candidate.label),
    url: location.href,
  };
})())
`;

  return evaluateJavaScriptInChrome(script, 15000);
}

function getDomConsentAction(result) {
  try {
    return JSON.parse(result.stdout || "{}").action || "";
  } catch {
    return "";
  }
}

function clickScreenPoint(x, y) {
  return runAppleScript(`
tell application "System Events"
  click at {${Number(x)}, ${Number(y)}}
end tell
`, 8000);
}

function dismissPageConsentVisually(target, targetOutputDir) {
  if (!target.url) {
    return {
      skipped: true,
      reason: "visual consent handling is only applied to live URL scans",
    };
  }

  const screenshot = captureScreenshot(
    targetOutputDir,
    "consent",
    "page-consent",
    { persist: captureStepScreenshots },
  );
  if (!screenshot.ok) {
    return {
      skipped: false,
      action: "screenshot-failed",
      screenshot,
    };
  }

  const tool = getPageConsentOcrTool();
  if (!tool.ok) {
    return {
      skipped: false,
      action: "ocr-tool-failed",
      screenshot,
      tool,
    };
  }

  const ocr = toCommandResult(
    run(tool.path, [screenshot.filePath], { timeout: 10000 }),
  );
  const parsed = parseVoiceOverText(ocr.stdout || "");
  if (!ocr.ok || parsed.action !== "found") {
    return {
      skipped: false,
      action: parsed.action || "none",
      screenshot,
      ocr,
      parsed,
      tool,
    };
  }

  const dismissSystemBeforeClick = dismissSystemDialogs();
  activateChrome();
  run("sleep", ["0.5"], { timeout: 2000 });
  let click = clickScreenPoint(parsed.x, parsed.y);
  let dismissSystemBeforeRetry = null;
  let retryClick = null;
  if (!click.ok) {
    dismissSystemBeforeRetry = dismissSystemDialogs();
    activateChrome();
    run("sleep", ["0.5"], { timeout: 2000 });
    retryClick = clickScreenPoint(parsed.x, parsed.y);
    click = retryClick;
  }
  run("sleep", ["3"], { timeout: 5000 });
  return {
    skipped: false,
    action: "clicked",
    screenshot,
    ocr,
    parsed,
    dismissSystemBeforeClick,
    dismissSystemBeforeRetry,
    retryClick,
    click,
    tool,
  };
}

async function dismissBrowserBlockingOverlays(target, targetOutputDir) {
  const attempts = [];
  let finalDomResult = null;
  let finalVisualResult = null;

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    activateChrome();
    const chromeDialogs = dismissChromeDialogs();
    const systemDialogs = dismissSystemDialogs();
    activateChrome();
    run("sleep", ["1"], { timeout: 3000 });

    const domConsent = await dismissPageConsent(target);
    finalDomResult = domConsent;
    const domAction = getDomConsentAction(domConsent);

    let visualConsent = {
      skipped: true,
      reason: "DOM consent handler already completed",
    };
    if (!["clicked", "hidden"].includes(domAction)) {
      visualConsent = dismissPageConsentVisually(target, targetOutputDir);
      finalVisualResult = visualConsent;
    }

    const visualAction = visualConsent?.action || "";
    attempts.push({
      attempt,
      chromeDialogs,
      systemDialogs,
      domConsent,
      visualConsent,
    });

    if (
      ["clicked", "hidden"].includes(domAction) ||
      (["clicked", "hidden"].includes(visualAction) &&
        visualConsent?.parsed?.preference !== "system-permission")
    ) {
      run("sleep", ["2"], { timeout: 4000 });
      break;
    }

    run("sleep", ["2"], { timeout: 4000 });
  }

  return {
    attempts,
    domConsent: finalDomResult,
    visualConsent: finalVisualResult || {
      skipped: true,
      reason: "visual consent handler was not needed",
    },
  };
}

async function getTargetSourceHtml(target) {
  if (target.fixturePath) {
    return readFileSync(path.resolve(repoRoot, target.fixturePath), "utf8");
  }

  return "";
}

async function captureRenderedSourceHtml(target) {
  if (!target.url) {
    return {
      ok: true,
      status: 0,
      signal: null,
      stdout: "",
      stderr: "",
      error: "",
      source: "not-applicable",
    };
  }

  const annotationScript = [
    "(() => {",
    "document",
    "  .querySelectorAll('[data-sr-voiceover-scan-boundary], [data-sr-voiceover-scan-end]')",
    "  .forEach((marker) => marker.remove());",
    "document",
    "  .querySelectorAll('[data-sr-rendered-viewport], [data-sr-computed-hidden], [data-sr-rendered-position], [data-sr-dom-node-id], [data-sr-marker-content], [data-sr-marker-display], [data-sr-marker-list-style-type]')",
    "  .forEach((element) => {",
    "    element.removeAttribute('data-sr-rendered-viewport');",
    "    element.removeAttribute('data-sr-computed-hidden');",
    "    element.removeAttribute('data-sr-rendered-position');",
    "    element.removeAttribute('data-sr-dom-node-id');",
    "    element.removeAttribute('data-sr-marker-content');",
    "    element.removeAttribute('data-sr-marker-display');",
    "    element.removeAttribute('data-sr-marker-list-style-type');",
    "  });",
    "document.body?.setAttribute('data-sr-rendered-viewport', `${window.innerWidth}x${window.innerHeight}`);",
    "for (const [index, element] of Array.from(document.body?.querySelectorAll('*') || []).entries()) {",
    "  element.setAttribute('data-sr-dom-node-id', String(index + 1));",
    "  const style = window.getComputedStyle(element);",
    "  const hiddenReasons = [];",
    "  if (style.display === 'none') hiddenReasons.push('display:none');",
    "  if (style.visibility === 'hidden' || style.visibility === 'collapse') hiddenReasons.push(`visibility:${style.visibility}`);",
    "  if (Number(style.opacity) === 0 && element.matches('a, button, input, select, textarea, summary, [role], [tabindex]')) hiddenReasons.push('opacity:0');",
    "  if (hiddenReasons.length) {",
    "    element.setAttribute('data-sr-computed-hidden', hiddenReasons.join(' '));",
    "    continue;",
    "  }",
    "  const rect = element.getBoundingClientRect();",
    "  const hasRelevantContent = Boolean(element.textContent.trim() || element.getAttribute('aria-label') || element.getAttribute('alt') || element.matches('a, button, input, select, textarea, summary, [role]'));",
    "  if (hasRelevantContent && (rect.right <= 0 || rect.bottom <= 0 || rect.left >= window.innerWidth || rect.top >= window.innerHeight)) {",
    "    element.setAttribute('data-sr-rendered-position', 'offscreen');",
    "  }",
    "  const markerCandidate = element.matches('li, summary, [role=\"listitem\"]') || style.display === 'list-item';",
    "  const markerStyle = markerCandidate ? window.getComputedStyle(element, '::marker') : null;",
    "  const hasMarkerContent = markerStyle && markerStyle.content !== 'none' && markerStyle.content !== 'normal';",
    "  const hasMarkerListStyle = markerStyle && markerStyle.listStyleType && markerStyle.listStyleType !== 'none';",
    "  if (markerStyle && markerStyle.display !== 'none' && (hasMarkerContent || hasMarkerListStyle)) {",
    "    element.setAttribute('data-sr-marker-content', markerStyle.content);",
    "    element.setAttribute('data-sr-marker-display', markerStyle.display);",
    "    element.setAttribute('data-sr-marker-list-style-type', markerStyle.listStyleType);",
    "  }",
    "}",
    "return JSON.stringify({",
    "  title: document.title,",
    "  readyState: document.readyState,",
    "  url: location.href,",
    "  viewport: `${window.innerWidth}x${window.innerHeight}`,",
    "  nodeCount: document.body?.querySelectorAll('*').length || 0,",
    "});",
    "})()",
  ].join(" ");

  const annotation = await evaluateJavaScriptInChrome(annotationScript, 30000);
  if (!annotation.ok) {
    return {
      ...annotation,
      source: "chrome-rendered-dom",
    };
  }

  const html = await evaluateJavaScriptInChrome(
    [
      "(() => {",
      "function serializeNodeWithShadowRoots(node) {",
      "  const clone = node.cloneNode(false);",
      "  if (node.shadowRoot) {",
      "    const template = document.createElement('template');",
      "    template.setAttribute('shadowrootmode', node.shadowRoot.mode || 'open');",
      "    for (const child of Array.from(node.shadowRoot.childNodes)) {",
      "      template.content.appendChild(serializeNodeWithShadowRoots(child));",
      "    }",
      "    clone.appendChild(template);",
      "  }",
      "  for (const child of Array.from(node.childNodes)) {",
      "    clone.appendChild(serializeNodeWithShadowRoots(child));",
      "  }",
      "  return clone;",
      "}",
      "const serialized = serializeNodeWithShadowRoots(document.documentElement);",
      "return '<!doctype html>\\n' + serialized.outerHTML;",
      "})()",
    ].join(" "),
    30000,
  );

  return {
    ...html,
    annotation,
    source: "chrome-rendered-dom",
  };
}

function getAxValue(value) {
  if (!value || typeof value !== "object") {
    return value ?? null;
  }

  if (Object.hasOwn(value, "value")) {
    return value.value;
  }

  if (Object.hasOwn(value, "description")) {
    return value.description;
  }

  return null;
}

function reduceAccessibilityTreeNode(node, backendDomNodeMap = new Map()) {
  const reduced = {
    nodeId: node.nodeId || "",
    ignored: Boolean(node.ignored),
    role: getAxValue(node.role) || "",
    name: getAxValue(node.name) || "",
  };

  const optionalValues = {
    value: getAxValue(node.value),
    description: getAxValue(node.description),
    keyshortcuts: getAxValue(node.keyshortcuts),
    roledescription: getAxValue(node.roledescription),
    valuetext: getAxValue(node.valuetext),
  };
  for (const [key, value] of Object.entries(optionalValues)) {
    if (value !== null && value !== "") {
      reduced[key] = value;
    }
  }

  if (node.backendDOMNodeId) {
    reduced.backendDOMNodeId = node.backendDOMNodeId;
    const domNode = backendDomNodeMap.get(node.backendDOMNodeId);
    if (domNode?.domNodeId) {
      reduced.domNodeId = domNode.domNodeId;
      reduced.renderedHtmlSelector = `[data-sr-dom-node-id="${domNode.domNodeId}"]`;
    }
    if (domNode?.tagName) {
      reduced.tagName = domNode.tagName;
    }
  }
  if (node.childIds?.length) {
    reduced.childIds = node.childIds;
  }
  if (node.ignoredReasons?.length) {
    reduced.ignoredReasons = node.ignoredReasons.map((reason) => ({
      name: reason.name || "",
      value: getAxValue(reason.value),
    }));
  }
  if (node.properties?.length) {
    reduced.properties = Object.fromEntries(
      node.properties
        .map((property) => [property.name, getAxValue(property.value)])
        .filter(([name, value]) => name && value !== null && value !== ""),
    );
  }

  return reduced;
}

function getSnapshotString(strings, index) {
  return typeof index === "number" && index >= 0 ? strings[index] || "" : "";
}

async function captureBackendDomNodeMap() {
  const captured = await sendChromeDevToolsCommand(
    "DOMSnapshot.captureSnapshot",
    {
      computedStyles: [],
      includeDOMRects: false,
      includePaintOrder: false,
    },
    30000,
  );

  if (!captured.ok) {
    return {
      ok: false,
      map: new Map(),
      stats: {
        mappedNodeCount: 0,
      },
      capture: captured,
    };
  }

  let parsed = {};
  try {
    parsed = JSON.parse(captured.stdout || "{}");
  } catch (error) {
    return {
      ok: false,
      map: new Map(),
      stats: {
        mappedNodeCount: 0,
      },
      capture: {
        ...captured,
        ok: false,
        stderr: `Unable to parse Chrome DOM snapshot: ${error?.message || error}`,
      },
    };
  }

  const strings = Array.isArray(parsed.strings) ? parsed.strings : [];
  const documentSnapshot = Array.isArray(parsed.documents)
    ? parsed.documents[0]
    : null;
  const nodes = documentSnapshot?.nodes || {};
  const backendNodeIds = Array.isArray(nodes.backendNodeId)
    ? nodes.backendNodeId
    : [];
  const nodeNames = Array.isArray(nodes.nodeName) ? nodes.nodeName : [];
  const attributes = Array.isArray(nodes.attributes) ? nodes.attributes : [];
  const map = new Map();

  for (let index = 0; index < backendNodeIds.length; index += 1) {
    const backendDOMNodeId = backendNodeIds[index];
    if (!backendDOMNodeId) {
      continue;
    }

    const attributeIndexes = Array.isArray(attributes[index])
      ? attributes[index]
      : [];
    let domNodeId = "";
    for (
      let attributeIndex = 0;
      attributeIndex < attributeIndexes.length;
      attributeIndex += 2
    ) {
      const name = getSnapshotString(strings, attributeIndexes[attributeIndex]);
      if (name === "data-sr-dom-node-id") {
        domNodeId = getSnapshotString(
          strings,
          attributeIndexes[attributeIndex + 1],
        );
        break;
      }
    }

    if (domNodeId) {
      map.set(backendDOMNodeId, {
        backendDOMNodeId,
        domNodeId,
        tagName: getSnapshotString(strings, nodeNames[index]).toLowerCase(),
      });
    }
  }

  return {
    ok: true,
    map,
    stats: {
      mappedNodeCount: map.size,
    },
    capture: captured,
  };
}

async function captureAccessibilityTree(target) {
  if (!target.url) {
    return {
      ok: true,
      source: "not-applicable",
      tree: {
        schemaVersion: 1,
        source: "not-applicable",
        nodes: [],
      },
      capture: commandResult({
        ok: true,
        stdout: "fixture/source scans do not expose a live Chrome accessibility tree",
        extras: { source: "not-applicable" },
      }),
    };
  }

  const captured = await sendChromeDevToolsCommand(
    "Accessibility.getFullAXTree",
    {},
    30000,
  );

  if (!captured.ok) {
    return {
      ok: false,
      source: "chrome-accessibility-tree",
      tree: {
        schemaVersion: 1,
        source: "chrome-accessibility-tree",
        nodes: [],
      },
      capture: captured,
    };
  }

  let parsed = {};
  try {
    parsed = JSON.parse(captured.stdout || "{}");
  } catch (error) {
    return {
      ok: false,
      source: "chrome-accessibility-tree",
      tree: {
        schemaVersion: 1,
        source: "chrome-accessibility-tree",
        nodes: [],
      },
      capture: {
        ...captured,
        ok: false,
        stderr: `Unable to parse Chrome accessibility tree: ${error?.message || error}`,
      },
    };
  }

  const domNodeMap = await captureBackendDomNodeMap();
  const nodes = Array.isArray(parsed.nodes) ? parsed.nodes : [];
  const reducedNodes = nodes.map((node) =>
    reduceAccessibilityTreeNode(node, domNodeMap.map),
  );
  const axMappedNodeCount = reducedNodes.filter(
    (node) => node.renderedHtmlSelector,
  ).length;
  return {
    ok: true,
    source: "chrome-accessibility-tree",
    tree: {
      schemaVersion: 1,
      source: "chrome-accessibility-tree",
      nodeCount: reducedNodes.length,
      ignoredNodeCount: reducedNodes.filter((node) => node.ignored).length,
      axMappedNodeCount,
      domSnapshotMappedNodeCount: domNodeMap.stats.mappedNodeCount,
      mapSource: "rendered-html:data-sr-dom-node-id",
      nodes: reducedNodes,
    },
    capture: captured,
    domNodeMapCapture: domNodeMap.capture,
  };
}

async function captureStepSnapshot({ target, stepIndex, announcement, focus }) {
  if (!captureStepSnapshots || !target.url) {
    return null;
  }

  const stepSearchTokens = getSearchTokens(
    getSnapshotSearchText({ announcement, focus }),
  );
  const pageStateScript = [
    "(() => {",
    `const searchTokens = ${JSON.stringify(stepSearchTokens)};`,
    "let nextNodeId = 1;",
    "for (const element of Array.from(document.body?.querySelectorAll('*') || [])) {",
    "  element.removeAttribute('data-sr-marker-content');",
    "  element.removeAttribute('data-sr-marker-display');",
    "  element.removeAttribute('data-sr-marker-list-style-type');",
    "  if (!element.hasAttribute('data-sr-dom-node-id')) {",
    "    element.setAttribute('data-sr-dom-node-id', String(nextNodeId));",
    "  }",
    "  const elementStyle = window.getComputedStyle(element);",
    "  const markerCandidate = element.matches('li, summary, [role=\"listitem\"]') || elementStyle.display === 'list-item';",
    "  const markerStyle = markerCandidate ? window.getComputedStyle(element, '::marker') : null;",
    "  const hasMarkerContent = markerStyle && markerStyle.content !== 'none' && markerStyle.content !== 'normal';",
    "  const hasMarkerListStyle = markerStyle && markerStyle.listStyleType && markerStyle.listStyleType !== 'none';",
    "  if (markerStyle && markerStyle.display !== 'none' && (hasMarkerContent || hasMarkerListStyle)) {",
    "    element.setAttribute('data-sr-marker-content', markerStyle.content);",
    "    element.setAttribute('data-sr-marker-display', markerStyle.display);",
    "    element.setAttribute('data-sr-marker-list-style-type', markerStyle.listStyleType);",
    "  }",
    "  nextNodeId += 1;",
    "}",
    "function attrs(element) {",
    "  if (!element?.attributes) return {};",
    "  const keep = new Set(['id', 'role', 'aria-label', 'aria-labelledby', 'aria-describedby', 'aria-expanded', 'aria-hidden', 'hidden', 'href', 'type', 'title', 'alt', 'data-sr-dom-node-id', 'data-sr-marker-content', 'data-sr-marker-display', 'data-sr-marker-list-style-type']);",
    "  return Object.fromEntries(Array.from(element.attributes).filter((attr) => keep.has(attr.name.toLowerCase())).map((attr) => [attr.name, attr.value]));",
    "}",
    "function htmlSnippet(element) {",
    "  if (!element?.cloneNode) return '';",
    "  function serializeNodeWithShadowRoots(node) {",
    "    const clone = node.cloneNode(false);",
    "    if (node.shadowRoot) {",
    "      const template = document.createElement('template');",
    "      template.setAttribute('shadowrootmode', node.shadowRoot.mode || 'open');",
    "      for (const child of Array.from(node.shadowRoot.childNodes)) {",
    "        template.content.appendChild(serializeNodeWithShadowRoots(child));",
    "      }",
    "      clone.appendChild(template);",
    "    }",
    "    for (const child of Array.from(node.childNodes)) {",
    "      clone.appendChild(serializeNodeWithShadowRoots(child));",
    "    }",
    "    return clone;",
    "  }",
    "  const clone = serializeNodeWithShadowRoots(element);",
    "  clone.querySelectorAll?.('script, style, link, meta, noscript, template:not([shadowrootmode])').forEach((node) => node.remove());",
    "  clone.querySelectorAll?.('svg').forEach((svg) => {",
    "    const label = svg.getAttribute('aria-label') || svg.querySelector('title')?.textContent || '';",
    "    svg.textContent = '';",
    "    if (label && !svg.getAttribute('aria-label')) svg.setAttribute('aria-label', label.trim());",
    "  });",
    "  return clone.outerHTML.replace(/\\s+/g, ' ').trim().slice(0, 1600);",
    "}",
    "function describe(element) {",
    "  if (!element) return null;",
    "  const style = window.getComputedStyle(element);",
    "  const markerCandidate = element.matches('li, summary, [role=\"listitem\"]') || style.display === 'list-item';",
    "  const markerStyle = markerCandidate ? window.getComputedStyle(element, '::marker') : null;",
    "  const rect = element.getBoundingClientRect();",
    "  return {",
    "    tagName: element.tagName?.toLowerCase() || '',",
    "    attributes: attrs(element),",
    "    text: (element.innerText || element.textContent || element.value || '').replace(/\\s+/g, ' ').trim().slice(0, 500),",
    "    computed: { display: style.display, visibility: style.visibility, opacity: style.opacity, marker: { content: markerStyle?.content || '', display: markerStyle?.display || '', listStyleType: markerStyle?.listStyleType || '' } },",
    "    rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height), top: Math.round(rect.top), left: Math.round(rect.left), bottom: Math.round(rect.bottom), right: Math.round(rect.right) }",
    "    , html: htmlSnippet(element)",
    "  };",
    "}",
    "function describeAncestor(element) {",
    "  if (!element) return null;",
    "  const style = window.getComputedStyle(element);",
    "  const markerCandidate = element.matches('li, summary, [role=\"listitem\"]') || style.display === 'list-item';",
    "  const markerStyle = markerCandidate ? window.getComputedStyle(element, '::marker') : null;",
    "  const rect = element.getBoundingClientRect();",
    "  return {",
    "    tagName: element.tagName?.toLowerCase() || '',",
    "    attributes: attrs(element),",
    "    text: (element.innerText || element.textContent || element.value || '').replace(/\\s+/g, ' ').trim().slice(0, 240),",
    "    computed: { display: style.display, visibility: style.visibility, opacity: style.opacity, marker: { content: markerStyle?.content || '', display: markerStyle?.display || '', listStyleType: markerStyle?.listStyleType || '' } },",
    "    rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height), top: Math.round(rect.top), left: Math.round(rect.left), bottom: Math.round(rect.bottom), right: Math.round(rect.right) }",
    "  };",
    "}",
    "function ancestors(element) {",
    "  const result = [];",
    "  for (let current = element?.parentElement; current && result.length < 6; current = current.parentElement) {",
    "    result.push(describeAncestor(current));",
    "  }",
    "  return result;",
    "}",
    "function scoreElement(element) {",
    "  if (!element || searchTokens.length === 0) return 0;",
    "  const haystack = [",
    "    element.tagName || '',",
    "    element.getAttribute('role') || '',",
    "    element.getAttribute('aria-label') || '',",
    "    element.getAttribute('title') || '',",
    "    element.getAttribute('alt') || '',",
    "    element.getAttribute('placeholder') || '',",
    "    element.innerText || element.textContent || element.value || '',",
    "  ].join(' ').toLowerCase();",
    "  return searchTokens.reduce((score, token) => score + (haystack.includes(token) ? 1 : 0), 0);",
    "}",
    "const active = document.activeElement;",
    "const center = active?.getBoundingClientRect ? active.getBoundingClientRect() : null;",
    "const pointElements = center ? document.elementsFromPoint(center.left + center.width / 2, center.top + center.height / 2).slice(0, 8).map(describe) : [];",
    "const matchedDomElements = Array.from(document.body?.querySelectorAll('*') || [])",
    "  .map((element) => ({ element, score: scoreElement(element) }))",
    "  .filter((entry) => entry.score > 0)",
    "  .sort((a, b) => b.score - a.score)",
    "  .slice(0, 20)",
    "  .map(({ element, score }) => ({ score, ...describe(element), ancestors: ancestors(element) }));",
    "return JSON.stringify({",
    "  title: document.title,",
    "  readyState: document.readyState,",
    "  url: location.href,",
    "  viewport: { width: window.innerWidth, height: window.innerHeight, devicePixelRatio: window.devicePixelRatio },",
    "  scroll: { x: Math.round(window.scrollX), y: Math.round(window.scrollY) },",
    "  activeElement: describe(active),",
    "  activeElementAncestors: ancestors(active),",
    "  pointElements,",
    "  matchedDomElements",
    "});",
    "})()",
  ].join(" ");

  const pageStateCapture = await evaluateJavaScriptInChrome(pageStateScript, 15000);
  let pageState = {};
  try {
    pageState = JSON.parse(pageStateCapture.stdout || "{}");
  } catch (error) {
    pageState = {
      parseError: error?.message || String(error),
      raw: pageStateCapture.stdout || "",
    };
  }

  const axCapture = await sendChromeDevToolsCommand(
    "Accessibility.getFullAXTree",
    {},
    30000,
  );
  let accessibility = {
    ok: axCapture.ok,
    status: axCapture.status,
    signal: axCapture.signal,
    stderr: axCapture.stderr,
    error: axCapture.error,
    nodeCount: 0,
    ignoredNodeCount: 0,
    matchedNodes: [],
  };

  if (axCapture.ok) {
    try {
      const parsed = JSON.parse(axCapture.stdout || "{}");
      const domNodeMap = await captureBackendDomNodeMap();
      const nodes = Array.isArray(parsed.nodes)
        ? parsed.nodes.map((node) => reduceAccessibilityTreeNode(node, domNodeMap.map))
        : [];
      const tokens = stepSearchTokens;
      const matchedNodes = nodes
        .map((node) => ({ node, score: scoreAxSnapshotNode(node, tokens) }))
        .filter((entry) => entry.score > 0 && !entry.node.ignored)
        .sort((a, b) => b.score - a.score)
        .slice(0, 20)
        .map(({ node, score }) => ({ score, ...node }));

      accessibility = {
        ok: true,
        nodeCount: nodes.length,
        ignoredNodeCount: nodes.filter((node) => node.ignored).length,
        domSnapshotMappedNodeCount: domNodeMap.stats.mappedNodeCount,
        tokens,
        matchedNodes,
      };
    } catch (error) {
      accessibility = {
        ...accessibility,
        ok: false,
        error: error?.message || String(error),
      };
    }
  }

  return {
    index: stepIndex,
    capturedAt: new Date().toISOString(),
    announcement,
    focus,
    pageStateCapture: {
      ok: pageStateCapture.ok,
      status: pageStateCapture.status,
      signal: pageStateCapture.signal,
      stderr: pageStateCapture.stderr,
      error: pageStateCapture.error,
    },
    pageState,
    accessibility,
  };
}

async function getArtifactSourceHtml(target) {
  if (target.url) {
    const rendered = await captureRenderedSourceHtml(target);
    return {
      html: rendered.ok ? rendered.stdout || "" : "",
      capture: rendered,
    };
  }

  return {
    html: await getTargetSourceHtml(target).catch(() => ""),
    capture: {
      ok: true,
      status: 0,
      signal: null,
      stdout: "fixture/source file read from disk",
      stderr: "",
      error: "",
      source: target.fixturePath ? "fixture-file" : "empty",
    },
  };
}

function getJsdomUrl(target) {
  if (target.fixturePath) {
    return pathToFileURL(path.resolve(repoRoot, target.fixturePath)).href;
  }

  return target.url || "https://example.test/";
}

function getReferencedIds(document) {
  const referencedIds = new Set();
  const referenceAttributes = [
    "aria-activedescendant",
    "aria-controls",
    "aria-describedby",
    "aria-details",
    "aria-errormessage",
    "aria-flowto",
    "aria-labelledby",
    "aria-owns",
    "for",
    "headers",
    "list",
  ];

  for (const element of document.querySelectorAll("*")) {
    for (const attribute of referenceAttributes) {
      const value = element.getAttribute(attribute);
      if (!value) {
        continue;
      }
      for (const id of value.split(/\s+/)) {
        if (id) {
          referencedIds.add(id);
        }
      }
    }
  }

  return referencedIds;
}

function shouldKeepAttribute(attribute, element, referencedIds) {
  const name = attribute.name.toLowerCase();

  if (name === "id") {
    return referencedIds.has(attribute.value);
  }

  if (name === "role" || name.startsWith("aria-")) {
    return true;
  }

  if (name.startsWith("data-sr-")) {
    return true;
  }

  if (element.tagName === "TEMPLATE" && name === "shadowrootmode") {
    return true;
  }

  return [
    "alt",
    "checked",
    "controls",
    "disabled",
    "for",
    "headers",
    "hidden",
    "href",
    "inert",
    "label",
    "list",
    "name",
    "open",
    "placeholder",
    "readonly",
    "required",
    "selected",
    "tabindex",
    "title",
    "type",
    "value",
  ].includes(name);
}

function normalizeTextNodes(document) {
  const walker = document.createTreeWalker(document.body, 4);
  const textNodes = [];

  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }

  for (const node of textNodes) {
    node.nodeValue = node.nodeValue.replace(/\s+/g, " ");
    if (!node.nodeValue.trim()) {
      node.remove();
    }
  }
}

function removeComments(document) {
  const walker = document.createTreeWalker(document, 128);
  const comments = [];

  while (walker.nextNode()) {
    comments.push(walker.currentNode);
  }

  for (const comment of comments) {
    comment.remove();
  }
}

function pruneEmptyElements(document) {
  const removableNames = new Set(["DIV", "SPAN"]);
  let removed = true;

  while (removed) {
    removed = false;
    const elements = Array.from(document.querySelectorAll("div, span")).reverse();
    for (const element of elements) {
      if (
        removableNames.has(element.tagName) &&
        !element.attributes.length &&
        !element.children.length &&
        !element.textContent.trim()
      ) {
        element.remove();
        removed = true;
      }
    }
  }
}

function reduceHtmlForRefinement(sourceHtml, target) {
  if (!sourceHtml.trim()) {
    return {
      html: "",
      stats: {
        originalLength: 0,
        reducedLength: 0,
      },
    };
  }

  const dom = new JSDOM(sourceHtml, { url: getJsdomUrl(target) });
  const { document } = dom.window;
  const referencedIds = getReferencedIds(document);

  document
    .querySelectorAll("script, style, link, meta, noscript, template:not([shadowrootmode])")
    .forEach((element) => element.remove());

  document.querySelectorAll("svg").forEach((element) => {
    const accessibleText =
      element.getAttribute("aria-label") ||
      element.getAttribute("title") ||
      element.querySelector("title")?.textContent ||
      "";
    element.textContent = "";
    if (accessibleText && !element.getAttribute("aria-label")) {
      element.setAttribute("aria-label", accessibleText.trim());
    }
  });

  for (const element of document.querySelectorAll("*")) {
    for (const attribute of Array.from(element.attributes)) {
      if (!shouldKeepAttribute(attribute, element, referencedIds)) {
        element.removeAttribute(attribute.name);
      }
    }
  }

  removeComments(document);
  normalizeTextNodes(document);
  pruneEmptyElements(document);

  const reducedHtml = document.body?.outerHTML.trim() || document.documentElement.outerHTML;
  return {
    html: reducedHtml,
    stats: {
      originalLength: sourceHtml.length,
      reducedLength: reducedHtml.length,
      reductionPercent:
        sourceHtml.length > 0
          ? Math.round((1 - reducedHtml.length / sourceHtml.length) * 100)
          : 0,
    },
  };
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
    step.voiceOver?.captionContentText || "",
    step.voiceOver?.captionAxText || "",
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
  return getCaptionVoiceOverText(step);
}

function getCaptionVoiceOverText(step) {
  const captionCandidates = [
    step.voiceOver?.captionOcrText,
    step.voiceOver?.captionText,
    step.voiceOver?.captionContentText,
    step.voiceOver?.captionAxText,
    step.voiceOver?.captionUiText,
  ];

  for (const candidate of captionCandidates) {
    const caption = cleanCaptionOcrText(candidate);
    if (caption && !isSystemNoise(caption)) {
      return caption;
    }
  }

  return "";
}

function isSystemNoise(announcement) {
  return (
    announcement === "Edit button" ||
    announcement === "Edit customizations button" ||
    announcement === "Open System Settings button" ||
    announcement.includes("Open System Settings button") ||
    /^(Google Chrome|Chrome) .+ window$/.test(announcement) ||
    /^(Google Chrome|Chrome), .+, window$/.test(announcement) ||
    /^(Google Chrome|Chrome), .+, window, .+ web content, has$/i.test(
      announcement,
    ) ||
    /^application, alert, system dialog /.test(announcement) ||
    /^application alert system dialog /.test(announcement) ||
    announcement.includes("requesting to bypass the system private window picker")
  );
}

function isRefinementNoise(announcement) {
  return /^You are currently (on|in) .+\.?( To .+)?$/i.test(announcement);
}

function getScanBoundary(announcement) {
  const normalized = announcement.toLowerCase();
  if (normalized.includes(scanMarkerTexts.start.toLowerCase())) {
    return "start";
  }
  if (normalized.includes(scanMarkerTexts.end.toLowerCase())) {
    return "end";
  }
  return "";
}

function isScanBoundaryMarker(announcement) {
  return Boolean(getScanBoundary(announcement));
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

function normalizeStallText(value) {
  return cleanCaptionOcrText(value)
    .toLowerCase()
    .replace(/[,\s]+/g, " ")
    .trim();
}

function isDesktopEmptyAnnouncement(step) {
  const candidates = [
    getComparisonVoiceOverText(step),
    step.voiceOver?.lastPhrase,
    step.voiceOver?.voCursorText,
  ];
  return candidates.some((candidate) => {
    const normalized = normalizeStallText(candidate);
    return normalized === "desktop empty group";
  });
}

function hasMissingChromeFocus(step) {
  const focusError = String(step.focus?.error || "");
  return (
    focusError.includes('Can’t get process "Google Chrome"') ||
    focusError.includes('Can’t get attribute "AXFocusedUIElement"')
  );
}

function getRepeatedTailCount(voiceOverSteps, predicate) {
  let count = 0;
  for (let index = voiceOverSteps.length - 1; index >= 0; index -= 1) {
    if (!predicate(voiceOverSteps[index])) break;
    count += 1;
  }
  return count;
}

function shouldStopScan({ target, voiceOverSteps }) {
  const latestStep = voiceOverSteps.at(-1);
  const latestText = latestStep ? getCaptureText(latestStep) : "";
  const latestLower = latestText.toLowerCase();
  const latestAnnouncement = latestStep
    ? getComparisonVoiceOverText(latestStep).toLowerCase()
    : "";
  if (
    latestLower.includes(scanMarkerTexts.end.toLowerCase()) ||
    latestAnnouncement.includes(scanMarkerTexts.end.toLowerCase())
  ) {
    return { stop: true, reason: "scan-end-marker" };
  }

  const stopPhrase = getStopPhrases(target).find((phrase) =>
    latestLower.includes(phrase),
  );
  if (stopPhrase) {
    return { stop: true, reason: `stopWhen.voiceOverIncludes:${stopPhrase}` };
  }

  const desktopTailCount = getRepeatedTailCount(
    voiceOverSteps,
    (step) => isDesktopEmptyAnnouncement(step) && hasMissingChromeFocus(step),
  );
  if (desktopTailCount >= 8) {
    return {
      stop: true,
      reason: "stalled-on-desktop-chrome-focus-missing",
      fatal: true,
    };
  }

  return { stop: false, reason: "" };
}

function getNormalizedVoiceOverOutput(voiceOverSteps) {
  const filteredAnnouncements = voiceOverSteps
    .map(getComparisonVoiceOverText)
    .filter(Boolean)
    .filter(
      (announcement) =>
        !isSystemNoise(announcement) && !isRefinementNoise(announcement),
    );
  const hasStartMarker = filteredAnnouncements.some(
    (announcement) => getScanBoundary(announcement) === "start",
  );
  const announcements = [];
  let withinScan = !hasStartMarker;

  for (const announcement of filteredAnnouncements) {
    const boundary = getScanBoundary(announcement);
    if (boundary === "start") {
      withinScan = true;
      continue;
    }
    if (boundary === "end") {
      break;
    }
    if (withinScan && !isScanBoundaryMarker(announcement)) {
      announcements.push(announcement);
    }
  }

  while (
    announcements.length >= 2 &&
    announcements.at(-1) === announcements.at(-2)
  ) {
    announcements.pop();
  }

  return announcements;
}

function getVoiceOverSourceDebug(voiceOverSteps) {
  return voiceOverSteps.map((step) => ({
    index: step.index,
    chosenAnnouncement: getComparisonVoiceOverText(step),
    captionText: cleanCaptionOcrText(step.voiceOver?.captionText),
    captionContentText: cleanCaptionOcrText(step.voiceOver?.captionContentText),
    captionAxText: cleanCaptionOcrText(step.voiceOver?.captionAxText),
    captionUiText: cleanCaptionOcrText(step.voiceOver?.captionUiText),
    captionOcrText: cleanCaptionOcrText(step.voiceOver?.captionOcrText),
    captionWindowEnabled: step.voiceOver?.captionWindowEnabled || "",
    captionWindowEnabledError: step.voiceOver?.captionWindowEnabledError || "",
    captionWindowContentError: step.voiceOver?.captionWindowContentError || "",
    captionContentError: step.voiceOver?.captionContentError || "",
    lastPhrase: cleanCaptionOcrText(step.voiceOver?.lastPhrase),
    voCursorText: cleanCaptionOcrText(step.voiceOver?.voCursorText),
    focus: step.focus || {},
    captionAxDebug: step.voiceOver?.captionAxDebug || "",
    captionCgDebug: step.voiceOver?.captionCgDebug || "",
    captionUiDebug: step.voiceOver?.captionUiDebug || "",
    captionOcrDebug: step.voiceOver?.captionOcrDebug || "",
    captionWindowId: step.screenshots?.voiceOverCaptionOcr?.captionWindowId || "",
    captionWindowSource: step.screenshots?.voiceOverCaptionOcr?.source || "",
    captionWindowBounds:
      step.screenshots?.voiceOverCaptionOcr?.captionWindow?.parsed
        ?.captionWindowBounds || "",
    captionWindowDebug:
      step.screenshots?.voiceOverCaptionOcr?.captionWindow?.parsed
        ?.captionWindowDebug || "",
  }));
}

function writeVoiceOverProgressFiles({
  targetOutputDir,
  voiceOverSteps,
}) {
  const voiceOverOutput = getNormalizedVoiceOverOutput(voiceOverSteps);
  const sourceDebug = getVoiceOverSourceDebug(voiceOverSteps);

  writeJson(path.join(targetOutputDir, "voiceover-output.json"), {
    announcements: voiceOverOutput,
    source: "VoiceOver",
    normalization: "caption-window-cropped-ocr-system-noise-filtered",
    partial: true,
  });
  writeJson(path.join(targetOutputDir, "voiceover-sources.json"), {
    schemaVersion: 1,
    source: "voiceover-caption-source-debug",
    partial: true,
    steps: sourceDebug,
  });
}

function writeStepSnapshotsFile(targetOutputDir, stepSnapshots, partial = false) {
  if (!captureStepSnapshots) {
    return;
  }

  writeJson(path.join(targetOutputDir, "step-snapshots.json"), {
    schemaVersion: 1,
    source: "chrome-step-diagnostics",
    description:
      "Per-step VoiceOver diagnostics for comparing caption output with the live Chrome DOM and accessibility tree during the scan.",
    partial,
    snapshots: stepSnapshots,
  });
}

function createScanDebugSummary({
  target,
  summary,
  voiceOverOutput,
  reducedHtmlStats,
  accessibilityTreeStats,
}) {
  return {
    schemaVersion: 1,
    target: {
      name: summary.name,
      mode: summary.mode,
      url: summary.url,
      scanRootSelector: target.scanRootSelector || "[data-sr-scan-root]",
    },
    scan: {
      stopReason: summary.stopReason,
      partial: Boolean(summary.partial),
      failureReason: summary.failureReason || "",
      capturedSteps: summary.capturedSteps,
      maxStepSeconds: summary.maxStepSeconds,
      navigationMode: summary.navigationMode,
      startedAt: summary.startedAt,
      finishedAt: summary.finishedAt,
    },
    output: {
      voiceOverAnnouncementCount: voiceOverOutput.length,
      firstVoiceOverAnnouncement: voiceOverOutput[0] || "",
      lastVoiceOverAnnouncement: voiceOverOutput.at(-1) || "",
      voiceOverSourcesPath: "voiceover-sources.json",
      reducedHtmlStats,
      htmlSource: summary.sourceHtmlCapture?.source || "",
      htmlPath: "rendered-html.html",
      htmlReduced: true,
      accessibilityTreeSource: summary.accessibilityTreeCapture?.source || "",
      accessibilityTreePath: "accessibility-tree.json",
      stepSnapshotsPath: summary.stepSnapshots?.enabled
        ? "step-snapshots.json"
        : "",
      accessibilityTreeStats,
    },
    environment: {
      runnerEnvironmentPath: "runner-environment.json",
      runnerEnvironment: summary.runnerEnvironment,
    },
    setup: {
      launchChrome: summary.launchChrome,
      launchVoiceOver: summary.launchVoiceOver,
      prepareScanRootBeforeVoiceOver: summary.prepareScanRootBeforeVoiceOver,
      injectScanBoundaryMarkersBeforeVoiceOver:
        summary.injectScanBoundaryMarkersBeforeVoiceOver,
      prepareScanRootAfterVoiceOver: summary.prepareScanRootAfterVoiceOver,
      resetVoiceOverAfterLoad: summary.resetVoiceOverAfterLoad,
      interactWithWebContentBeforeScan: summary.interactWithWebContentBeforeScan,
      sourceHtmlCapture: summary.sourceHtmlCapture,
    },
    recording: summary.screenRecording,
    stepSnapshots: summary.stepSnapshots,
    consent: {
      browserBlockingOverlaysBeforeVoiceOver:
        summary.dismissBrowserBlockingOverlaysBeforeVoiceOver,
      pageConsentBeforeVoiceOver: summary.dismissPageConsentBeforeVoiceOver,
      pageConsentVisuallyBeforeVoiceOver:
        summary.dismissPageConsentVisuallyBeforeVoiceOver,
    },
  };
}

function createRefinementManifest({
  target,
  summary,
  voiceOverOutput,
  reducedHtmlStats,
  accessibilityTreeStats,
}) {
  return {
    schemaVersion: 1,
    target: {
      name: summary.name,
      mode: summary.mode,
      url: summary.url,
      scanRootSelector: target.scanRootSelector || "[data-sr-scan-root]",
    },
    scan: {
      stopReason: summary.stopReason,
      partial: Boolean(summary.partial),
      failureReason: summary.failureReason || "",
      capturedSteps: summary.capturedSteps,
      startedAt: summary.startedAt,
      finishedAt: summary.finishedAt,
    },
    files: {
      voiceOverOutput: "voiceover-output.json",
      voiceOverSources: "voiceover-sources.json",
      renderedHtml: "rendered-html.html",
      accessibilityTree: "accessibility-tree.json",
      scanDebug: "scan-debug.json",
      runnerEnvironment: "runner-environment.json",
      stepSnapshots: summary.stepSnapshots?.enabled ? "step-snapshots.json" : "",
    },
    environment: {
      browser: summary.runnerEnvironment?.browser?.value || null,
      publicNetwork: summary.runnerEnvironment?.publicNetwork || null,
      runnerEnvironment: "runner-environment.json",
      note:
        "Use runner-environment.json when comparing scans with local pages; geography, locale, timezone, user agent, and viewport can change rendered content and VoiceOver output.",
    },
    refinementNotes: [
      "Before creating regression tests, inspect VoiceOver announcements for capture artifacts.",
      "The start of a caption can occasionally include incorrect OCR punctuation or marker characters.",
      "Refine expected output only when the leading character is not supported by VoiceOver context, renderedHtml, or accessibility-tree.json.",
      "When rendered-html.html conflicts with VoiceOver output, inspect step-snapshots.json; if a step snapshot shows matching live Chrome AX/page state, prefer that evidence over final rendered HTML.",
    ],
    stats: {
      voiceOverAnnouncementCount: voiceOverOutput.length,
      reducedHtml: reducedHtmlStats,
      accessibilityTree: accessibilityTreeStats,
    },
  };
}

async function scanTarget(target, index) {
  const targetName = getTargetOutputName(target, index);
  const scanRootSelector = getScanRootSelector(target);
  const targetOutputDir = path.join(outputRoot, targetName);
  mkdirSync(targetOutputDir, { recursive: true });

  const url = getTargetUrl(target);
  const maxStepSeconds = getMaxStepSeconds(target);
  const summary = {
    name: targetName,
    mode: target.mode || "page",
    url,
    source: target.fixturePath ? "fixture" : "url",
    maxStepSeconds,
    navigationMode,
    startedAt: new Date().toISOString(),
  };

  const launchChromeResult = launchChrome(url);
  run("sleep", ["5"], { timeout: 7000 });
  const chromeViewportOverride = await applyChromeViewportOverride();
  const dismissBrowserBlockingOverlaysBeforeVoiceOver =
    await dismissBrowserBlockingOverlays(target, targetOutputDir);
  const lastOverlayAttempt =
    dismissBrowserBlockingOverlaysBeforeVoiceOver.attempts.at(-1) || {};
  const dismissChromeBeforeVoiceOver =
    lastOverlayAttempt.chromeDialogs || dismissChromeDialogs();
  const dismissSystemBeforeVoiceOver =
    lastOverlayAttempt.systemDialogs || dismissSystemDialogs();
  const dismissPageConsentBeforeVoiceOver =
    dismissBrowserBlockingOverlaysBeforeVoiceOver.domConsent ||
    (await dismissPageConsent(target));
  const dismissPageConsentVisuallyBeforeVoiceOver =
    dismissBrowserBlockingOverlaysBeforeVoiceOver.visualConsent || {
      skipped: true,
      reason: "visual consent handler was not needed",
    };
  run("sleep", ["1"], { timeout: 3000 });
  const prepareScanRootBeforeVoiceOver = await prepareScanRoot(
    target,
    scanRootSelector,
  );
  const injectScanBoundaryMarkersBeforeVoiceOver =
    await injectScanBoundaryMarkers(target, scanRootSelector);
  const launchVoiceOverResult = launchVoiceOver();
  run("sleep", ["5"], { timeout: 7000 });
  run("pkill", ["-x", "VoiceOver Quick"], { timeout: 5000 });
  activateChrome();
  const dismissChromeAfterVoiceOver = dismissChromeDialogs();
  const dismissSystemAfterVoiceOver = dismissSystemDialogs();
  activateChrome();
  const prepareScanRootAfterVoiceOver = await prepareScanRoot(
    target,
    scanRootSelector,
  );
  run("sleep", ["1"], { timeout: 3000 });
  const screenRecording = startScreenRecording();
  const resetVoiceOverAfterLoad = await focusScanStartMarker(target);
  run("sleep", ["2"], { timeout: 4000 });
  const interactWithWebContentBeforeScan = interactWithVoiceOverItem();
  run("sleep", ["1"], { timeout: 3000 });

  const voiceOverSteps = [];
  const stepSnapshots = [];
  let stopReason = "not-stopped";
  let failureReason = "";

  const initialStepStartedAt = Date.now();
  const initialCaptionOcr = captureVoiceOverCaptionOcrBurst(targetOutputDir, 0);
  const initialDismissSystem = dismissSystemDialogs();
  const initialVoiceOverCapture = captureVoiceOverStateWithRecovery(
    targetOutputDir,
    0,
  );
  const initialVoiceOverRaw = initialVoiceOverCapture.voiceOverRaw;
  const initialCaptionAxRaw = captureVoiceOverCaptionAxState();
  const initialCaptionUiRaw = captureVoiceOverCaptionUiState();
  const initialFocusRaw = captureChromeFocus();
  const initialFocus = parseVoiceOverText(initialFocusRaw.stdout || "");
  const initialVoiceOver = {
    ...parseVoiceOverText(initialVoiceOverRaw.stdout || ""),
    ...parseVoiceOverText(initialCaptionAxRaw.stdout || ""),
    ...parseVoiceOverText(initialCaptionUiRaw.stdout || ""),
    ...initialCaptionOcr.parsed,
  };
  const initialScreenshots = { ...initialVoiceOverCapture.screenshots };
  initialScreenshots.voiceOverCaptionOcr = initialCaptionOcr.screenshot;
  if (captureStepScreenshots) {
    initialScreenshots.step = captureScreenshot(targetOutputDir, 0, "step", {
      persist: true,
    });
  }
  voiceOverSteps.push({
    index: 0,
    timing: getStepTiming(initialStepStartedAt, maxStepSeconds),
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
    captionAxRaw: initialCaptionAxRaw,
    captionUiRaw: initialCaptionUiRaw,
    captionOcrRaw: initialCaptionOcr.ocr,
    captionOcrAttempts: initialCaptionOcr.attempts,
    voiceOver: initialVoiceOver,
    focusRaw: initialFocusRaw,
    focus: initialFocus,
    recovery: null,
    voiceOverRawAttempts: initialVoiceOverCapture.attempts,
    dismissSystemAfterScreenshot: initialVoiceOverCapture.dismissals,
    screenshots: initialScreenshots,
  });
  writeVoiceOverProgressFiles({
    targetOutputDir,
    voiceOverSteps,
  });
  const initialSnapshot = await captureStepSnapshot({
    target,
    stepIndex: 0,
    announcement: getComparisonVoiceOverText(voiceOverSteps.at(-1)),
    focus: initialFocus,
  });
  if (initialSnapshot) {
    stepSnapshots.push(initialSnapshot);
    writeStepSnapshotsFile(targetOutputDir, stepSnapshots, true);
  }

  for (let index = 0; ; index += 1) {
    const stepStartedAt = Date.now();
    const navigation = navigateRight();
    const stepNumber = index + 1;
    const captionOcr = captureVoiceOverCaptionOcrBurst(targetOutputDir, stepNumber);
    const dismissSystemAfterNavigation = dismissSystemDialogs();
    const voiceOverCapture = captureVoiceOverStateWithRecovery(
      targetOutputDir,
      stepNumber,
    );
    const voiceOverRaw = voiceOverCapture.voiceOverRaw;
    const captionAxRaw = captureVoiceOverCaptionAxState();
    const captionUiRaw = captureVoiceOverCaptionUiState();
    const focusRaw = captureChromeFocus();
    const focus = parseVoiceOverText(focusRaw.stdout || "");
    const voiceOver = {
      ...parseVoiceOverText(voiceOverRaw.stdout || ""),
      ...parseVoiceOverText(captionAxRaw.stdout || ""),
      ...parseVoiceOverText(captionUiRaw.stdout || ""),
      ...captionOcr.parsed,
    };
    const screenshots = { ...voiceOverCapture.screenshots };
    screenshots.voiceOverCaptionOcr = captionOcr.screenshot;
    if (captureStepScreenshots) {
      screenshots.step = captureScreenshot(targetOutputDir, stepNumber, "step", {
        persist: true,
      });
    }

    voiceOverSteps.push({
      index: stepNumber,
      timing: getStepTiming(stepStartedAt, maxStepSeconds),
      navigation,
      dismissSystemAfterNavigation,
      voiceOverRaw,
      captionAxRaw,
      captionUiRaw,
      captionOcrRaw: captionOcr.ocr,
      captionOcrAttempts: captionOcr.attempts,
      voiceOver,
      focusRaw,
      focus,
      recovery: null,
      voiceOverRawAttempts: voiceOverCapture.attempts,
      dismissSystemAfterScreenshot: voiceOverCapture.dismissals,
      screenshots,
    });
    writeVoiceOverProgressFiles({
      targetOutputDir,
      voiceOverSteps,
    });
    const stepSnapshot = await captureStepSnapshot({
      target,
      stepIndex: stepNumber,
      announcement: getComparisonVoiceOverText(voiceOverSteps.at(-1)),
      focus,
    });
    if (stepSnapshot) {
      stepSnapshots.push(stepSnapshot);
      writeStepSnapshotsFile(targetOutputDir, stepSnapshots, true);
    }

    const stopCheck = shouldStopScan({
      target,
      voiceOverSteps,
    });
    if (stopCheck.stop) {
      stopReason = stopCheck.reason;
      if (stopCheck.fatal) {
        failureReason = stopCheck.reason;
      }
      break;
    }

  }
  activateChrome();
  run("sleep", ["1"], { timeout: 3000 });
  const screenRecordingResult = await stopScreenRecording(screenRecording);
  writeJson(
    path.join(repoRoot, "voiceover-smoke/screen-recording.json"),
    screenRecordingResult,
  );

  summary.finishedAt = new Date().toISOString();
  summary.stopReason = stopReason;
  summary.partial = Boolean(failureReason);
  summary.failureReason = failureReason;
  summary.capturedSteps = voiceOverSteps.length;
  summary.screenRecording = screenRecordingResult;
  summary.launchChrome = launchChromeResult;
  summary.chromeViewportOverride = chromeViewportOverride;
  summary.dismissChromeBeforeVoiceOver = dismissChromeBeforeVoiceOver;
  summary.dismissSystemBeforeVoiceOver = dismissSystemBeforeVoiceOver;
  summary.dismissBrowserBlockingOverlaysBeforeVoiceOver =
    dismissBrowserBlockingOverlaysBeforeVoiceOver;
  summary.dismissPageConsentBeforeVoiceOver =
    dismissPageConsentBeforeVoiceOver;
  summary.dismissPageConsentVisuallyBeforeVoiceOver =
    dismissPageConsentVisuallyBeforeVoiceOver;
  summary.prepareScanRootBeforeVoiceOver = prepareScanRootBeforeVoiceOver;
  summary.injectScanBoundaryMarkersBeforeVoiceOver =
    injectScanBoundaryMarkersBeforeVoiceOver;
  summary.launchVoiceOver = launchVoiceOverResult;
  summary.dismissChromeAfterVoiceOver = dismissChromeAfterVoiceOver;
  summary.dismissSystemAfterVoiceOver = dismissSystemAfterVoiceOver;
  summary.prepareScanRootAfterVoiceOver = prepareScanRootAfterVoiceOver;
  summary.resetVoiceOverAfterLoad = resetVoiceOverAfterLoad;
  summary.interactWithWebContentBeforeScan = interactWithWebContentBeforeScan;
  summary.captureStepScreenshots = captureStepScreenshots;
  summary.stepSnapshots = {
    enabled: captureStepSnapshots,
    capturedSteps: stepSnapshots.length,
  };
  summary.runnerEnvironment = await captureRunnerEnvironment();
  const voiceOverOutput = getNormalizedVoiceOverOutput(voiceOverSteps);
  const sourceHtmlArtifact = await getArtifactSourceHtml(target);
  const sourceHtml = sourceHtmlArtifact.html;
  summary.sourceHtmlCapture = {
    source: sourceHtmlArtifact.capture.source,
    ok: sourceHtmlArtifact.capture.ok,
    status: sourceHtmlArtifact.capture.status,
    signal: sourceHtmlArtifact.capture.signal,
    stderr: sourceHtmlArtifact.capture.stderr,
    error: sourceHtmlArtifact.capture.error,
    length: sourceHtml.length,
  };
  const reducedHtml = reduceHtmlForRefinement(sourceHtml, target);
  const accessibilityTreeArtifact = await captureAccessibilityTree(target);
  const accessibilityTree = accessibilityTreeArtifact.tree;
  summary.accessibilityTreeCapture = {
    source: accessibilityTreeArtifact.source,
    ok: accessibilityTreeArtifact.capture.ok,
    status: accessibilityTreeArtifact.capture.status,
    signal: accessibilityTreeArtifact.capture.signal,
    stderr: accessibilityTreeArtifact.capture.stderr,
    error: accessibilityTreeArtifact.capture.error,
    nodeCount: accessibilityTree.nodeCount || 0,
    ignoredNodeCount: accessibilityTree.ignoredNodeCount || 0,
    axMappedNodeCount: accessibilityTree.axMappedNodeCount || 0,
    domSnapshotMappedNodeCount:
      accessibilityTree.domSnapshotMappedNodeCount || 0,
    domNodeMapOk: accessibilityTreeArtifact.domNodeMapCapture?.ok ?? null,
    domNodeMapStderr: accessibilityTreeArtifact.domNodeMapCapture?.stderr || "",
    domNodeMapError: accessibilityTreeArtifact.domNodeMapCapture?.error || "",
  };
  const accessibilityTreeStats = {
    nodeCount: accessibilityTree.nodeCount || 0,
    ignoredNodeCount: accessibilityTree.ignoredNodeCount || 0,
    axMappedNodeCount: accessibilityTree.axMappedNodeCount || 0,
    domSnapshotMappedNodeCount:
      accessibilityTree.domSnapshotMappedNodeCount || 0,
  };

  writeText(path.join(targetOutputDir, "rendered-html.html"), reducedHtml.html);
  writeJson(
    path.join(targetOutputDir, "accessibility-tree.json"),
    accessibilityTree,
  );
  writeJson(
    path.join(targetOutputDir, "runner-environment.json"),
    summary.runnerEnvironment,
  );
  writeStepSnapshotsFile(targetOutputDir, stepSnapshots, Boolean(failureReason));
  writeJson(path.join(targetOutputDir, "voiceover-output.json"), {
    announcements: voiceOverOutput,
    source: "VoiceOver",
    normalization: "caption-window-cropped-ocr-system-noise-filtered",
    partial: Boolean(failureReason) || undefined,
  });
  writeJson(path.join(targetOutputDir, "voiceover-sources.json"), {
    schemaVersion: 1,
    source: "voiceover-caption-source-debug",
    partial: Boolean(failureReason),
    steps: getVoiceOverSourceDebug(voiceOverSteps),
  });
  writeJson(
    path.join(targetOutputDir, "scan-debug.json"),
    createScanDebugSummary({
      target,
      summary,
      voiceOverOutput,
      reducedHtmlStats: reducedHtml.stats,
      accessibilityTreeStats,
    }),
  );
  writeJson(
    path.join(targetOutputDir, "refinement-manifest.json"),
    createRefinementManifest({
      target,
      summary,
      voiceOverOutput,
      reducedHtmlStats: reducedHtml.stats,
      accessibilityTreeStats,
    }),
  );

  if (failureReason) {
    throw new Error(`VoiceOver scan failed for ${targetName}: ${failureReason}`);
  }
}

mkdirSync(outputRoot, { recursive: true });

if (!scanManifestPath) {
  throw new Error("VOICEOVER_SCAN_MANIFEST is required for URL scans.");
}

const screenRecordingPreflight = await preflightScreenRecordingPermission();
writeJson(
  path.join(repoRoot, "voiceover-smoke/screen-recording-preflight.json"),
  screenRecordingPreflight,
);
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
