import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // New API endpoint to serve radio data
  app.get("/radio.json", async (_req, res) => {
    try {
      const dataPath = path.join(__dirname, "radio_data.json");
      const data = await fs.readFile(dataPath, "utf-8");
      res.setHeader("Content-Type", "application/json");
      res.send(data);
    } catch (error) {
      console.error("Error reading radio data:", error);
      res.status(500).json({ error: "Failed to load radio data" });
    }
  });

  // Handle client-side routing - serve index.html for all other routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
