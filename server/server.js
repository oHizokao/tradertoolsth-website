"use strict";
// ============================================================
// server.js - Express app entrypoint
//   โหลด .env, mount logger/CORS/json, routes, error handler
// ============================================================

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");

const { requestLogger, info, error } = require("./logger");
const ingestRoutes = require("./routes/ingest");
const publicRoutes = require("./routes/public");

const app = express();
const PORT = parseInt(process.env.PORT || "8787", 10) || 8787;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";
const PROJECT_ROOT = path.resolve(__dirname, "..");

app.use(requestLogger);
app.use(cors({ origin: ALLOWED_ORIGIN }));
app.use(express.json({ limit: "2mb" }));

// basic safety headers
app.use((req, res, next) => {
  res.set("X-Content-Type-Options", "nosniff");
  next();
});

// API info (ไม่เปิดเผย key)
app.get("/api/info", (req, res) => {
  res.json({
    name: "Tradertoolsth Signal Server",
    endpoints: [
      "GET  /api/health",
      "GET  /api/latest",
      "GET  /api/history?limit=50",
      "GET  /api/stats?count=100",
      "GET  /api/market",
      "POST /api/signal   (x-api-key)",
      "POST /api/status   (x-api-key)",
      "POST /api/market   (x-api-key)",
    ],
  });
});

app.use("/api", publicRoutes.router);
app.use("/api", ingestRoutes);
app.use(express.static(PROJECT_ROOT, {
  extensions: ["html"],
  index: "index.html",
  maxAge: "0",
}));

// 404
app.use((req, res) => {
  res.status(404).json({ error: "not found", path: req.originalUrl });
});

// centralized error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  error("express", `${req.method} ${req.originalUrl} -> ${err.message}`);
  if (err.type === "entity.parse.failed" || err.type === "entity.too.large") {
    return res.status(400).json({ error: "invalid JSON body", detail: err.message });
  }
  res.status(500).json({ error: "internal server error" });
});

const server = app.listen(PORT, "0.0.0.0", () => {
  info("server", `listening on http://0.0.0.0:${PORT} (cors=${ALLOWED_ORIGIN})`);
});

function shutdown(sig) {
  info("server", `${sig} received, shutting down...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

module.exports = app;
