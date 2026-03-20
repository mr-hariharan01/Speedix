import { useState, useCallback, useRef } from "react";

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
}

const PARALLEL_DOWNLOADS = 3;
const DOWNLOAD_SIZE_MB = 20;
const UPLOAD_SIZE_MB = 10;
const PING_ROUNDS = 3;
const AUTO_RETRY_THRESHOLD_MBPS = 5;

/**
 * Safe Mbps calculation using the user-specified formula:
 * speedMbps = (totalBytes * 8) / (timeInSeconds * 1024 * 1024)
 * Returns 0 instead of NaN/Infinity if inputs are invalid.
 */
function calcMbps(bytes: number, seconds: number): number {
  if (!bytes || !seconds || seconds <= 0) return 0;
  const mbps = (bytes * 8) / (seconds * 1024 * 1024);
  return isFinite(mbps) && !isNaN(mbps) ? Math.round(mbps * 10) / 10 : 0;
}

/** Compute insight from final results */
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
   * testPing — runs PING_ROUNDS sequential pings and returns the average.
   */
  const testPing = async (signal: AbortSignal): Promise<number> => {
    const times: number[] = [];
    for (let i = 0; i < PING_ROUNDS; i++) {
      const t0 = performance.now();
      const res = await fetch("/api/ping", { signal, cache: "no-store" });
      if (!res.ok) throw new Error("Ping failed");
      await res.json();
      times.push(performance.now() - t0);
    }
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    return Math.round(avg * 10) / 10;
  };

  /**
   * testDownload — runs PARALLEL_DOWNLOADS simultaneous fetch streams,
   * accumulates total bytes across all streams, and computes final Mbps.
   */
  const testDownload = async (
    signal: AbortSignal,
    onLiveUpdate: (speed: number, progress: number, point: ChartDataPoint) => void
  ): Promise<number> => {
    const dlStartTime = performance.now();
    let totalBytesReceived = 0;

    // Per-stream tracking for live speed reporting
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
    return calcMbps(totalBytesReceived, totalSeconds);
  };

  /**
   * testUpload — sends one full 10MB buffer to /api/upload and measures speed.
   */
  const testUpload = async (
    signal: AbortSignal,
    onLiveUpdate: (speed: number, progress: number, point: ChartDataPoint) => void
  ): Promise<number> => {
    const uploadData = new Uint8Array(UPLOAD_SIZE_MB * 1024 * 1024);
    // Sparse random fill (enough to defeat compression without spending time filling every byte)
    for (let i = 0; i < uploadData.length; i += 1024) {
      uploadData[i] = (Math.random() * 255) | 0;
    }

    const ulStart = performance.now();

    // Simulate live speed updates during upload by updating every 500ms via a ticker
    let done = false;
    const ticker = setInterval(() => {
      if (done) return;
      const elapsed = (performance.now() - ulStart) / 1000;
      if (elapsed <= 0) return;
      const estimatedSpeed = calcMbps(UPLOAD_SIZE_MB * 1024 * 1024 * 0.5, elapsed); // partial estimate
      const progress = Math.min(35, (elapsed / 5) * 35); // rough 5s estimate
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
      await res.json(); // wait for full server acknowledgment
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
    }));

    try {
      // ── 1. PING ──────────────────────────────────────────────────────
      setState(s => ({ ...s, phase: "ping", progress: 3 }));
      const pingMs = await testPing(signal);
      setState(s => ({ ...s, pingMs, progress: 20, phase: "download" }));

      // ── 2. DOWNLOAD ──────────────────────────────────────────────────
      const dlChartPoints: ChartDataPoint[] = [];

      const downloadMbps = await testDownload(signal, (speed, progress, point) => {
        dlChartPoints.push(point);
        setState(s => ({
          ...s,
          liveSpeed: speed,
          progress,
          chartData: [...dlChartPoints],
        }));
      });

      setState(s => ({
        ...s,
        downloadMbps,
        progress: 60,
        phase: "upload",
        liveSpeed: null,
        chartData: [],
      }));

      // ── 3. AUTO-RETRY if too slow ────────────────────────────────────
      if (downloadMbps < AUTO_RETRY_THRESHOLD_MBPS && retryCount === 0) {
        setState(s => ({ ...s, phase: "retrying", liveSpeed: null, chartData: [] }));
        await new Promise(r => setTimeout(r, 1200));
        return runTest(1); // one retry
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
      if (err.name === "AbortError") return; // user cancelled — stay in idle
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
