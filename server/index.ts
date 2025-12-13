import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import https from "https";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STATIONS_URL = "https://raw.githubusercontent.com/uthumany/radio-api/main/client/public/api/stations.json";

// Cache for radio data
let cachedData: string | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

async function fetchStationsData(): Promise<string> {
  // Check if cache is still valid
  const now = Date.now();
  if (cachedData && now - cacheTimestamp < CACHE_DURATION) {
    return cachedData;
  }

  return new Promise((resolve, reject) => {
    https.get(STATIONS_URL, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          JSON.parse(data);
          cachedData = data;
          cacheTimestamp = now;
          resolve(data);
        } catch (error) {
          reject(new Error("Invalid JSON from remote URL"));
        }
      });
    }).on("error", (error) => {
      reject(new Error(`Failed to fetch data: ${error.message}`));
    });
  });
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Primary API endpoint for radio stations
  app.get("/api/stations", async (_req, res) => {
    try {
      const data = await fetchStationsData();
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.send(data);
    } catch (error) {
      console.error("Error fetching radio data:", error);
      res.status(500).json({ error: "Failed to load radio data" });
    }
  });

  // Backward compatible endpoint
  app.get("/radio.json", async (_req, res) => {
    try {
      const data = await fetchStationsData();
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.send(data);
    } catch (error) {
      console.error("Error fetching radio data:", error);
      res.status(500).json({ error: "Failed to load radio data" });
    }
  });

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Handle client-side routing
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
