#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const defaultRoots = [
  "packages/sr-engine/tests/fixtures/voiceover",
  "packages/sr-engine/tests/fixtures/voiceover-repros",
];

const modernHtmlElements = [
  "a",
  "abbr",
  "address",
  "area",
  "article",
  "aside",
  "audio",
  "b",
  "base",
  "bdi",
  "bdo",
  "blockquote",
  "body",
  "br",
  "button",
  "canvas",
  "caption",
  "cite",
  "code",
  "col",
  "colgroup",
  "data",
  "datalist",
  "dd",
  "del",
  "details",
  "dfn",
  "dialog",
  "div",
  "dl",
  "dt",
  "em",
  "embed",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "hgroup",
  "hr",
  "html",
  "i",
  "iframe",
  "img",
  "input",
  "ins",
  "kbd",
  "label",
  "legend",
  "li",
  "link",
  "main",
  "map",
  "mark",
  "math",
  "menu",
  "meta",
  "meter",
  "nav",
  "noscript",
  "object",
  "ol",
  "optgroup",
  "option",
  "output",
  "p",
  "picture",
  "portal",
  "pre",
  "progress",
  "q",
  "rp",
  "rt",
  "ruby",
  "s",
  "samp",
  "script",
  "search",
  "section",
  "select",
  "slot",
  "small",
  "source",
  "span",
  "strong",
  "style",
  "sub",
  "summary",
  "sup",
  "svg",
  "table",
  "tbody",
  "td",
  "template",
  "textarea",
  "tfoot",
  "th",
  "thead",
  "time",
  "title",
  "tr",
  "track",
  "u",
  "ul",
  "var",
  "video",
  "wbr",
];

const deprecatedHtmlElements = [
  "acronym",
  "applet",
  "basefont",
  "bgsound",
  "big",
  "blink",
  "center",
  "content",
  "dir",
  "font",
  "frame",
  "frameset",
  "image",
  "keygen",
  "marquee",
  "menuitem",
  "nobr",
  "noembed",
  "noframes",
  "param",
  "plaintext",
  "rb",
  "rtc",
  "shadow",
  "spacer",
  "strike",
  "tt",
  "xmp",
];

const priorityMissing = new Set([
  "address",
  "area",
  "audio",
  "canvas",
  "col",
  "colgroup",
  "data",
  "datalist",
  "del",
  "dfn",
  "dialog",
  "ins",
  "map",
  "mark",
  "math",
  "meter",
  "optgroup",
  "output",
  "progress",
  "q",
  "ruby",
  "rt",
  "rp",
  "samp",
  "sub",
  "tfoot",
  "track",
  "var",
]);

function parseArgs(argv) {
  const options = {
    includeDrafts: false,
    json: false,
    roots: [...defaultRoots],
    top: 30,
    rareFileThreshold: 2,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") {
      options.json = true;
    } else if (arg === "--include-drafts") {
      options.includeDrafts = true;
    } else if (arg === "--root") {
      options.roots.push(argv[++index]);
    } else if (arg === "--only-root") {
      options.roots = [argv[++index]];
    } else if (arg === "--top") {
      options.top = Number.parseInt(argv[++index], 10);
    } else if (arg === "--rare-file-threshold") {
      options.rareFileThreshold = Number.parseInt(argv[++index], 10);
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Usage: yarn voiceover:element-coverage [options]

Options:
  --json                         Print machine-readable JSON.
  --include-drafts               Include draft scan-target HTML files.
  --root <path>                  Add another HTML fixture root to scan.
  --only-root <path>             Scan only this root.
  --top <number>                 Number of most common tags to print. Default: 30.
  --rare-file-threshold <number> File-count cutoff for rare covered tags. Default: 2.
  -h, --help                     Show this help.
`);
}

function walkHtmlFiles(root) {
  const absoluteRoot = path.resolve(repoRoot, root);
  if (!existsSync(absoluteRoot)) return [];

  const files = [];
  const stack = [absoluteRoot];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
      } else if (entry.isFile() && entry.name.endsWith(".html")) {
        files.push(entryPath);
      }
    }
  }
  return files.sort((left, right) => left.localeCompare(right));
}

function tagNameFromMatch(rawName) {
  const lower = rawName.toLowerCase();
  return lower.includes(":") ? lower.split(":").pop() : lower;
}

function relativeFromRepo(filePath) {
  return path.relative(repoRoot, filePath);
}

function isDraftFixture(html) {
  return /\bdata-sr-fixture-status\s*=\s*["']draft["']/.test(html);
}

function analyze(options) {
  const modernSet = new Set(modernHtmlElements);
  const deprecatedSet = new Set(deprecatedHtmlElements);
  const tagCounts = new Map();
  const filesByTag = new Map();
  const roots = [...new Set(options.roots)];
  const htmlFiles = roots.flatMap(walkHtmlFiles);
  const scannedFiles = [];
  const skippedDraftFiles = [];

  for (const file of htmlFiles) {
    const html = readFileSync(file, "utf8");
    if (!options.includeDrafts && isDraftFixture(html)) {
      skippedDraftFiles.push(relativeFromRepo(file));
      continue;
    }

    scannedFiles.push(file);
    for (const match of html.matchAll(/<\s*([a-zA-Z][a-zA-Z0-9:-]*)\b/g)) {
      const tag = tagNameFromMatch(match[1]);
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      if (!filesByTag.has(tag)) {
        filesByTag.set(tag, new Set());
      }
      filesByTag.get(tag).add(relativeFromRepo(file));
    }
  }

  const covered = modernHtmlElements.filter((tag) => tagCounts.has(tag));
  const missing = modernHtmlElements.filter((tag) => !tagCounts.has(tag));
  const importantMissing = missing.filter((tag) => priorityMissing.has(tag));
  const lowPriorityMissing = missing.filter((tag) => !priorityMissing.has(tag));
  const deprecatedCovered = deprecatedHtmlElements.filter((tag) => tagCounts.has(tag));
  const custom = [...tagCounts.keys()]
    .filter((tag) => !modernSet.has(tag) && !deprecatedSet.has(tag))
    .sort();

  const sample = (tag, limit = 3) =>
    [...(filesByTag.get(tag) || [])].sort().slice(0, limit);

  const rareCovered = covered
    .filter((tag) => filesByTag.get(tag).size <= options.rareFileThreshold)
    .sort()
    .map((tag) => ({
      tag,
      count: tagCounts.get(tag),
      files: filesByTag.get(tag).size,
      sample: sample(tag),
    }));

  const top = [...tagCounts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, options.top)
    .map(([tag, count]) => ({
      tag,
      count,
      files: filesByTag.get(tag).size,
      sample: sample(tag),
    }));

  return {
    roots,
    htmlFileCount: scannedFiles.length,
    skippedDraftFileCount: skippedDraftFiles.length,
    skippedDraftFiles,
    includeDrafts: options.includeDrafts,
    modernElementSetCount: modernHtmlElements.length,
    coveredCount: covered.length,
    missingCount: missing.length,
    coveragePercent: Number(((covered.length / modernHtmlElements.length) * 100).toFixed(1)),
    importantMissing,
    lowPriorityMissing,
    deprecatedCovered,
    customCount: custom.length,
    custom,
    rareCovered,
    top,
  };
}

function printMarkdown(report) {
  console.log("# VoiceOver HTML Element Coverage\n");
  console.log(`Roots: ${report.roots.map((root) => `\`${root}\``).join(", ")}`);
  console.log(`HTML files scanned: ${report.htmlFileCount}`);
  if (report.skippedDraftFileCount) {
    console.log(
      `Draft scan-target files skipped: ${report.skippedDraftFileCount} (use \`--include-drafts\` to include them)`,
    );
  }
  console.log(
    `Modern HTML elements covered: ${report.coveredCount}/${report.modernElementSetCount} (${report.coveragePercent}%)`,
  );
  console.log(`Missing modern HTML elements: ${report.missingCount}`);
  console.log(`Custom/web-component/SVG-ish tags found: ${report.customCount}\n`);

  console.log("## Priority Missing Elements\n");
  console.log(
    report.importantMissing.length
      ? report.importantMissing.map((tag) => `- \`${tag}\``).join("\n")
      : "None.",
  );

  console.log("\n## Lower-Priority Missing Elements\n");
  console.log(
    report.lowPriorityMissing.length
      ? report.lowPriorityMissing.map((tag) => `- \`${tag}\``).join("\n")
      : "None.",
  );

  console.log("\n## Rare Covered Elements\n");
  if (!report.rareCovered.length) {
    console.log("None.");
  } else {
    for (const entry of report.rareCovered) {
      console.log(
        `- \`${entry.tag}\`: ${entry.count} occurrences in ${entry.files} file(s); e.g. ${entry.sample
          .map((file) => `\`${file}\``)
          .join(", ")}`,
      );
    }
  }

  console.log("\n## Most Common Tags\n");
  for (const entry of report.top) {
    console.log(`- \`${entry.tag}\`: ${entry.count} occurrences in ${entry.files} file(s)`);
  }

  if (report.deprecatedCovered.length) {
    console.log("\n## Deprecated Elements Present\n");
    console.log(report.deprecatedCovered.map((tag) => `- \`${tag}\``).join("\n"));
  }
}

try {
  const options = parseArgs(process.argv.slice(2));
  const report = analyze(options);
  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printMarkdown(report);
  }
} catch (error) {
  console.error(error?.message || String(error));
  process.exitCode = 1;
}
