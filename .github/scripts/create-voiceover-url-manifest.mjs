import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const defaultOutputPath = path.join(
  repoRoot,
  "voiceover-smoke/url-manifest.json",
);

function parseArgs(argv) {
  const options = {
    output: defaultOutputPath,
    matrixOutput: "",
    urls: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--output") {
      options.output = path.resolve(repoRoot, argv[index + 1] || "");
      index += 1;
    } else if (arg === "--matrix-output") {
      options.matrixOutput = path.resolve(repoRoot, argv[index + 1] || "");
      index += 1;
    } else if (arg === "--url") {
      options.urls.push(argv[index + 1] || "");
      index += 1;
    } else if (arg === "--urls") {
      options.urls.push(...splitUrls(argv[index + 1] || ""));
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      options.urls.push(arg);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Usage:
  node .github/scripts/create-voiceover-url-manifest.mjs --urls "https://example.com"
  node .github/scripts/create-voiceover-url-manifest.mjs --urls "docs/repros/example.html"

Options:
  --url <target>    Add one URL or repo-local fixture path. Can be repeated.
  --urls <targets>  Add newline, comma, or space separated URLs/fixture paths.
  --output <path>   Manifest output path. Defaults to ./voiceover-smoke/url-manifest.json
  --matrix-output <path>
                    Also write a GitHub Actions matrix JSON file.
  --help            Show this help
`);
}

function splitUrls(value) {
  return String(value)
    .split(/[\s,]+/)
    .map((url) => url.trim())
    .filter(Boolean);
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function normalizeFixturePath(value) {
  const normalized = path.normalize(String(value || "").trim());
  if (!normalized || normalized.startsWith("..") || path.isAbsolute(normalized)) {
    throw new Error(`Fixture paths must be repo-relative: ${value}`);
  }
  return normalized;
}

function createTarget(value) {
  if (isHttpUrl(value)) {
    return {
      mode: "page",
      url: new URL(value).href,
      scanRootSelector: "body",
    };
  }

  return {
    mode: "page",
    fixturePath: normalizeFixturePath(value),
    scanRootSelector: "[data-sr-scan-root]",
  };
}

function getTargetName(target, index) {
  if (target.fixturePath) {
    const name = target.fixturePath
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();
    return name || `fixture-${index + 1}`;
  }

  const url = target.url;
  const parsed = new URL(url);
  const name = `${parsed.hostname}${parsed.pathname}`
    .replace(/\/$/, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return name || `url-${index + 1}`;
}

function createManifest(inputs) {
  return inputs.map((input, index) => {
    const target = createTarget(input);
    return {
      name: getTargetName(target, index),
      ...target,
      refinement: {
        minVoiceOverAnnouncements: 1,
      },
    };
  });
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const inputs = options.urls.map((value) => String(value || "").trim()).filter(Boolean);
  if (!inputs.length) {
    throw new Error("At least one URL or fixture path is required.");
  }

  const manifest = createManifest(inputs);
  mkdirSync(path.dirname(options.output), { recursive: true });
  writeFileSync(options.output, `${JSON.stringify(manifest, null, 2)}\n`);
  if (options.matrixOutput) {
    const matrix = {
      include: manifest.map((target) => ({
        name: target.name,
        input: target.url || target.fixturePath,
      })),
    };
    mkdirSync(path.dirname(options.matrixOutput), { recursive: true });
    writeFileSync(options.matrixOutput, `${JSON.stringify(matrix, null, 2)}\n`);
  }
  console.log(
    `Wrote ${manifest.length} URL scan target(s) to ${path.relative(repoRoot, options.output)}`,
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
