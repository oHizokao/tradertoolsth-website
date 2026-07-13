"use strict";
// ============================================================
// logger.js - Lightweight request/error logger (no external deps)
// ใช้ console ด้วยรูปแบบคงที่ อ่านง่ายใน terminal และ MT5 Journal-style
// ============================================================

const ts = () => new Date().toISOString();

function info(tag, msg, extra) {
  if (extra === undefined) console.log(`[${ts()}] [INFO ] [${tag}] ${msg}`);
  else console.log(`[${ts()}] [INFO ] [${tag}] ${msg}`, extra);
}

function warn(tag, msg, extra) {
  if (extra === undefined) console.warn(`[${ts()}] [WARN ] [${tag}] ${msg}`);
  else console.warn(`[${ts()}] [WARN ] [${tag}] ${msg}`, extra);
}

function error(tag, msg, extra) {
  if (extra === undefined) console.error(`[${ts()}] [ERROR] [${tag}] ${msg}`);
  else console.error(`[${ts()}] [ERROR] [${tag}] ${msg}`, extra);
}

// Express middleware: log method/path/status/duration ของทุก request
function requestLogger(req, res, next) {
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    const tag = "http";
    const line = `${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`;
    if (res.statusCode >= 500) error(tag, line);
    else if (res.statusCode >= 400) warn(tag, line);
    else info(tag, line);
  });
  next();
}

module.exports = { info, warn, error, requestLogger };
