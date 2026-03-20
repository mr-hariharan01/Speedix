import { Router, type IRouter } from "express";

const router: IRouter = Router();

const DOWNLOAD_SIZE = 20 * 1024 * 1024;
const downloadBuffer = Buffer.alloc(DOWNLOAD_SIZE);

router.get("/ping", (_req, res) => {
  res.json({ message: "pong", timestamp: Date.now() });
});

router.get("/download", (_req, res) => {
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Length", DOWNLOAD_SIZE.toString());
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.send(downloadBuffer);
});

router.post("/upload", (req, res) => {
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
