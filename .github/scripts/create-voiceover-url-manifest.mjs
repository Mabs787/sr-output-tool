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

Options:
  --url <url>       Add one URL. Can be repeated.
  --urls <urls>     Add newline, comma, or space separated URLs.
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

function normalizeUrl(value) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error(`Only http and https URLs are supported: ${value}`);
  }
  return url.href;
}

function getTargetName(url, index) {
  const parsed = new URL(url);
  const name = `${parsed.hostname}${parsed.pathname}`
    .replace(/\/$/, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return name || `url-${index + 1}`;
}

function createManifest(urls) {
  return urls.map((url, index) => ({
    name: getTargetName(url, index),
    mode: "page",
    url,
    scanRootSelector: "body",
    refinement: {
      minVoiceOverAnnouncements: 1,
    },
    maxStepSeconds: 30,
    maxSteps: 160,
    stopWhen: {
      repeatedNormalizedOutput: true,
    },
  }));
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const urls = options.urls.map(normalizeUrl);
  if (!urls.length) {
    throw new Error("At least one URL is required.");
  }

  const manifest = createManifest(urls);
  mkdirSync(path.dirname(options.output), { recursive: true });
  writeFileSync(options.output, `${JSON.stringify(manifest, null, 2)}\n`);
  if (options.matrixOutput) {
    const matrix = {
      include: manifest.map((target) => ({
        name: target.name,
        url: target.url,
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
