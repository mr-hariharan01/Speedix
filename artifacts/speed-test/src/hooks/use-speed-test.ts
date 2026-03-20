import { useState, useCallback, useRef } from "react";

export type TestPhase = "idle" | "ping" | "download" | "upload" | "complete" | "error";

interface SpeedTestState {
  phase: TestPhase;
  pingMs: number | null;
  downloadMbps: number | null;
  uploadMbps: number | null;
  progress: number; // 0 to 100
  error: string | null;
}

const DOWNLOAD_SIZE_MB = 20;
const UPLOAD_SIZE_MB = 10;

export function useSpeedTest() {
  const [state, setState] = useState<SpeedTestState>({
    phase: "idle",
    pingMs: null,
    downloadMbps: null,
    uploadMbps: null,
    progress: 0,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const cancelTest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState(prev => ({ ...prev, phase: "idle", progress: 0 }));
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
      progress: 5,
      error: null,
    });

    try {
      // 1. PING TEST
      const pingStart = performance.now();
      const pingRes = await fetch("/api/ping", { signal, cache: "no-store" });
      if (!pingRes.ok) throw new Error("Ping failed");
      await pingRes.json(); // wait for full response
      const pingEnd = performance.now();
      
      setState(s => ({ ...s, pingMs: pingEnd - pingStart, progress: 25, phase: "download" }));

      // 2. DOWNLOAD TEST
      const dlStart = performance.now();
      const dlRes = await fetch("/api/download", { signal, cache: "no-store" });
      if (!dlRes.ok) throw new Error("Download failed");
      
      // We consume the entire buffer to measure real throughput
      await dlRes.arrayBuffer(); 
      const dlEnd = performance.now();
      
      const dlTimeSeconds = (dlEnd - dlStart) / 1000;
      const downloadMbps = DOWNLOAD_SIZE_MB / dlTimeSeconds;
      
      setState(s => ({ ...s, downloadMbps, progress: 65, phase: "upload" }));

      // 3. UPLOAD TEST
      // Create a 10MB dummy payload
      const uploadData = new Uint8Array(UPLOAD_SIZE_MB * 1024 * 1024);
      // Fill with some random data so it's not compressible by network intermediaries (optional, but good for real tests)
      for (let i = 0; i < uploadData.length; i += 4096) {
        uploadData[i] = Math.random() * 255;
      }

      const ulStart = performance.now();
      const ulRes = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
        },
        body: uploadData,
        signal,
      });
      if (!ulRes.ok) throw new Error("Upload failed");
      await ulRes.json();
      
      const ulEnd = performance.now();
      const ulTimeSeconds = (ulEnd - ulStart) / 1000;
      const uploadMbps = UPLOAD_SIZE_MB / ulTimeSeconds;

      setState(s => ({
        ...s,
        uploadMbps,
        progress: 100,
        phase: "complete",
      }));

    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("Test aborted by user");
        return;
      }
      setState(s => ({
        ...s,
        phase: "error",
        error: err.message || "An unknown error occurred during the test.",
        progress: 0,
      }));
    } finally {
      abortControllerRef.current = null;
    }
  }, [cancelTest]);

  return {
    ...state,
    startTest,
    cancelTest,
    isRunning: ["ping", "download", "upload"].includes(state.phase),
  };
}
