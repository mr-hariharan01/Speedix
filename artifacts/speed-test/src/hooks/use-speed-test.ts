import { useState, useCallback, useRef } from "react";
import { calculateStability, calculateJitter } from "@/lib/analysis";

export type TestPhase =
  | "idle"
  | "ping"
  | "download"
  | "upload"
  | "retrying"
  | "finalizing"
  | "complete"
  | "error";

export interface ChartDataPoint {
  time: number;
  speed: number;
}

export interface SpeedInsight {
  rating: "Excellent" | "Good" | "Slow";
  emoji: string;
  message: string;
}

export interface SpeedTestState {
  phase: TestPhase;
  pingMs: number | null;
  downloadMbps: number | null;
  uploadMbps: number | null;
  liveSpeed: number | null;
  chartData: ChartDataPoint[];
  progress: number;
  error: string | null;
  insight: SpeedInsight | null;
  retryCount: number;
  /** Jitter = mean absolute deviation between consecutive pings (ms) */
  jitterMs: number;
  /** Speed samples collected during download for stability calculation */
  speedSamples: number[];
  /** Stability score 0–100 computed from speedSamples */
  stabilityScore: number;
}

const PARALLEL_DOWNLOADS = 3;
const DOWNLOAD_SIZE_MB = 20;
const UPLOAD_SIZE_MB = 10;
const PING_ROUNDS = 5; // extra pings for better jitter measurement
const AUTO_RETRY_THRESHOLD_MBPS = 5;

/**
 * Safe Mbps calculation:
 * speedMbps = (totalBytes * 8) / (timeInSeconds * 1024 * 1024)
 */
function calcMbps(bytes: number, seconds: number): number {
  if (!bytes || !seconds || seconds <= 0) return 0;
  const mbps = (bytes * 8) / (seconds * 1024 * 1024);
  return isFinite(mbps) && !isNaN(mbps) ? Math.round(mbps * 10) / 10 : 0;
}

/** Compute high-level insight from final results */
function computeInsight(downloadMbps: number, pingMs: number): SpeedInsight {
  let rating: SpeedInsight["rating"];
  let emoji: string;
  let message: string;

  if (downloadMbps > 50) {
    rating = "Excellent";
    emoji = "⚡";
    message = "Blazing fast connection. Handles 4K streaming, gaming, and large uploads with ease.";
  } else if (downloadMbps >= 20) {
    rating = "Good";
    emoji = "👍";
    message = "Solid connection for most use cases — HD streaming, video calls, and everyday browsing.";
  } else {
    rating = "Slow";
    emoji = "🐢";
    message = "Consider upgrading your plan. Basic tasks may lag under heavy use.";
  }

  if (pingMs > 80) {
    message += " High latency detected — could affect online gaming or real-time calls.";
  }

  return { rating, emoji, message };
}

export function useSpeedTest() {
  const [state, setState] = useState<SpeedTestState>({
    phase: "idle",
    pingMs: null,
    downloadMbps: null,
    uploadMbps: null,
    liveSpeed: null,
    chartData: [],
    progress: 0,
    error: null,
    insight: null,
    retryCount: 0,
    jitterMs: 0,
    speedSamples: [],
    stabilityScore: 100,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const cancelTest = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setState(prev => ({
      ...prev,
      phase: "idle",
      progress: 0,
      liveSpeed: null,
      chartData: [],
      error: null,
    }));
  }, []);

  /**
   * testPing — runs PING_ROUNDS sequential pings, returns avg and records
   * individual times for jitter calculation.
   */
  const testPing = async (signal: AbortSignal): Promise<{ avgMs: number; jitterMs: number; times: number[] }> => {
    const times: number[] = [];
    for (let i = 0; i < PING_ROUNDS; i++) {
      const t0 = performance.now();
      const res = await fetch("/api/ping", { signal, cache: "no-store" });
      if (!res.ok) throw new Error("Ping failed");
      await res.json();
      times.push(Math.round((performance.now() - t0) * 10) / 10);
    }
    const avgMs = Math.round((times.reduce((a, b) => a + b, 0) / times.length) * 10) / 10;
    const jitterMs = calculateJitter(times);
    return { avgMs, jitterMs, times };
  };

  /**
   * testDownload — runs PARALLEL_DOWNLOADS simultaneous fetch streams.
   * Accumulates speed samples for stability calculation.
   */
  const testDownload = async (
    signal: AbortSignal,
    onLiveUpdate: (speed: number, progress: number, point: ChartDataPoint) => void
  ): Promise<{ mbps: number; samples: number[] }> => {
    const dlStartTime = performance.now();
    let totalBytesReceived = 0;
    const collectedSamples: number[] = [];

    let lastReportTime = dlStartTime;
    let bytesSinceLastReport = 0;
    const lock = { reporting: false };

    const downloadStream = async () => {
      const res = await fetch("/api/download", { signal, cache: "no-store" });
      if (!res.ok || !res.body) throw new Error("Download failed");

      const reader = res.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          totalBytesReceived += value.length;
          bytesSinceLastReport += value.length;

          const now = performance.now();
          if (now - lastReportTime >= 400 && !lock.reporting) {
            lock.reporting = true;
            const elapsedMs = now - lastReportTime;
            const liveSpeed = calcMbps(bytesSinceLastReport, elapsedMs / 1000);
            if (liveSpeed > 0) collectedSamples.push(liveSpeed);
            const progress = Math.min(
              40,
              (totalBytesReceived / (DOWNLOAD_SIZE_MB * 1024 * 1024 * PARALLEL_DOWNLOADS)) * 40
            );
            onLiveUpdate(liveSpeed, 20 + progress, { time: now - dlStartTime, speed: liveSpeed });
            bytesSinceLastReport = 0;
            lastReportTime = now;
            lock.reporting = false;
          }
        }
      }
    };

    await Promise.all(Array.from({ length: PARALLEL_DOWNLOADS }, downloadStream));

    const totalSeconds = (performance.now() - dlStartTime) / 1000;
    return { mbps: calcMbps(totalBytesReceived, totalSeconds), samples: collectedSamples };
  };

  /**
   * testUpload — sends a full 10MB buffer to /api/upload and measures speed.
   */
  const testUpload = async (
    signal: AbortSignal,
    onLiveUpdate: (speed: number, progress: number, point: ChartDataPoint) => void
  ): Promise<number> => {
    const uploadData = new Uint8Array(UPLOAD_SIZE_MB * 1024 * 1024);
    for (let i = 0; i < uploadData.length; i += 1024) {
      uploadData[i] = (Math.random() * 255) | 0;
    }

    const ulStart = performance.now();
    let done = false;

    const ticker = setInterval(() => {
      if (done) return;
      const elapsed = (performance.now() - ulStart) / 1000;
      if (elapsed <= 0) return;
      const estimatedSpeed = calcMbps(UPLOAD_SIZE_MB * 1024 * 1024 * 0.5, elapsed);
      const progress = Math.min(35, (elapsed / 5) * 35);
      onLiveUpdate(estimatedSpeed, 60 + progress, { time: performance.now() - ulStart, speed: estimatedSpeed });
    }, 500);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: uploadData,
        signal,
      });
      if (!res.ok) throw new Error("Upload failed");
      await res.json();
    } finally {
      done = true;
      clearInterval(ticker);
    }

    const totalSeconds = (performance.now() - ulStart) / 1000;
    return calcMbps(UPLOAD_SIZE_MB * 1024 * 1024, totalSeconds);
  };

  const runTest = useCallback(async (retryCount = 0) => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const { signal } = controller;

    setState(s => ({
      ...s,
      phase: retryCount > 0 ? "retrying" : "ping",
      pingMs: retryCount > 0 ? s.pingMs : null,
      downloadMbps: null,
      uploadMbps: null,
      liveSpeed: null,
      chartData: [],
      progress: retryCount > 0 ? 5 : 3,
      error: null,
      retryCount,
      jitterMs: retryCount > 0 ? s.jitterMs : 0,
      speedSamples: [],
      stabilityScore: 100,
    }));

    try {
      // ── 1. PING ──────────────────────────────────────────────────────
      setState(s => ({ ...s, phase: "ping", progress: 3 }));
      const { avgMs: pingMs, jitterMs } = await testPing(signal);
      setState(s => ({ ...s, pingMs, jitterMs, progress: 20, phase: "download" }));

      // ── 2. DOWNLOAD ──────────────────────────────────────────────────
      const dlChartPoints: ChartDataPoint[] = [];

      const { mbps: downloadMbps, samples: speedSamples } = await testDownload(
        signal,
        (speed, progress, point) => {
          dlChartPoints.push(point);
          setState(s => ({
            ...s,
            liveSpeed: speed,
            progress,
            chartData: [...dlChartPoints],
          }));
        }
      );

      const stabilityScore = calculateStability(speedSamples);

      setState(s => ({
        ...s,
        downloadMbps,
        speedSamples,
        stabilityScore,
        progress: 60,
        phase: "upload",
        liveSpeed: null,
        chartData: [],
      }));

      // ── 3. AUTO-RETRY if too slow ────────────────────────────────────
      if (downloadMbps < AUTO_RETRY_THRESHOLD_MBPS && retryCount === 0) {
        setState(s => ({ ...s, phase: "retrying", liveSpeed: null, chartData: [] }));
        await new Promise(r => setTimeout(r, 1200));
        return runTest(1);
      }

      // ── 4. UPLOAD ────────────────────────────────────────────────────
      const ulChartPoints: ChartDataPoint[] = [];

      const uploadMbps = await testUpload(signal, (speed, progress, point) => {
        ulChartPoints.push(point);
        setState(s => ({
          ...s,
          liveSpeed: speed,
          progress,
          chartData: [...ulChartPoints],
        }));
      });

      setState(s => ({
        ...s,
        uploadMbps,
        progress: 95,
        phase: "finalizing",
        liveSpeed: null,
      }));

      // ── 5. FINALIZE ──────────────────────────────────────────────────
      await new Promise(r => setTimeout(r, 900));

      const insight = computeInsight(downloadMbps, pingMs);

      setState(s => ({
        ...s,
        progress: 100,
        phase: "complete",
        insight,
      }));
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setState(s => ({
        ...s,
        phase: "error",
        error: err.message || "An unknown error occurred.",
        progress: 0,
        liveSpeed: null,
      }));
    } finally {
      abortControllerRef.current = null;
    }
  }, []);

  const startTest = useCallback(() => runTest(0), [runTest]);

  return {
    ...state,
    startTest,
    cancelTest,
    isRunning: ["ping", "download", "upload", "retrying", "finalizing"].includes(state.phase),
  };
}
