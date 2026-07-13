"use strict";
// ============================================================
// routes/public.js - GET endpoints (อ่าน, ไม่ต้องมี API key)
// /api/health, /api/instances, /api/latest, /api/history, /api/stats, /api/market
// รองรับ ?symbol=&timeframe= (instance key = symbol + timeframe)
// ============================================================

const express = require("express");
const { stmts, db } = require("../db");
const logger = require("../logger");

const router = express.Router();
const startedAt = Date.now();

const STALE_SECONDS = parseInt(process.env.STALE_SECONDS || "15", 10) || 15;
const SIGNAL_OLD_SECONDS = parseInt(process.env.SIGNAL_OLD_SECONDS || "3600", 10) || 3600;
const TEST_SOURCES = (process.env.TEST_SOURCES || "seed-test,test").split(",").map(s => s.trim().toLowerCase());

function parseTf(v) {
  if (!v) return null;
  const s = String(v).toUpperCase();
  return /^[A-Z0-9]{1,8}$/.test(s) ? s : null;
}

function shapeMarket(row) {
  if (!row) return null;
  let candles = [];
  try { candles = row.candles ? JSON.parse(row.candles) : []; } catch (_) {}
  return {
    symbol: row.symbol,
    timeframe: row.timeframe || "",
    bid: row.bid,
    ask: row.ask,
    spread: row.spread,
    broker_time: row.broker_time,
    updated_at: row.updated_at,
    age_seconds: Math.max(0, Math.floor(Date.now() / 1000) - row.updated_at),
    candles,
  };
}

function signalKind(row) {
  if (!row) return null;
  const src = (row.source || "").toLowerCase();
  if (TEST_SOURCES.some(t => src.includes(t))) return "TEST";
  if (row.result === "WIN" || row.result === "LOSS") return "CLOSED";
  // ใช้ updated_at เป็น refTime เสมอ — เป็นเวลา server ที่ EA ส่งเข้ามาล่าสุด (reliable)
  // signal_time เป็น broker time ที่อาจเพี้ยน/อนาคต จึงไม่ใช้เป็นตัวตัดสิน age
  const now = Math.floor(Date.now() / 1000);
  const refTime = row.updated_at || row.created_at || now;
  const age = now - refTime;
  if (age > SIGNAL_OLD_SECONDS) return "OLD";
  return "ACTIVE";
}

function signalAgeSeconds(row) {
  if (!row) return null;
  const now = Math.floor(Date.now() / 1000);
  const refTime = row.updated_at || row.created_at || now;
  return Math.max(0, now - refTime);
}

function shapeSignal(row) {
  if (!row) return null;
  // objects: JSON blob ของ visible chart objects จาก EA (parse ถ้ามี)
  let objects = null;
  if (row.objects) {
    try { objects = JSON.parse(row.objects); } catch (_) { objects = null; }
  }
  return {
    id: row.id,
    symbol: row.symbol,
    timeframe: row.timeframe || "",
    direction: row.direction,
    signal_time: row.signal_time,
    entry: row.entry,
    sl: row.sl,
    tp1: row.tp1, tp2: row.tp2, tp3: row.tp3, tp4: row.tp4,
    macd: row.macd,
    is_reentry: !!row.is_reentry,
    status: row.status,
    result: row.result,
    tp_status: { tp1: row.tp1_status, tp2: row.tp2_status, tp3: row.tp3_status, tp4: row.tp4_status },
    source: row.source,
    updated_at: row.updated_at,
    age_seconds: signalAgeSeconds(row),
    kind: signalKind(row),
    objects,
  };
}

// GET /api/health
router.get("/health", (req, res) => {
  // ใช้ snapshot ที่ live ที่สุด (updated_at ใหม่สุด = EA ที่รันอยู่ตอนนี้)
  const allMarkets = db.prepare(`SELECT * FROM market_snapshots ORDER BY updated_at DESC`).all();
  const now = Math.floor(Date.now() / 1000);
  // เลือก snapshot ที่ไม่เก่าเกิน stale threshold ก่อน ถ้าไม่มีให้ใช้ใหม่สุดเลย
  const liveMarket = allMarkets.find(m => (now - m.updated_at) <= STALE_SECONDS) || allMarkets[0] || null;
  const last_market_age = liveMarket ? now - liveMarket.updated_at : null;

  let feed = "OFFLINE";
  if (liveMarket) feed = last_market_age <= STALE_SECONDS ? "LIVE" : "STALE";

  res.json({
    status: "ok",
    uptime_s: Math.floor((Date.now() - startedAt) / 1000),
    feed,
    stale_seconds: STALE_SECONDS,
    signal_old_seconds: SIGNAL_OLD_SECONDS,
    signal_count: stmts.countSignals.get().c,
    resolved_count: stmts.countResolved.get().c,
    last_market_age_s: last_market_age,
    server_time: now,
  });
});

// GET /api/instances — รายการ symbol+timeframe ที่ active
// market_symbol/timeframe = market snapshot live ล่าสุด (EA ที่กำลังส่งราคาอยู่จริง)
// ไม่ใช้ signal history เป็นตัวกำหนด primary เพราะ signal อาจเก่าหลายชม.
router.get("/instances", (req, res) => {
  const now = Math.floor(Date.now() / 1000);
  const cutoff = now - SIGNAL_OLD_SECONDS;
  const sigRows = stmts.getActiveInstances.all(cutoff);
  const mktCutoff = now - (STALE_SECONDS * 4);
  const mktRows = stmts.getMarketInstances.all(mktCutoff);
  // รวม unique
  const seen = new Set();
  const instances = [];
  for (const r of sigRows) {
    const k = r.symbol + ":" + (r.timeframe || "");
    if (!seen.has(k)) { seen.add(k); instances.push({ symbol: r.symbol, timeframe: r.timeframe || "" }); }
  }
  for (const r of mktRows) {
    const k = r.symbol + ":" + (r.timeframe || "");
    if (!seen.has(k)) { seen.add(k); instances.push({ symbol: r.symbol, timeframe: r.timeframe || "" }); }
  }

  // primary = market snapshot live ล่าสุด (preferred) หรือ signal latest ถ้าไม่มี market
  const allMarkets = db.prepare(`SELECT * FROM market_snapshots ORDER BY updated_at DESC`).all();
  const liveMarket = allMarkets.find(m => (now - m.updated_at) <= STALE_SECONDS) || allMarkets[0] || null;
  // Bind the website to the timeframe that produced the newest real signal.
  // This prevents simultaneous M1/M5 price heartbeats from flipping the UI context.
  const liveContexts = new Set(
    allMarkets
      .filter(m => (now - m.updated_at) <= STALE_SECONDS)
      .map(m => `${m.symbol}:${m.timeframe || ""}`)
  );
  const latestSignalContext = db.prepare(
    `SELECT * FROM signals ORDER BY signal_time DESC LIMIT 50`
  ).all().find(s =>
    signalKind(s) !== "TEST" &&
    liveContexts.has(`${s.symbol}:${s.timeframe || ""}`)
  );

  let primarySymbol = null;
  let primaryTf = null;

  if (latestSignalContext) {
    primarySymbol = latestSignalContext.symbol;
    primaryTf     = latestSignalContext.timeframe || "";
  } else if (liveMarket) {
    primarySymbol = liveMarket.symbol;
    primaryTf     = liveMarket.timeframe || "";
  } else {
    // fallback: signal ล่าสุด (NON-TEST)
    const latestSig = db.prepare(
      `SELECT * FROM signals ORDER BY signal_time DESC LIMIT 20`
    ).all().find(s => signalKind(s) !== "TEST");
    if (latestSig) {
      primarySymbol = latestSig.symbol;
      primaryTf     = latestSig.timeframe || "";
    }
  }

  res.json({
    instances,
    market_symbol:    primarySymbol,
    market_timeframe: primaryTf,
  });
});

// GET /api/latest?symbol=&timeframe=&active_only=0|1
// - active_only=1 (default) → ค้น ACTIVE โดยตรงที่ SQL level
//   (result=OPEN + updated_at >= now-SIGNAL_OLD_SECONDS + exclude TEST)
//   เรียงด้วย updated_at DESC เพราะ signal_time อาจเป็น broker time ที่เพี้ยน
//   ถ้ามีหลาย ACTIVE ใน context → เอาตัวล่าสุด (updated_at DESC LIMIT 1)
// - active_only=0 → คืน latest รวมทุก kind (debug/history)
router.get("/latest", (req, res) => {
  const wantSym = req.query.symbol ? req.query.symbol.toString().toUpperCase() : null;
  const wantTf = parseTf(req.query.timeframe);
  const activeOnly = req.query.active_only === "0" || req.query.active_only === "false" ? false : true;
  const now = Math.floor(Date.now() / 1000);
  const activeCutoff = now - SIGNAL_OLD_SECONDS;

  let row = null;
  if (activeOnly) {
    // Query ACTIVE โดยตรง (filter ที่ SQL) — ไม่มีการหยิบ latest ก่อนแล้ว filter ทิ้ง
    if (wantSym && wantTf) {
      row = stmts.getLatestActiveSignalBySymbolTf.get(wantSym, wantTf, activeCutoff);
    } else if (wantSym) {
      row = stmts.getLatestActiveSignalBySymbol.get(wantSym, activeCutoff);
    } else {
      // ไม่ระบุ → auto-follow market snapshot live ล่าสุด
      const m = stmts.getMarket.get();
      if (m && m.symbol) {
        row = stmts.getLatestActiveSignalBySymbolTf.get(m.symbol, m.timeframe || "", activeCutoff);
      } else {
        row = stmts.getLatestActiveSignal.get(activeCutoff);
      }
    }
    // ป้องกัน double-check: signalKind ต้องเป็น ACTIVE จริง
    if (row && signalKind(row) !== "ACTIVE") row = null;
  } else {
    // debug mode: latest รวมทุก kind (TEST ก็ filter ทิ้ง)
    if (wantSym && wantTf) {
      row = stmts.getLatestSignalBySymbolTf.get(wantSym, wantTf);
    } else if (wantSym) {
      row = stmts.getLatestSignalBySymbol.get(wantSym);
    } else {
      const m = stmts.getMarket.get();
      if (m && m.symbol) {
        row = stmts.getLatestSignalBySymbolTf.get(m.symbol, m.timeframe || "");
      }
    }
    if (row && signalKind(row) === "TEST") row = null;
  }

  res.json({ signal: row ? shapeSignal(row) : null });
});

// GET /api/history?limit=50&symbol=&timeframe=
// - ระบุ symbol+timeframe → ค้นเฉพาะคู่นั้น ถ้าไม่มี → คืน empty (ห้าม fallback ข้าม context)
router.get("/history", (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit || "50", 10) || 50, 1), 500);
  const wantSym = req.query.symbol ? req.query.symbol.toString().toUpperCase() : null;
  const wantTf = parseTf(req.query.timeframe);
  let rows;
  if (wantSym && wantTf) {
    rows = stmts.getHistoryBySymbolTf.all(wantSym, wantTf, limit);
  } else if (wantSym) {
    rows = stmts.getHistoryBySymbol.all(wantSym, limit);
  } else {
    rows = stmts.getHistory.all(limit);
  }
  res.json({ count: rows.length, signals: rows.map(shapeSignal) });
});

// GET /api/stats?count=100&symbol=&timeframe=
// - ระบุ symbol+timeframe → ค้นเฉพาะคู่นั้น ถ้าไม่มี → sample_size=0 (ห้าม fallback ข้าม context)
router.get("/stats", (req, res) => {
  const count = Math.min(Math.max(parseInt(req.query.count || "100", 10) || 100, 1), 5000);
  const wantSym = req.query.symbol ? req.query.symbol.toString().toUpperCase() : null;
  const wantTf = parseTf(req.query.timeframe);
  let rows;
  if (wantSym && wantTf) {
    rows = stmts.getRecentResolvedBySymbolTf.all(wantSym, wantTf, count);
  } else if (wantSym) {
    rows = stmts.getRecentResolvedBySymbol.all(wantSym, count);
  } else {
    rows = stmts.getRecentResolved.all(count);
  }

  const acc = [1, 2, 3, 4].map((tp) => ({ tp: `TP${tp}`, win: 0, loss: 0 }));
  for (const r of rows) {
    const statuses = [r.tp1_status, r.tp2_status, r.tp3_status, r.tp4_status];
    statuses.forEach((s, i) => {
      if (s === 1) acc[i].win++;
      else if (s === -1) acc[i].loss++;
    });
  }
  const out = acc.map((a) => {
    const decided = a.win + a.loss;
    const winrate = decided > 0 ? Math.round((a.win / decided) * 100) : null;
    return { ...a, winrate };
  });
  res.json({
    sample_size: rows.length,
    symbol: wantSym || "ALL",
    timeframe: wantTf || "ALL",
    targets: out,
  });
});

// GET /api/market?symbol=&timeframe=
// - ระบุ symbol+timeframe → ค้นเฉพาะคู่นั้น ถ้าไม่มี → คืน null (ห้าม fallback ข้าม context)
// - ระบุ symbol อย่างเดียว → ค้นเฉพาะ symbol
// - ไม่ระบุ → ใช้ global latest (สำหรับ health/healthcheck)
router.get("/market", (req, res) => {
  const wantSym = req.query.symbol ? req.query.symbol.toString().toUpperCase() : null;
  const wantTf = parseTf(req.query.timeframe);
  let row = null;
  if (wantSym && wantTf) row = stmts.getMarketBySymbolTf.get(wantSym, wantTf);
  else if (wantSym) row = stmts.getMarketBySymbol.get(wantSym);
  else row = stmts.getMarket.get();
  res.json({ market: shapeMarket(row) });
});

// GET /api/chart_meta?symbol=&timeframe=
// คืน visual config ของ chart instance (extend_bars, win_target, show_* flags)
// ถ้าไม่มี meta ของ context นั้น → คืน null (frontend จะ fallback default)
router.get("/chart_meta", (req, res) => {
  const wantSym = req.query.symbol ? req.query.symbol.toString().toUpperCase() : null;
  const wantTf = parseTf(req.query.timeframe);
  let row = null;
  if (wantSym && wantTf) row = stmts.getChartMetaBySymbolTf.get(wantSym, wantTf);
  else if (wantSym) {
    // symbol-only: หา meta ล่าสุดของ symbol นี้ทุก tf
    row = db.prepare(`SELECT * FROM chart_meta WHERE symbol = ? ORDER BY updated_at DESC LIMIT 1`).get(wantSym);
  } else {
    row = db.prepare(`SELECT * FROM chart_meta ORDER BY updated_at DESC LIMIT 1`).get();
  }
  if (!row) return res.json({ chart_meta: null });
  res.json({
    chart_meta: {
      symbol: row.symbol,
      timeframe: row.timeframe || "",
      extend_bars: row.extend_bars,
      text_offset_bars: row.text_offset_bars,
      win_target: row.win_target || "NONE",
      show_rr_boxes: !!row.show_rr_boxes,
      show_entry: !!row.show_entry,
      show_sl: !!row.show_sl,
      show_tp1: !!row.show_tp1,
      show_tp2: !!row.show_tp2,
      show_tp3: !!row.show_tp3,
      show_tp4: !!row.show_tp4,
      max_hist_signals: row.max_hist_signals,
      broker_time: row.broker_time,
      updated_at: row.updated_at,
    },
  });
});

// GET /api/zones?symbol=&timeframe=
// คืน DR zones (resistance/support) ของ context — frontend วาดจาก payload นี้เท่านั้น
router.get("/zones", (req, res) => {
  const wantSym = req.query.symbol ? req.query.symbol.toString().toUpperCase() : null;
  const wantTf = parseTf(req.query.timeframe);
  let row = null;
  if (wantSym && wantTf) row = stmts.getZonesBySymbolTf.get(wantSym, wantTf);
  else if (wantSym) row = db.prepare(`SELECT * FROM zones WHERE symbol = ? ORDER BY updated_at DESC LIMIT 1`).get(wantSym);
  else row = db.prepare(`SELECT * FROM zones ORDER BY updated_at DESC LIMIT 1`).get();
  if (!row) return res.json({ zones: [] });
  let zonesArr = [];
  try { zonesArr = JSON.parse(row.zones); } catch (_) { zonesArr = []; }
  res.json({
    zones: zonesArr,
    symbol: row.symbol,
    timeframe: row.timeframe || "",
    broker_time: row.broker_time,
    updated_at: row.updated_at,
  });
});

module.exports = { router, shapeSignal, shapeMarket };
