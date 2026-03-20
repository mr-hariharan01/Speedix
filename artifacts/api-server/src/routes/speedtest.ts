import { Router, type IRouter } from "express";

const router: IRouter = Router();

const DOWNLOAD_SIZE = 20 * 1024 * 1024; // 20MB
const downloadBuffer = Buffer.alloc(DOWNLOAD_SIZE, 0x41); // Pre-allocate once

router.get("/ping", (_req, res) => {
  res.json({ message: "pong", timestamp: Date.now() });
});

router.get("/download", (_req, res) => {
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Length", DOWNLOAD_SIZE.toString());
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.send(downloadBuffer);
});

router.post("/upload", (req, res) => {
  // express.raw() middleware (applied in app.ts) parses the body into req.body Buffer
  // If body was parsed by express.raw, use it; otherwise fall back to streaming
  if (Buffer.isBuffer(req.body)) {
    const received = req.body.length;
    res.json({ received, message: "ok" });
    return;
  }

  // Streaming fallback
  let receivedBytes = 0;
  req.on("data", (chunk: Buffer) => {
    receivedBytes += chunk.length;
  });
  req.on("end", () => {
    res.json({ received: receivedBytes, message: "ok" });
  });
  req.on("error", () => {
    res.status(500).json({ received: receivedBytes, message: "error" });
  });
});

export default router;
