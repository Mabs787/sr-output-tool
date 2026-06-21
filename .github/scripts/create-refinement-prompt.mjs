import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const defaultArtifactDir = path.join(repoRoot, "voiceover-scan-artifacts");
const defaultOutputDir = path.join(repoRoot, "voiceover-smoke/refinement-prompts");

function parseArgs(argv) {
  const options = {
    artifactDir: defaultArtifactDir,
    outputDir: defaultOutputDir,
    target: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--artifact-dir") {
      options.artifactDir = path.resolve(repoRoot, argv[index + 1] || "");
      index += 1;
    } else if (arg === "--output-dir") {
      options.outputDir = path.resolve(repoRoot, argv[index + 1] || "");
      index += 1;
    } else if (arg === "--target") {
      options.target = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--list") {
      options.list = true;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Usage:
  node .github/scripts/create-refinement-prompt.mjs --target www-example-com-page

Options:
  --artifact-dir <path>   Diagnostics folder to inspect. Defaults to ./voiceover-scan-artifacts
  --output-dir <path>     Prompt output folder. Defaults to ./voiceover-smoke/refinement-prompts
  --target <name>         Eligible scan target to build a prompt for
  --list                  List eligible and skipped targets
  --help                  Show this help
`);
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function collectFiles(dir, fileName, results = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(entryPath, fileName, results);
    } else if (entry.name === fileName) {
      results.push(entryPath);
    }
  }

  return results;
}

function resolveManifestFile(scanDir, manifest, key) {
  const relativePath = manifest.files?.[key] || "";
  return relativePath ? path.join(scanDir, relativePath) : "";
}

function getPayloads(artifactDir) {
  if (!existsSync(artifactDir)) {
    throw new Error(`${path.relative(repoRoot, artifactDir)} was not found.`);
  }

  const entries = collectFiles(artifactDir, "refinement-manifest.json")
    .map((manifestPath) => {
      const scanDir = path.dirname(manifestPath);
      const manifest = readJson(manifestPath);
      const voiceOverPath = resolveManifestFile(scanDir, manifest, "voiceOverOutput");
      const renderedHtmlPath = resolveManifestFile(scanDir, manifest, "renderedHtml");
      const accessibilityTreePath = resolveManifestFile(
        scanDir,
        manifest,
        "accessibilityTree",
      );
      const scanDebugPath = resolveManifestFile(scanDir, manifest, "scanDebug");
      const voiceOverSourcesPath = resolveManifestFile(
        scanDir,
        manifest,
        "voiceOverSources",
      );
      const stepSnapshotsPath = resolveManifestFile(scanDir, manifest, "stepSnapshots");
      const missingFiles = [
        voiceOverPath,
        renderedHtmlPath,
        accessibilityTreePath,
        scanDebugPath,
      ].filter((filePath) => !existsSync(filePath));
      const voiceOverOutput = existsSync(voiceOverPath)
        ? readJson(voiceOverPath).announcements || []
        : [];
      const skipReasons = [];

      if (missingFiles.length) {
        skipReasons.push(
          `Missing artifact file(s): ${missingFiles
            .map((filePath) => path.relative(scanDir, filePath))
            .join(", ")}.`,
        );
      }
      if (manifest.scan?.stopReason !== "scan-end-marker") {
        skipReasons.push(
          `Scan stop reason was ${manifest.scan?.stopReason || "unknown"}.`,
        );
      }
      if (!voiceOverOutput.length) {
        skipReasons.push("VoiceOver output is empty.");
      }

      return {
        name: path.basename(scanDir),
        manifestPath,
        scanDir,
        manifest,
        voiceOverPath,
        renderedHtmlPath,
        accessibilityTreePath,
        scanDebugPath,
        voiceOverSourcesPath,
        stepSnapshotsPath,
        voiceOverOutput,
        skipReasons,
        eligible: skipReasons.length === 0,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));

  if (!entries.length) {
    throw new Error(
      `No refinement-manifest.json files were found in ${path.relative(repoRoot, artifactDir)}.`,
    );
  }

  return entries;
}

function formatList(items) {
  if (!items.length) {
    return "(none)";
  }

  return items.map((item, index) => `${index + 1}. ${item}`).join("\n");
}

function summarizeAccessibilityTree(accessibilityTree) {
  const nodes = accessibilityTree.nodes || [];
  const visibleNodes = nodes.filter((node) => !node.ignored);
  const interestingNodes = visibleNodes
    .filter((node) => node.role || node.name)
    .slice(0, 250)
    .map((node) => ({
      role: node.role,
      name: node.name,
      properties: node.properties,
      renderedHtmlSelector: node.renderedHtmlSelector,
    }));

  return {
    nodeCount: accessibilityTree.nodeCount,
    ignoredNodeCount: accessibilityTree.ignoredNodeCount,
    axMappedNodeCount: accessibilityTree.axMappedNodeCount,
    nodes: interestingNodes,
  };
}

function summarizeVoiceOverSources(voiceOverSources) {
  const steps = voiceOverSources.steps || [];
  return {
    source: voiceOverSources.source || "",
    partial: Boolean(voiceOverSources.partial),
    stepCount: steps.length,
    steps: steps.slice(0, 350).map((step) => ({
      index: step.index,
      chosenAnnouncement: step.chosenAnnouncement,
      captionText: step.captionText,
      captionContentText: step.captionContentText,
      captionAxText: step.captionAxText,
      captionUiText: step.captionUiText,
      captionOcrText: step.captionOcrText,
      voCursorText: step.voCursorText,
      lastPhrase: step.lastPhrase,
      focus: step.focus,
      captionWindowSource: step.captionWindowSource,
      captionWindowContentError: step.captionWindowContentError,
      captionContentError: step.captionContentError,
    })),
  };
}

function summarizeStepSnapshots(stepSnapshots) {
  const snapshots = stepSnapshots.snapshots || [];
  return {
    source: stepSnapshots.source || "",
    partial: Boolean(stepSnapshots.partial),
    snapshotCount: snapshots.length,
    snapshots: snapshots.slice(0, 300).map((snapshot) => ({
      index: snapshot.index,
      announcement: snapshot.announcement,
      url: snapshot.pageState?.url || "",
      scroll: snapshot.pageState?.scroll,
      activeElement: snapshot.pageState?.activeElement
        ? {
            tagName: snapshot.pageState.activeElement.tagName,
            attributes: snapshot.pageState.activeElement.attributes,
            text: snapshot.pageState.activeElement.text,
            computed: snapshot.pageState.activeElement.computed,
            rect: snapshot.pageState.activeElement.rect,
            html: snapshot.pageState.activeElement.html,
          }
        : null,
      activeElementAncestors:
        snapshot.pageState?.activeElementAncestors?.slice(0, 4).map((node) => ({
          tagName: node.tagName,
          attributes: node.attributes,
          text: node.text,
          computed: node.computed,
          rect: node.rect,
        })) || [],
      matchedDomElements:
        snapshot.pageState?.matchedDomElements?.slice(0, 8).map((node) => ({
          score: node.score,
          tagName: node.tagName,
          attributes: node.attributes,
          text: node.text,
          computed: node.computed,
          rect: node.rect,
          html: node.html,
          ancestors: node.ancestors?.slice(0, 4).map((ancestor) => ({
            tagName: ancestor.tagName,
            attributes: ancestor.attributes,
            text: ancestor.text,
            computed: ancestor.computed,
            rect: ancestor.rect,
          })),
        })) || [],
      matchedAccessibilityNodes:
        snapshot.accessibility?.matchedNodes?.slice(0, 8).map((node) => ({
          score: node.score,
          role: node.role,
          name: node.name,
          properties: node.properties,
          renderedHtmlSelector: node.renderedHtmlSelector,
        })) || [],
    })),
  };
}

function createPrompt(entry) {
  const {
    name,
    manifestPath,
    manifest,
    voiceOverOutput,
    renderedHtmlPath,
    accessibilityTreePath,
    voiceOverSourcesPath,
    stepSnapshotsPath,
  } = entry;
  const renderedHtml = readFileSync(renderedHtmlPath, "utf8");
  const accessibilityTree = readJson(accessibilityTreePath);
  const voiceOverSources =
    voiceOverSourcesPath && existsSync(voiceOverSourcesPath)
      ? readJson(voiceOverSourcesPath)
      : null;
  const stepSnapshots =
    stepSnapshotsPath && existsSync(stepSnapshotsPath)
      ? readJson(stepSnapshotsPath)
      : null;

  return `# SR Engine Refinement Request

Use this VoiceOver capture, VoiceOver source diagnostics, rendered HTML, Chrome accessibility tree, and optional step snapshots to first refine the expected VoiceOver output, then refine the SR Output Tool engine.

## Target

- Name: ${name}
- Manifest: ${path.relative(repoRoot, manifestPath)}
- URL: ${manifest.target?.url || ""}
- Scan root: ${manifest.target?.scanRootSelector || ""}

## Eligibility

- Eligible: ${entry.eligible}
- Skip reasons: ${entry.skipReasons.join("; ") || "none"}

If \`Eligible\` is false, stop and do not change code.

## Constraints

- Treat raw \`voiceover-output.json\` as the primary VoiceOver evidence and the default source of truth for what VoiceOver announced.
- First create or update fixture \`refinedAnnouncements\` from raw VoiceOver plus \`voiceover-sources.json\`, rendered HTML, AX tree, and step snapshots.
- Preserve raw \`expectedAnnouncements\`; put corrected output in \`refinedAnnouncements\`.
- Keep raw VoiceOver wording unless there is clear capture corruption such as OCR text drift, truncation, system noise, duplicated captions, or a scan boundary artifact.
- Use \`voCursorText\`, focused AX role/name, matched AX node, step snapshot DOM, and rendered HTML to explain or repair capture noise, not to replace valid VoiceOver output with what the engine currently expects.
- Prefer step-snapshot evidence over final rendered HTML when the page state differs at the moment VoiceOver announced an element.
- If VoiceOver announces surprising but page-backed text, keep it and treat it as engine/page evidence. For example, an announcement like \`link, undefined page link\` should be preserved when live ARIA evidence shows \`aria-label="undefined page link"\`.
- If a correction is not backed by clear capture-noise evidence, mark it as an engine gap or page-authored output instead of changing the fixture.
- After fixture refinement, compare the current engine output with \`refinedAnnouncements\`.
- Update only the necessary \`sr-engine\` logic for reusable VoiceOver behavior gaps.
- Prefer the smallest defensible change.
- Add or update only the relevant regression test.
- Do not update unrelated tests.
- Do not edit generated artifacts.
- Reason from VoiceOver output, rendered HTML, the Chrome accessibility tree, and step snapshots when present.
- Treat \`rendered-html.html\` as the stable HTML fixture context, but not as proof that every VoiceOver-announced item was absent during the scan.
- When VoiceOver output conflicts with rendered HTML, inspect the step snapshots. If a snapshot shows the announcement matched live Chrome AX/page state at that step, prefer the VoiceOver plus step-snapshot evidence over final rendered HTML.
- If both rendered HTML and step snapshots lack evidence for an announcement, consider OCR/caption artifact or page drift before changing the fixture. Do not change the engine to match missing evidence until the VoiceOver capture is understood.
- Inspect the start of each VoiceOver announcement for obvious caption/OCR artifacts before creating expected test output.
- Classify the issue yourself as missing, extra, merged, reordered, wording-only, acceptable difference, visual-recognition-only, or engine bug.
- Do not treat punctuation-only or role-order differences as proof by themselves; inspect the source HTML and existing engine patterns first.
- If no engine change is justified, stop and report that decision.
- Run the relevant unit tests and report the result.

## Required Output Shape

When editing files, leave the fixture in this shape:

\`\`\`json
{
  "expectedAnnouncements": ["raw scan output is preserved"],
  "refinedAnnouncements": ["AI-refined output used as the test oracle"],
  "refinementNotes": [
    "Explain high-confidence cleanup and remaining ambiguous areas."
  ]
}
\`\`\`

In your final report, include:

- refined fixture changes
- reusable engine changes
- ambiguous scan/fixture gaps left for review
- test commands run

## VoiceOver Output

${formatList(voiceOverOutput)}

## VoiceOver Source Diagnostics

${voiceOverSources ? `\`\`\`json
${JSON.stringify(summarizeVoiceOverSources(voiceOverSources), null, 2)}
\`\`\`` : "No voiceover-sources.json file was present in this artifact."}

## Chrome Accessibility Tree Summary

\`\`\`json
${JSON.stringify(summarizeAccessibilityTree(accessibilityTree), null, 2)}
\`\`\`

## Step Snapshot Summary

${stepSnapshots ? `\`\`\`json
${JSON.stringify(summarizeStepSnapshots(stepSnapshots), null, 2)}
\`\`\`` : "No step-snapshots.json file was present in this artifact."}

## Rendered HTML

\`\`\`html
${renderedHtml}
\`\`\`
`;
}

function listTargets(entries) {
  for (const entry of entries) {
    const eligible = entry.eligible;
    const reasons = entry.skipReasons;
    console.log(`${entry.name}: ${eligible ? "eligible" : "skipped"}`);
    if (reasons.length) {
      console.log(`  ${reasons.join("; ")}`);
    }
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const entries = getPayloads(options.artifactDir);
  if (options.list) {
    listTargets(entries);
    return;
  }

  if (!options.target) {
    throw new Error("Pass --target <name>, or use --list to see available targets.");
  }

  const entry = entries.find((item) => item.name === options.target);
  if (!entry) {
    throw new Error(`Target not found: ${options.target}`);
  }

  if (!entry.eligible) {
    const reasons = entry.skipReasons;
    throw new Error(
      `Target is not eligible for refinement: ${reasons.join("; ") || "no reason provided"}`,
    );
  }

  mkdirSync(options.outputDir, { recursive: true });
  const outputPath = path.join(options.outputDir, `${entry.name}.md`);
  writeFileSync(outputPath, createPrompt(entry));
  console.log(`Wrote ${path.relative(repoRoot, outputPath)}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
