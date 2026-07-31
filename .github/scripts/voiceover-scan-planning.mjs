function roundUp(value, increment) {
  return Math.ceil(value / increment) * increment;
}

export function planAdaptiveMaxSteps({
  configuredMaxSteps,
  ceiling = 1000,
  domNodeCount = 0,
  accessibilityNodeCount = 0,
  source = "url",
}) {
  const configured = Number.isInteger(configuredMaxSteps)
    ? configuredMaxSteps
    : 0;
  const safeCeiling = Math.max(configured, Number.isInteger(ceiling) ? ceiling : 1000);

  if (configured === 0) {
    return {
      enabled: true,
      configuredMaxSteps: 0,
      effectiveMaxSteps: 0,
      estimatedRequiredSteps: 0,
      ceiling: safeCeiling,
      adjusted: false,
      reason: "unlimited-configured",
      inputs: { domNodeCount, accessibilityNodeCount, source },
    };
  }

  const domEstimate = Math.ceil(domNodeCount * (source === "fixture" ? 0.65 : 0.85));
  const axEstimate = Math.ceil(accessibilityNodeCount * 1.35);
  const complexityEstimate = roundUp(Math.max(domEstimate, axEstimate) + 25, 25);
  const estimatedRequiredSteps = Math.max(configured, complexityEstimate);
  const effectiveMaxSteps = Math.min(safeCeiling, estimatedRequiredSteps);

  return {
    enabled: true,
    configuredMaxSteps: configured,
    effectiveMaxSteps,
    estimatedRequiredSteps,
    ceiling: safeCeiling,
    adjusted: effectiveMaxSteps > configured,
    reason:
      effectiveMaxSteps > configured
        ? effectiveMaxSteps === safeCeiling && estimatedRequiredSteps > safeCeiling
          ? "raised-to-ceiling-from-preflight-complexity"
          : "raised-from-preflight-complexity"
        : "configured-limit-sufficient",
    inputs: { domNodeCount, accessibilityNodeCount, source },
  };
}

export function isPartialStopReason(stopReason) {
  return (
    typeof stopReason === "string" &&
    (stopReason.startsWith("max-steps:") ||
      stopReason.startsWith("timeout:") ||
      stopReason === "not-stopped")
  );
}

function htmlState(snapshot) {
  const html = snapshot?.htmlAfterStep || {};
  return {
    fingerprint: html.fingerprint || html.sha256 || "",
    nodeCount: html.stats?.nodeCount ?? null,
    bodyTextLength: html.stats?.bodyTextLength ?? null,
    url: snapshot?.pageState?.url || "",
    title: snapshot?.pageState?.title || "",
  };
}

export function detectConditionalEvidence(previousSnapshot, currentSnapshot) {
  if (!previousSnapshot || !currentSnapshot) {
    return { capture: false, reasons: [] };
  }

  const previous = htmlState(previousSnapshot);
  const current = htmlState(currentSnapshot);
  const reasons = [];

  if (
    previous.fingerprint &&
    current.fingerprint &&
    previous.fingerprint !== current.fingerprint
  ) {
    reasons.push("rendered-dom-fingerprint-changed");
  }
  if (
    previous.nodeCount !== null &&
    current.nodeCount !== null &&
    previous.nodeCount !== current.nodeCount
  ) {
    reasons.push("rendered-dom-node-count-changed");
  }
  if (
    previous.bodyTextLength !== null &&
    current.bodyTextLength !== null &&
    previous.bodyTextLength !== current.bodyTextLength
  ) {
    reasons.push("rendered-body-text-length-changed");
  }
  if (previous.url && current.url && previous.url !== current.url) {
    reasons.push("page-url-changed");
  }
  if (previous.title && current.title && previous.title !== current.title) {
    reasons.push("page-title-changed");
  }

  return {
    capture: reasons.length > 0,
    reasons,
    before: previous,
    after: current,
  };
}
