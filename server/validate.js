"use strict";
// ============================================================
// validate.js - lean payload validators (no external deps)
// คืน { ok, value, errors } โดย value คือ normalized payload
// ============================================================

const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const isStr = (v, min = 1, max = 64) => typeof v === "string" && v.length >= min && v.length <= max;
const isInt = (v) => Number.isInteger(v);

function num(v) {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function int(v) {
  const n = typeof v === "string" ? parseInt(v, 10) : v;
  return Number.isInteger(n) ? n : null;
}

function dir(v) {
  const s = String(v || "").toUpperCase();
  return s === "BUY" || s === "SELL" ? s : null;
}

// timeframe: ปกติ M1/M5/M15/H1 ฯลฯ — อนุญาต 1-8 ตัวอักษร ไม่งั้น ""
function timeframe(v) {
  if (v === undefined || v === null || v === "") return "";
  const s = String(v).toUpperCase();
  return /^[A-Z0-9]{1,8}$/.test(s) ? s : null;
}

// ---- signal payload ----
function validateSignal(body) {
  const errors = [];
  const now = Math.floor(Date.now() / 1000);

  if (!isStr(body.id, 1, 128)) errors.push("id required (string <=128)");
  if (!isStr(body.symbol, 1, 32)) errors.push("symbol required (string <=32)");

  const tf = timeframe(body.timeframe);
  if (body.timeframe !== undefined && body.timeframe !== null && body.timeframe !== "" && tf === null)
    errors.push("timeframe must be 1-8 alphanumeric chars (e.g. M1, M5, H1)");

  const direction = dir(body.direction);
  if (!direction) errors.push("direction must be BUY or SELL");

  const signal_time = int(body.signal_time);
  if (signal_time === null) errors.push("signal_time must be integer (epoch seconds)");

  const entry = num(body.entry);
  const sl = num(body.sl);
  if (entry === null) errors.push("entry must be a number");
  if (sl === null) errors.push("sl must be a number");

  const tp1 = num(body.tp1), tp2 = num(body.tp2), tp3 = num(body.tp3), tp4 = num(body.tp4);
  if (tp1 === null) errors.push("tp1 must be a number");
  if (tp2 === null) errors.push("tp2 must be a number");
  if (tp3 === null) errors.push("tp3 must be a number");
  if (tp4 === null) errors.push("tp4 must be a number");

  const macd = body.macd === undefined || body.macd === null ? null : num(body.macd);
  if (macd === null && body.macd !== undefined && body.macd !== null)
    errors.push("macd must be a number or null");

  // objects: optional JSON blob ของ visible chart objects จาก EA (arrow/rr_box/level_*)
  // เก็บเป็น string ตามที่ส่งมา + validate consistency กับ direction (ก่อน errors return)
  let objectsStr = "";
  if (body.objects !== undefined && body.objects !== null) {
    if (typeof body.objects === "string") {
      objectsStr = body.objects;
    } else if (typeof body.objects === "object") {
      try { objectsStr = JSON.stringify(body.objects); } catch (_) { objectsStr = ""; }
    }
  }
  // Validate consistency: arrow.is_buy + arrow.code ต้องตรงกับ direction
  // ป้องกัน payload ขัดกันเอง (เช่น direction=SELL แต่ arrow.is_buy=true)
  if (objectsStr && direction) {
    try {
      const o = JSON.parse(objectsStr);
      if (o && o.arrow) {
        const expectedIsBuy = direction === "BUY";
        if (o.arrow.is_buy !== expectedIsBuy) {
          errors.push(`objects.arrow.is_buy (${o.arrow.is_buy}) mismatch direction (${direction})`);
        }
        const expectedCode = expectedIsBuy ? 233 : 234;
        if (o.arrow.code !== expectedCode) {
          errors.push(`objects.arrow.code (${o.arrow.code}) mismatch direction (${direction}, expected ${expectedCode})`);
        }
      }
    } catch (_) { /* ignore parse error — ไม่ใช่ valid JSON ก็ผ่านไป */ }
  }

  if (errors.length) return { ok: false, errors };

  const value = {
    id: String(body.id),
    symbol: String(body.symbol).toUpperCase(),
    timeframe: tf || "",
    direction,
    signal_time: signal_time === null ? now : signal_time,
    entry, sl,
    tp1, tp2, tp3, tp4,
    macd,
    is_reentry: body.is_reentry ? 1 : 0,
    status: isStr(body.status, 1, 32) ? String(body.status).toUpperCase() : "ACTIVE",
    result: ["OPEN", "WIN", "LOSS"].includes(String(body.result || "").toUpperCase())
      ? String(body.result).toUpperCase()
      : "OPEN",
    tp1_status: [-1, 0, 1].includes(int(body.tp1_status)) ? int(body.tp1_status) : 0,
    tp2_status: [-1, 0, 1].includes(int(body.tp2_status)) ? int(body.tp2_status) : 0,
    tp3_status: [-1, 0, 1].includes(int(body.tp3_status)) ? int(body.tp3_status) : 0,
    tp4_status: [-1, 0, 1].includes(int(body.tp4_status)) ? int(body.tp4_status) : 0,
    source: isStr(body.source, 0, 64) ? String(body.source) : null,
    objects: objectsStr,
    created_at: now,
    updated_at: now,
  };
  return { ok: true, value };
}

// ---- chart_meta payload ----
// visual config ของ chart instance (symbol+timeframe) จาก EA
function validateChartMeta(body) {
  const errors = [];
  if (!isStr(body.symbol, 1, 32)) errors.push("symbol required");

  const tf = timeframe(body.timeframe);
  if (body.timeframe !== undefined && body.timeframe !== null && body.timeframe !== "" && tf === null)
    errors.push("timeframe must be 1-8 alphanumeric chars");

  const extend_bars = int(body.extend_bars);
  const text_offset_bars = int(body.text_offset_bars);
  const win_target = ["NONE", "TP1", "TP2", "TP3", "TP4"].includes(String(body.win_target || "NONE").toUpperCase())
    ? String(body.win_target).toUpperCase()
    : "NONE";

  const bool01 = (v) => v ? 1 : 0;
  const broker_time = int(body.broker_time);

  if (errors.length) return { ok: false, errors };

  const value = {
    symbol: String(body.symbol).toUpperCase(),
    timeframe: tf || "",
    extend_bars: extend_bars === null ? null : extend_bars,
    text_offset_bars: text_offset_bars === null ? null : text_offset_bars,
    win_target,
    show_rr_boxes: bool01(body.show_rr_boxes),
    show_entry:    bool01(body.show_entry),
    show_sl:       bool01(body.show_sl),
    show_tp1:      bool01(body.show_tp1),
    show_tp2:      bool01(body.show_tp2),
    show_tp3:      bool01(body.show_tp3),
    show_tp4:      bool01(body.show_tp4),
    max_hist_signals: int(body.max_hist_signals) === null ? null : int(body.max_hist_signals),
    broker_time: broker_time === null ? null : broker_time,
    updated_at: Math.floor(Date.now() / 1000),
  };
  return { ok: true, value };
}

// ---- status payload ----
function validateStatus(body) {
  const errors = [];
  if (!isStr(body.id, 1, 128)) errors.push("id required");

  const status = body.status === undefined || body.status === null
    ? null
    : (isStr(body.status, 1, 32) ? String(body.status).toUpperCase() : null);
  if (body.status !== undefined && body.status !== null && status === null)
    errors.push("status must be a non-empty string");

  const result = ["OPEN", "WIN", "LOSS", undefined, null].includes(
    typeof body.result === "string" ? body.result.toUpperCase() : body.result
  )
    ? (body.result ? String(body.result).toUpperCase() : null)
    : null;
  if (body.result !== undefined && body.result !== null && result === null)
    errors.push("result must be OPEN|WIN|LOSS");

  const tp = (v) => (v === undefined || v === null ? null : ([-1, 0, 1].includes(int(v)) ? int(v) : null));
  const tp1_status = tp(body.tp1_status);
  const tp2_status = tp(body.tp2_status);
  const tp3_status = tp(body.tp3_status);
  const tp4_status = tp(body.tp4_status);
  if (body.tp1_status !== undefined && tp1_status === null) errors.push("tp1_status must be -1|0|1");
  if (body.tp2_status !== undefined && tp2_status === null) errors.push("tp2_status must be -1|0|1");
  if (body.tp3_status !== undefined && tp3_status === null) errors.push("tp3_status must be -1|0|1");
  if (body.tp4_status !== undefined && tp4_status === null) errors.push("tp4_status must be -1|0|1");

  if (errors.length) return { ok: false, errors };

  const value = {
    id: String(body.id),
    status,
    result,
    tp1_status, tp2_status, tp3_status, tp4_status,
    updated_at: Math.floor(Date.now() / 1000),
  };
  return { ok: true, value };
}

// ---- market payload (single timeframe instance) ----
function validateMarket(body) {
  const errors = [];
  if (!isStr(body.symbol, 1, 32)) errors.push("symbol required");

  const tf = timeframe(body.timeframe);
  if (body.timeframe !== undefined && body.timeframe !== null && body.timeframe !== "" && tf === null)
    errors.push("timeframe must be 1-8 alphanumeric chars (e.g. M1, M5)");

  const bid = num(body.bid), ask = num(body.ask);
  const broker_time = int(body.broker_time);

  let candles = body.candles;
  // รองรับ legacy m1_candles/m5_candles ด้วย (backwards compat)
  if (candles === undefined) {
    candles = body.m1_candles !== undefined ? body.m1_candles : body.m5_candles;
  }
  if (candles !== undefined && candles !== null) {
    if (!Array.isArray(candles)) { errors.push("candles must be an array"); candles = null; }
    else candles = candles.map(normalizeCandle).filter(Boolean);
  }

  if (errors.length) return { ok: false, errors };

  const MAX = parseInt(process.env.MAX_CANDLES || "120", 10) || 120;
  if (Array.isArray(candles) && candles.length > MAX) candles = candles.slice(-MAX);

  const value = {
    symbol: String(body.symbol).toUpperCase(),
    timeframe: tf || "",
    bid: bid === null ? null : bid,
    ask: ask === null ? null : ask,
    spread: int(body.spread) === null ? null : int(body.spread),
    broker_time: broker_time === null ? null : broker_time,
    candles: candles ? JSON.stringify(candles) : "",
    updated_at: Math.floor(Date.now() / 1000),
  };
  return { ok: true, value };
}

function normalizeCandle(c) {
  if (!c || typeof c !== "object") return null;
  const o = num(c.open), h = num(c.high), l = num(c.low), cl = num(c.close);
  const t = int(c.time);
  if (o === null || h === null || l === null || cl === null) return null;
  return {
    time: t === null ? null : t,
    open: o, high: h, low: l, close: cl,
  };
}

// ---- zones payload (DR zones resistance/support จาก EA) ----
function validateZones(body) {
  const errors = [];
  if (!isStr(body.symbol, 1, 32)) errors.push("symbol required");

  const tf = timeframe(body.timeframe);
  if (body.timeframe !== undefined && body.timeframe !== null && body.timeframe !== "" && tf === null)
    errors.push("timeframe must be 1-8 alphanumeric chars");

  if (!Array.isArray(body.zones)) {
    errors.push("zones must be an array");
  } else {
    body.zones.forEach((z, i) => {
      if (!z || typeof z !== "object") { errors.push(`zone[${i}] must be object`); return; }
      if (!["resistance", "support"].includes(String(z.type || "").toLowerCase()))
        errors.push(`zone[${i}].type must be resistance|support`);
      const t1 = int(z.time1), t2 = int(z.time2);
      if (t1 === null) errors.push(`zone[${i}].time1 must be integer`);
      if (t2 === null) errors.push(`zone[${i}].time2 must be integer`);
      const hi = num(z.hi), lo = num(z.lo);
      if (hi === null) errors.push(`zone[${i}].hi must be a number`);
      if (lo === null) errors.push(`zone[${i}].lo must be a number`);
    });
  }

  if (errors.length) return { ok: false, errors };

  const broker_time = int(body.broker_time);
  const value = {
    symbol: String(body.symbol).toUpperCase(),
    timeframe: tf || "",
    zones: JSON.stringify(body.zones.map(z => ({
      type: String(z.type).toLowerCase(),
      time1: int(z.time1),
      time2: int(z.time2),
      hi: num(z.hi),
      lo: num(z.lo),
      color: z.color || (String(z.type).toLowerCase() === "resistance" ? "red" : "green"),
    }))),
    broker_time: broker_time === null ? null : broker_time,
    updated_at: Math.floor(Date.now() / 1000),
  };
  return { ok: true, value };
}

module.exports = { validateSignal, validateStatus, validateMarket, validateChartMeta, validateZones };
