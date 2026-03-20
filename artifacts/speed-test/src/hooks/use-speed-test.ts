import { useState, useCallback, useRef } from "react";

export type TestPhase = "idle" | "ping" | "download" | "upload" | "finalizing" | "complete" | "error";

export interface ChartDataPoint {
  time: number;
  speed: number;
}

export interface SpeedInsight {
  rating: "Excellent" | "Good" | "Slow";
  message: string;
}

export interface SpeedTestState {
  phase: TestPhase;
  pingMs: number | null;
  downloadMbps: number | null;
  uploadMbps: number | null;
  liveSpeed: number | null;
  chartData: ChartDataPoint[];
  progress: number; // 0 to 100
  error: string | null;
  insight: SpeedInsight | null;
}

const UPLOAD_SIZE_MB = 10;
const PARALLEL_DOWNLOADS = 3;

/**
 * Hook to manage the state and logic of the Internet Speed Test.
 * Converts all speeds to Mbps (Megabits per second).
 */
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
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const cancelTest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState(prev => ({ 
      ...prev, 
      phase: "idle", 
      progress: 0, 
      liveSpeed: null,
      chartData: [],
      error: null
    }));
  }, []);

  const startTest = useCallback(async () => {
    cancelTest(); // Reset if running
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const signal = controller.signal;

    setState({
      phase: "ping",
      pingMs: null,
      downloadMbps: null,
      uploadMbps: null,
      liveSpeed: null,
      chartData: [],
      progress: 5,
      error: null,
      insight: null,
    });

    try {
      // 1. PING TEST
      const pingStart = performance.now();
      const pingRes = await fetch("/api/ping", { signal, cache: "no-store" });
      if (!pingRes.ok) throw new Error("Ping failed");
      await pingRes.json();
      const pingEnd = performance.now();
      const finalPingMs = pingEnd - pingStart;
      
      setState(s => ({ ...s, pingMs: finalPingMs, progress: 20, phase: "download" }));

      // 2. DOWNLOAD TEST
      const dlStartTime = performance.now();
      let totalBytesReceived = 0;
      let lastReportTime = dlStartTime;
      let bytesSinceLastReport = 0;

      const downloadFetch = async () => {
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
            const elapsedSinceReport = now - lastReportTime;
            
            if (elapsedSinceReport > 500) {
              const speedBps = (bytesSinceLastReport / (elapsedSinceReport / 1000));
              const speedMbps = (speedBps * 8) / 1_000_000;
              
              setState(s => {
                const newChartData = [...s.chartData, { time: now - dlStartTime, speed: speedMbps }];
                return {
                  ...s,
                  liveSpeed: speedMbps,
                  chartData: newChartData,
                  progress: 20 + Math.min(40, (totalBytesReceived / (20 * 1024 * 1024 * PARALLEL_DOWNLOADS)) * 40)
                };
              });
              
              bytesSinceLastReport = 0;
              lastReportTime = now;
            }
          }
        }
      };

      await Promise.all(Array.from({ length: PARALLEL_DOWNLOADS }).map(() => downloadFetch()));
      
      const dlEndTime = performance.now();
      const totalDlSeconds = (dlEndTime - dlStartTime) / 1000;
      const finalDownloadMbps = ((totalBytesReceived * 8) / 1_000_000) / totalDlSeconds;

      setState(s => ({ 
        ...s, 
        downloadMbps: finalDownloadMbps, 
        progress: 60, 
        phase: "upload",
        liveSpeed: null,
        chartData: [] // Reset chart for upload
      }));

      // 3. UPLOAD TEST
      const uploadData = new Uint8Array(UPLOAD_SIZE_MB * 1024 * 1024);
      for (let i = 0; i < uploadData.length; i += 4096) {
        uploadData[i] = Math.random() * 255;
      }

      const ulStartTime = performance.now();
      
      const uploadChunkSize = 2 * 1024 * 1024;
      const totalUploadChunks = 5;
      let totalUlBytesSent = 0;
      
      for(let i=0; i<totalUploadChunks; i++){
        if (signal.aborted) throw new DOMException("Aborted", "AbortError");
        
        const chunkStart = performance.now();
        const chunk = uploadData.slice(i * uploadChunkSize, (i + 1) * uploadChunkSize);
        
        const ulRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/octet-stream" },
          body: chunk,
          signal,
        });
        if (!ulRes.ok) throw new Error("Upload failed");
        
        totalUlBytesSent += chunk.length;
        const chunkEnd = performance.now();
        
        const chunkSeconds = (chunkEnd - chunkStart) / 1000;
        const speedMbps = ((chunk.length * 8) / 1_000_000) / chunkSeconds;
        
        setState(s => ({
          ...s,
          liveSpeed: speedMbps,
          chartData: [...s.chartData, { time: chunkEnd - ulStartTime, speed: speedMbps }],
          progress: 60 + ((i + 1) / totalUploadChunks) * 35
        }));
      }

      const ulEndTime = performance.now();
      const ulTotalSeconds = (ulEndTime - ulStartTime) / 1000;
      const finalUploadMbps = ((totalUlBytesSent * 8) / 1_000_000) / ulTotalSeconds;

      setState(s => ({
        ...s,
        uploadMbps: finalUploadMbps,
        progress: 95,
        phase: "finalizing",
        liveSpeed: null,
      }));

      // 4. FINALIZING
      await new Promise(r => setTimeout(r, 1000)); // artificial delay
      
      let rating: "Excellent" | "Good" | "Slow" = "Good";
      let msg = "Solid connection for most use cases";
      
      if (finalDownloadMbps > 50) {
        rating = "Excellent";
        msg = "Blazing fast connection";
      } else if (finalDownloadMbps < 20) {
        rating = "Slow";
        msg = "Consider upgrading your plan";
      }
      
      if (finalPingMs > 80) {
        msg += " — High latency detected.";
      }

      setState(s => ({
        ...s,
        progress: 100,
        phase: "complete",
        insight: { rating, message: msg }
      }));

    } catch (err: any) {
      if (err.name === "AbortError" || err.message === "Aborted") {
        console.log("Test aborted by user");
        return;
      }
      setState(s => ({
        ...s,
        phase: "error",
        error: err.message || "An unknown error occurred during the test.",
        progress: 0,
        liveSpeed: null
      }));
    } finally {
      abortControllerRef.current = null;
    }
  }, [cancelTest]);

  return {
    ...state,
    startTest,
    cancelTest,
    isRunning: ["ping", "download", "upload", "finalizing"].includes(state.phase),
  };
}