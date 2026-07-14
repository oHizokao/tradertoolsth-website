"use strict";
// ============================================================
// routes/ingest.js - POST endpoints (ต้องมี API key)
// EA เรียก: /api/signal, /api/status, /api/market
// ============================================================

const express = require("express");
const { stmts, tx } = require("../db");
const { requireApiKey } = require("../auth");
const { validateSignal, validateStatus, validateMarket, validateChartMeta, validateZones } = require("../validate");
const { evaluateCandles, hasLifecycleChange, lifecycleFromStates, statusPatch } = require("../signal-lifecycle");
const logger = require("../logger");

const router = express.Router();

// POST /api/signal - สัญญาณใหม่หรืออัปเดต (UPSERT ตาม id)
router.post("/signal", requireApiKey, (req, res, next) => {
  try {
    const v = validateSignal(req.body || {});
    if (!v.ok) return res.status(400).json({ error: "validation failed", details: v.errors });

    const existed = stmts.getSignalById.get(v.value.id);
    const previous = stmts.getLatestSignalBySymbolTf.get(v.value.symbol, v.value.timeframe);
    // ถ้ามีอยู่แล้ว ให้เก็บ created_at เดิม ไม่เขียนทับ status/result (ส่ง /api/status แยก)
    if (existed) {
      v.value.created_at = existed.created_at;
      v.value.status = existed.status;
      v.value.result = existed.result;
      v.value.tp1_status = existed.tp1_status;
      v.value.tp2_status = existed.tp2_status;
      v.value.tp3_status = existed.tp3_status;
      v.value.tp4_status = existed.tp4_status;
    }

    tx(() => {
      if (!existed && previous && previous.id !== v.value.id) {
        const previousState = lifecycleFromStates(previous);
        if (!previousState.terminal && String(previous.status || "").toUpperCase() !== "REPLACED") {
          stmts.markSignalReplaced.run(v.value.updated_at, previous.id);
        }
      }
      stmts.upsertSignal.run(v.value);
      stmts.insertEvent.run("signal", JSON.stringify(v.value), v.value.updated_at);
    })();

    logger.info("ingest", `signal ${v.value.id} ${v.value.direction} ${v.value.symbol} ${existed ? "(updated)" : "(new)"}`);
    res.json({ ok: true, id: v.value.id, action: existed ? "updated" : "created" });
  } catch (e) {
    next(e);
  }
});

// POST /api/status - อัปเดตสถานะ TP/SL ของ signal id ที่มีอยู่
router.post("/status", requireApiKey, (req, res, next) => {
  try {
    const v = validateStatus(req.body || {});
    if (!v.ok) return res.status(400).json({ error: "validation failed", details: v.errors });

    const existed = stmts.getSignalById.get(v.value.id);
    if (!existed) {
      return res.status(404).json({ error: `signal id not found: ${v.value.id}` });
    }
    if (String(existed.status || "").toUpperCase() === "REPLACED") {
      return res.json({ ok: true, id: existed.id, status: "REPLACED", ignored: "signal already replaced" });
    }

    const next = statusPatch(existed, v.value);
    const update = { ...next, id: existed.id, updated_at: v.value.updated_at };

    tx(() => {
      stmts.updateStatus.run(update);
      stmts.insertEvent.run("status", JSON.stringify(update), update.updated_at);
    })();

    logger.info("ingest", `status ${update.id} -> ${update.status}`);
    res.json({ ok: true, id: update.id, status: update.status, result: update.result, best_tp: next.bestTp });
  } catch (e) {
    next(e);
  }
});

// POST /api/market - snapshot ราคา + OHLC M1/M5
router.post("/market", requireApiKey, (req, res, next) => {
  try {
    const v = validateMarket(req.body || {});
    if (!v.ok) return res.status(400).json({ error: "validation failed", details: v.errors });

    let lifecycle = null;
    tx(() => {
      stmts.upsertMarket.run(v.value);
      stmts.insertEvent.run("market", JSON.stringify(v.value), v.value.updated_at);

      const signal = stmts.getLatestSignalBySymbolTf.get(v.value.symbol, v.value.timeframe);
      if (signal && String(signal.status || "").toUpperCase() !== "REPLACED") {
        let candles = [];
        try { candles = v.value.candles ? JSON.parse(v.value.candles) : []; } catch (_) {}
        const nextState = evaluateCandles(signal, candles);
        if (hasLifecycleChange(signal, nextState)) {
          const update = { ...nextState, id: signal.id, updated_at: v.value.updated_at };
          stmts.updateStatus.run(update);
          stmts.insertEvent.run("lifecycle", JSON.stringify(update), update.updated_at);
          lifecycle = { id: signal.id, status: nextState.status, result: nextState.result, best_tp: nextState.bestTp };
        }
      }
    })();

    res.json({ ok: true, symbol: v.value.symbol, lifecycle });
  } catch (e) {
    next(e);
  }
});

// POST /api/chart_meta - visual config ของ chart instance (extend_bars, win_target, show_* flags)
// EA ส่งครั้งเดียวตอน init + ส่งใหม่เมื่อมี signal ใหม่ (กันกรณี user เปลี่ยน inputs)
router.post("/chart_meta", requireApiKey, (req, res, next) => {
  try {
    const v = validateChartMeta(req.body || {});
    if (!v.ok) return res.status(400).json({ error: "validation failed", details: v.errors });

    tx(() => {
      stmts.upsertChartMeta.run(v.value);
      stmts.insertEvent.run("chart_meta", JSON.stringify(v.value), v.value.updated_at);
    })();

    logger.info("ingest", `chart_meta ${v.value.symbol}:${v.value.timeframe || ""} win=${v.value.win_target} ext=${v.value.extend_bars}`);
    res.json({ ok: true, symbol: v.value.symbol, timeframe: v.value.timeframe });
  } catch (e) {
    next(e);
  }
});

// POST /api/zones - DR zones resistance/support ของ chart instance (จาก EA BuildDRSeries)
// EA ส่งทุก new bar + ทุก market cycle เพื่อ keep zones fresh
router.post("/zones", requireApiKey, (req, res, next) => {
  try {
    const v = validateZones(req.body || {});
    if (!v.ok) return res.status(400).json({ error: "validation failed", details: v.errors });

    tx(() => {
      stmts.upsertZones.run(v.value);
      stmts.insertEvent.run("zones", JSON.stringify(v.value), v.value.updated_at);
    })();

    logger.info("ingest", `zones ${v.value.symbol}:${v.value.timeframe || ""} count=${JSON.parse(v.value.zones).length}`);
    res.json({ ok: true, symbol: v.value.symbol, timeframe: v.value.timeframe });
  } catch (e) {
    next(e);
  }
});

// POST /api/signal/bulk - bulk sync signals + statuses (EA historical scan)
// Body: { signals: [ { id, symbol, timeframe, direction, signal_time, entry, sl, tp1..tp4, macd, is_reentry,
//                       status, result, tp1_status..tp4_status, source } ] }
router.post("/signal/bulk", requireApiKey, (req, res, next) => {
  try {
    const signals = req.body?.signals;
    if (!Array.isArray(signals) || signals.length === 0) {
      return res.status(400).json({ error: "signals must be a non-empty array" });
    }

    let created = 0, updated = 0, errors = 0;

    tx(() => {
      for (const raw of signals) {
        try {
          const v = validateSignal(raw);
          if (!v.ok) { errors++; continue; }

          const existed = stmts.getSignalById.get(v.value.id);
          if (existed) {
            v.value.created_at = existed.created_at;
          } else {
            // signal ใหม่: ตั้ง created_at = signal_time เพื่อให้ age คำนวณถูกต้อง
            // ป้องกัน historical signals แสดงเป็น ACTIVE เพราะ created_at = ตอนนี้
            if (v.value.signal_time && v.value.signal_time < v.value.created_at) {
              v.value.created_at = v.value.signal_time;
            }
          }

          // A replaced signal is terminal for this website lifecycle. Do not let
          // a later EA replay revive it as ACTIVE.
          if (existed && String(existed.status || "").toUpperCase() === "REPLACED") {
            v.value.status = "REPLACED";
            v.value.result = "OPEN";
            v.value.tp1_status = existed.tp1_status;
            v.value.tp2_status = existed.tp2_status;
            v.value.tp3_status = existed.tp3_status;
            v.value.tp4_status = existed.tp4_status;
          } else {
            // bulk sync sends status/result and may restore authoritative EA history.
            if (raw.status)     v.value.status     = raw.status;
            if (raw.result)     v.value.result     = raw.result;
            if (raw.tp1_status !== undefined) v.value.tp1_status = raw.tp1_status;
            if (raw.tp2_status !== undefined) v.value.tp2_status = raw.tp2_status;
            if (raw.tp3_status !== undefined) v.value.tp3_status = raw.tp3_status;
            if (raw.tp4_status !== undefined) v.value.tp4_status = raw.tp4_status;
          }

          stmts.upsertSignal.run(v.value);
          if (existed) updated++; else created++;
        } catch (e) {
          errors++;
        }
      }
    })();

    logger.info("ingest", `bulk sync: ${created} created, ${updated} updated, ${errors} errors (total ${signals.length})`);
    res.json({ ok: true, created, updated, errors, total: signals.length });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
