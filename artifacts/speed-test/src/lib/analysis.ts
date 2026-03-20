/**
 * Speedix Analysis Module
 * Pure utility functions for connection analysis, gaming performance,
 * plan comparison, stability scoring, and share text generation.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AiDiagnosis {
  messages: Array<{ type: "warning" | "success" | "info"; text: string }>;
  overallStatus: "healthy" | "degraded" | "poor";
}

export interface GamingRating {
  status: "good" | "playable" | "poor";
  emoji: string;
  label: string;
  color: string;
  details: string[];
}

export interface PlanComparison {
  percentage: number;
  isUnderperforming: boolean;
  warning: string | null;
  message: string;
}

// ─── analyzeConnection ────────────────────────────────────────────────────────

/**
 * AI Internet Doctor — produces diagnostic messages from test results.
 */
export function analyzeConnection(
  pingMs: number,
  downloadMbps: number,
  uploadMbps: number,
  stabilityScore: number,
  jitterMs: number
): AiDiagnosis {
  const messages: AiDiagnosis["messages"] = [];
  let issueCount = 0;

  // High latency check
  if (pingMs > 150) {
    messages.push({
      type: "warning",
      text: "⚠️ High latency detected. Possible routing or server distance issue.",
    });
    issueCount++;
  } else if (pingMs > 80) {
    messages.push({
      type: "warning",
      text: "⚠️ Moderate latency. May affect real-time applications like gaming or video calls.",
    });
    issueCount++;
  }

  // Speed fluctuation / stability check
  if (stabilityScore < 60) {
    messages.push({
      type: "warning",
      text: "⚠️ Connection is unstable. Speed is fluctuating significantly during the test.",
    });
    issueCount++;
  } else if (stabilityScore < 80) {
    messages.push({
      type: "info",
      text: "ℹ️ Mild speed variation detected. Connection is mostly stable.",
    });
  }

  // Jitter check (high jitter even with good ping = poor quality)
  if (jitterMs > 30) {
    messages.push({
      type: "warning",
      text: "⚠️ High jitter detected. Packet delivery timing is inconsistent.",
    });
    issueCount++;
  }

  // Upload/download ratio check (upload should be at least 10% of download)
  if (downloadMbps > 5 && uploadMbps < downloadMbps * 0.08) {
    messages.push({
      type: "warning",
      text: "⚠️ Upload speed is unusually low compared to download. May affect video calls and cloud uploads.",
    });
    issueCount++;
  }

  // All good
  if (issueCount === 0) {
    messages.push({
      type: "success",
      text: "✅ Your internet connection is stable and fast. No issues detected.",
    });
  }

  const overallStatus: AiDiagnosis["overallStatus"] =
    issueCount === 0 ? "healthy" : issueCount === 1 ? "degraded" : "poor";

  return { messages, overallStatus };
}

// ─── calculateStability ───────────────────────────────────────────────────────

/**
 * Calculates a stability score (0–100) from an array of speed samples.
 * Uses coefficient of variation: lower variation = higher stability.
 */
export function calculateStability(speedSamples: number[]): number {
  if (speedSamples.length < 2) return 100;

  const mean = speedSamples.reduce((a, b) => a + b, 0) / speedSamples.length;
  if (mean === 0) return 0;

  const variance =
    speedSamples.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) /
    speedSamples.length;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / mean; // coefficient of variation

  // cv = 0 → 100% stable; cv = 0.5 → 50% stable; cv >= 1 → 0%
  const score = Math.max(0, Math.min(100, Math.round((1 - cv) * 100)));
  return score;
}

/**
 * Calculates jitter (ms) from an array of ping round-trip times.
 * Jitter = mean absolute deviation between consecutive pings.
 */
export function calculateJitter(pingTimes: number[]): number {
  if (pingTimes.length < 2) return 0;
  let totalDiff = 0;
  for (let i = 1; i < pingTimes.length; i++) {
    totalDiff += Math.abs(pingTimes[i] - pingTimes[i - 1]);
  }
  return Math.round((totalDiff / (pingTimes.length - 1)) * 10) / 10;
}

// ─── getGamingRating ──────────────────────────────────────────────────────────

/**
 * Returns a gaming performance rating based on ping, jitter, and stability.
 */
export function getGamingRating(
  pingMs: number,
  jitterMs: number,
  stabilityScore: number
): GamingRating {
  // Simulate basic packet loss from stability score
  const simulatedPacketLoss = Math.max(0, Math.round((100 - stabilityScore) / 10));

  const details = [
    `Ping: ${Math.round(pingMs)} ms`,
    `Jitter: ${jitterMs.toFixed(1)} ms`,
    `Est. Packet Loss: ~${simulatedPacketLoss}%`,
  ];

  const isGoodPing = pingMs <= 50;
  const isPlayablePing = pingMs <= 100;
  const isGoodJitter = jitterMs <= 15;
  const isPlayableJitter = jitterMs <= 30;
  const isStable = stabilityScore >= 75;

  if (isGoodPing && isGoodJitter && isStable) {
    return {
      status: "good",
      emoji: "🟢",
      label: "Good for Gaming",
      color: "#22c55e",
      details,
    };
  }

  if (isPlayablePing && isPlayableJitter) {
    return {
      status: "playable",
      emoji: "🟡",
      label: "Playable",
      color: "#eab308",
      details,
    };
  }

  return {
    status: "poor",
    emoji: "🔴",
    label: "Not Suitable for Gaming",
    color: "#ef4444",
    details,
  };
}

// ─── calculatePlanComparison ──────────────────────────────────────────────────

/**
 * Compares actual download speed against the user's plan speed.
 */
export function calculatePlanComparison(
  actualMbps: number,
  planMbps: number
): PlanComparison {
  if (planMbps <= 0) {
    return { percentage: 0, isUnderperforming: false, warning: null, message: "" };
  }

  const percentage = Math.round((actualMbps / planMbps) * 100);
  const isUnderperforming = percentage < 60;

  const warning = isUnderperforming
    ? "⚠️ Your ISP may not be delivering the full promised speed."
    : null;

  let message: string;
  if (percentage >= 90) {
    message = `Excellent! You're getting ${percentage}% of your plan — near-perfect delivery.`;
  } else if (percentage >= 60) {
    message = `You are getting ${percentage}% of your ${planMbps} Mbps plan. Within acceptable range.`;
  } else {
    message = `You are only getting ${percentage}% of your ${planMbps} Mbps plan. Consider contacting your ISP.`;
  }

  return { percentage, isUnderperforming, warning, message };
}

// ─── generateShareText ────────────────────────────────────────────────────────

/**
 * Generates a shareable text summary of the speed test result.
 */
export function generateShareText(
  downloadMbps: number,
  uploadMbps: number,
  pingMs: number,
  rating: string,
  emoji: string,
  stabilityScore: number
): string {
  return [
    `🚀 Speedix Result`,
    ``,
    `${emoji} Rating: ${rating}`,
    `⬇️  Download: ${downloadMbps.toFixed(1)} Mbps`,
    `⬆️  Upload:   ${uploadMbps.toFixed(1)} Mbps`,
    `📡  Ping:     ${Math.round(pingMs)} ms`,
    `📊  Stability: ${stabilityScore}%`,
    ``,
    `Tested with Speedix — Measure the Real Internet`,
  ].join("\n");
}
