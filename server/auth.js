"use strict";
// ============================================================
// auth.js - API key middleware สำหรับ route ที่เขียน (POST)
// EA ส่ง header: x-api-key: <API_KEY>
// เปรียบเทียบแบบ timing-safe เพื่อลด timing attack
// ============================================================

const crypto = require("crypto");
const logger = require("./logger");

const EXPECTED_KEY = (process.env.API_KEY || "").toString();

if (!EXPECTED_KEY) {
  logger.warn("auth", "API_KEY ไม่ถูกตั้งใน .env  route POST จะถูกปฏิเสธทั้งหมด");
}

function keysEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function requireApiKey(req, res, next) {
  if (!EXPECTED_KEY) {
    return res.status(503).json({ error: "server API_KEY not configured" });
  }
  const provided = req.get("x-api-key") || (req.query && req.query.key) || "";
  if (!provided || !keysEqual(provided, EXPECTED_KEY)) {
    logger.warn("auth", `rejected ${req.method} ${req.originalUrl} (no/bad key, ip=${req.ip})`);
    return res.status(401).json({ error: "invalid or missing api key" });
  }
  next();
}

module.exports = { requireApiKey };
