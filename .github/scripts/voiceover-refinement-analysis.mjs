function normalizeWhitespace(value) {
  return String(value).replace(/\s+/g, " ").trim();
}

function normalizePunctuation(value) {
  return normalizeWhitespace(value)
    .replace(/[•,.:;]+/g, "")
    .toLowerCase();
}

function getSortedTokens(value) {
  return normalizePunctuation(value).split(" ").filter(Boolean).sort();
}

function sameTokenSet(left, right) {
  const leftTokens = getSortedTokens(left);
  const rightTokens = getSortedTokens(right);
  return (
    leftTokens.length === rightTokens.length &&
    leftTokens.every((token, index) => token === rightTokens[index])
  );
}

export function classifyMismatch(voiceOver, engine) {
  if (!voiceOver && engine) {
    return {
      type: "engine-extra",
      confidence: "high",
      explanation: "Engine produced an announcement where VoiceOver had none.",
      priority: "high",
    };
  }

  if (voiceOver && !engine) {
    return {
      type: "voiceover-extra",
      confidence: "high",
      explanation: "VoiceOver produced an announcement where the engine had none.",
      priority: "high",
    };
  }

  if (voiceOver === engine) {
    return {
      type: "match",
      confidence: "none",
      explanation: "Outputs match exactly.",
      priority: "none",
    };
  }

  if (normalizePunctuation(voiceOver) === normalizePunctuation(engine)) {
    return {
      type: "punctuation-only",
      confidence: "low",
      explanation: "Outputs differ only by punctuation or bullet formatting.",
      priority: "low",
    };
  }

  if (sameTokenSet(voiceOver, engine)) {
    return {
      type: "role-order",
      confidence: "low",
      explanation:
        "Outputs contain the same words but VoiceOver and the engine order role/name text differently.",
      priority: "low",
    };
  }

  return {
    type: "content",
    confidence: "high",
    explanation: "Outputs differ in content, not only punctuation or role order.",
    priority: "high",
  };
}

export function analyzeMismatches(voiceOverOutput, engineOutput) {
  const maxLength = Math.max(voiceOverOutput.length, engineOutput.length);
  const items = [];

  for (let index = 0; index < maxLength; index += 1) {
    const voiceOver = voiceOverOutput[index] || "";
    const engine = engineOutput[index] || "";
    if (voiceOver !== engine) {
      const classification = classifyMismatch(voiceOver, engine);
      items.push({
        index: index + 1,
        voiceOver,
        engine,
        ...classification,
      });
    }
  }

  const highConfidence = items.filter((item) => item.confidence === "high");
  const lowConfidence = items.filter((item) => item.confidence === "low");

  return {
    count: items.length,
    highConfidenceCount: highConfidence.length,
    lowConfidenceCount: lowConfidence.length,
    first: items[0] || null,
    firstHighConfidence: highConfidence[0] || null,
    needsAiReview: items.length > 0,
    items,
  };
}
