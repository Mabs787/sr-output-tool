import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { analyzeMismatches } from "./voiceover-refinement-analysis.mjs";

const repoRoot = process.cwd();
const defaultArtifactDir = path.join(repoRoot, "voiceover-smoke-diagnostics");
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
  node .github/scripts/create-refinement-prompt.mjs --target hero-sibling-copy

Options:
  --artifact-dir <path>   Diagnostics folder to inspect. Defaults to ./voiceover-smoke-diagnostics
  --output-dir <path>     Prompt output folder. Defaults to ./voiceover-smoke/refinement-prompts
  --target <name>         Eligible scan target to build a prompt for
  --list                  List eligible and skipped targets
  --help                  Show this help
`);
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function getPayloads(artifactDir) {
  const scansDir = path.join(artifactDir, "scans");
  if (!existsSync(scansDir)) {
    throw new Error(`${path.relative(repoRoot, scansDir)} was not found.`);
  }

  return readdirSync(scansDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const payloadPath = path.join(
        scansDir,
        entry.name,
        "ai-refinement-input.json",
      );
      return {
        name: entry.name,
        payloadPath,
        payload: existsSync(payloadPath) ? readJson(payloadPath) : null,
      };
    })
    .filter((entry) => entry.payload)
    .sort((left, right) => left.name.localeCompare(right.name));
}

function formatList(items) {
  if (!items.length) {
    return "(none)";
  }

  return items.map((item, index) => `${index + 1}. ${item}`).join("\n");
}

function formatMismatches(mismatches) {
  if (!mismatches.length) {
    return "No positional mismatches were found.";
  }

  return mismatches
    .map(
      (item) =>
        `#${item.index}
Type: ${item.type}
Confidence: ${item.confidence}
Priority hint: ${item.priority}
Reason: ${item.explanation}
VoiceOver: ${item.voiceOver || "(none)"}
Engine: ${item.engine || "(none)"}`,
    )
    .join("\n\n");
}

function createPrompt({ name, payloadPath, payload }) {
  const voiceOverOutput = payload.voiceOverOutput || [];
  const engineOutput = payload.engineOutput || [];
  const mismatch = analyzeMismatches(voiceOverOutput, engineOutput);

  return `# SR Engine Refinement Request

Use this VoiceOver comparison to refine the SR Output Tool engine.

## Target

- Name: ${name}
- Payload: ${path.relative(repoRoot, payloadPath)}
- URL: ${payload.target?.url || ""}
- Fixture: ${payload.target?.fixturePath || ""}
- Scan root: ${payload.target?.scanRootSelector || ""}

## Eligibility

- Eligible: ${Boolean(payload.refinement?.eligible)}
- Skip reasons: ${(payload.refinement?.skipReasons || []).join("; ") || "none"}

If \`Eligible\` is false, stop and do not change code.

## Constraints

- Update only the necessary \`sr-engine\` logic.
- Prefer the smallest defensible change.
- Add or update only the relevant regression test.
- Do not update unrelated tests.
- Do not edit generated artifacts.
- Treat mismatch hints as advisory only.
- Reason from the source HTML, VoiceOver output, and engine output.
- Classify the issue yourself as missing, extra, merged, reordered, wording-only, acceptable difference, or engine bug.
- Do not treat punctuation-only or role-order differences as proof by themselves; inspect the source HTML and existing engine patterns first.
- If no engine change is justified, stop and report that decision.
- Run the relevant unit tests and report the result.

## VoiceOver Output

${formatList(voiceOverOutput)}

## Engine Output

${formatList(engineOutput)}

## Mismatch Hints

- Total: ${mismatch.count}
- High confidence: ${mismatch.highConfidenceCount}
- Low confidence: ${mismatch.lowConfidenceCount}
- Needs AI review: ${mismatch.needsAiReview ? "yes" : "no"}

Use these hints to navigate the comparison, not as final instructions.

${formatMismatches(mismatch.items)}

## Source HTML

\`\`\`html
${payload.sourceHtml || ""}
\`\`\`
`;
}

function listTargets(entries) {
  for (const entry of entries) {
    const eligible = Boolean(entry.payload.refinement?.eligible);
    const reasons = entry.payload.refinement?.skipReasons || [];
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

  if (!entry.payload.refinement?.eligible) {
    const reasons = entry.payload.refinement?.skipReasons || [];
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
