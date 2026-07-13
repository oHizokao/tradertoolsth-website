// ============================================================
// Tradertoolsth Signal Terminal - frontend logic (v2)
// - กราฟเรียลไทม์ตาม market snapshot ที่ EA ส่ง
// - แยก signal panel ออกจากกราฟอย่างชัดเจน
// - แยก ACTIVE / OLD / CLOSED / TEST และไม่โชว์ test/demo เป็น signal จริง
// - รองรับหลาย symbol ผ่าน symbol selector + market symbol อัตโนมัติ
// ============================================================

const DEFAULT_API_BASE = window.location.protocol === "http:" || window.location.protocol === "https:"
  ? window.location.origin
  : "http://127.0.0.1:8787";
const API_BASE = (window.TRADETERTOOLSTH_API_BASE || DEFAULT_API_BASE).replace(/\/+$/, "");
// polling interval: เว็บ re-fetch API ทุก 60s (เดิม 3s รบกวนเกินไป)
// หมายเหตุ: candles/ราคายังขึ้นกับความถี่ที่ EA ส่ง market snapshot (InpWebsitePriceMs ใน EA)
const POLL_INTERVAL_MS = 60000;

const $ = (id) => document.getElementById(id);
const canvas = $("price-chart");
const chartWrap = $("chart-wrap");
const tooltip = $("chart-tooltip");
const timeframeButtons = document.querySelectorAll("[data-timeframe]");
const symbolSelect = $("symbol-select");

// ---- state ----
let timeframe = "M5";
let feed = { status: "OFFLINE", market: null, latest: null, history: null, stats: null, instances: [] };
let hasRealData = false;
let liveCandles = [];
let liveZones = [];             // DR zones จาก /api/zones (resistance/support) — วาดเป็น background
let selectedSymbol = null;
let activeSymbol = null;
let userPickedSymbol = false; // true = ผู้ใช้เลือก dropdown เอง, false = auto-follow EA

// ---- chart overlay state ----
let showPastSignals = false;   // default OFF — กราฟสะอาด เปิด toggle ถ้าต้องการ historical
let maxPastSignals  = 5;       // จำนวน historical signal สูงสุดที่จะวาดบนกราฟ
let chartMeta = null;          // visual config จาก EA (/api/chart_meta) — render ตาม 1:1

// ============================================================
// HELPERS
// ============================================================
const DASH = "—";
function fmtPrice(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return DASH;
  const digits = (Math.abs(v) >= 1000) ? 2 : (Math.abs(v) >= 10 ? 3 : 2);
  return Number(v).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
function fmtInt(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return DASH;
  return Number(v).toLocaleString("en-US");
}
function fmtTimeShort(epoch) {
  if (!epoch) return DASH;
  const d = new Date(epoch * 1000);
  return d.toLocaleString("th-TH", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}
function fmtAge(sec) {
  if (sec === null || sec === undefined) return DASH;
  if (sec < 60) return `${sec} วิ`;
  if (sec < 3600) return `${Math.floor(sec / 60)} นาที`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} ชม`;
  return `${Math.floor(sec / 86400)} วัน`;
}
function symbolIcon(sym) {
  if (!sym) return "?";
  const s = sym.toUpperCase();
  if (s.includes("XAU") || s.includes("GOLD")) return "Au";
  if (s.includes("BTC")) return "₿";
  if (s.includes("ETH")) return "Ξ";
  if (s.includes("EUR")) return "€";
  if (s.includes("GBP")) return "£";
  if (s.includes("JPY")) return "¥";
  return s.slice(0, 2);
}
function symbolDesc(sym) {
  if (!sym) return DASH;
  const s = sym.toUpperCase();
  if (s.includes("XAU")) return "Gold / US Dollar";
  if (s.includes("BTC")) return "Bitcoin / US Dollar";
  if (s.includes("ETH")) return "Ethereum / US Dollar";
  return sym;
}

// ============================================================
// DEMO DATA (fallback เฉพาะเมื่อไม่มี candles จริง)
// ============================================================
function seededRandom(seed) {
  let value = seed % 2147483647;
  return () => ((value = value * 16807 % 2147483647) - 1) / 2147483646;
}
function makeDemoCandles(mode, base) {
  const rand = seededRandom(Math.floor(base * 1000) % 9999);
  const count = mode === "M5" ? 68 : 82;
  const step = Math.max(base * 0.0008, 0.01);
  let close = base;
  const data = [];
  for (let i = 0; i < count; i++) {
    const open = close;
    close = open + (rand() - 0.48) * step;
    const high = Math.max(open, close) + step * 0.4 + rand() * step * 0.3;
    const low = Math.min(open, close) - step * 0.4 - rand() * step * 0.3;
    data.push({ open, high, low, close, demo: true });
  }
  return data;
}

// ============================================================
// CHART DRAWING
// ============================================================
function getActiveCandles() {
  if (liveCandles && liveCandles.length > 0) return liveCandles;
  const base = (feed.market && feed.market.bid) || 2000;
  return makeDemoCandles(timeframe, base);
}

// ============================================================
// SIGNAL SELECTION (overlay + panel)
// ============================================================
// ตรวจว่า signal ตรง context ปัจจุบัน (symbol + timeframe) หรือไม่
// timeframe ว่างของ signal = EA รุ่นเก่า ยอมรับ; TEST signal ไม่ใช้เป็นจริง
function signalMatchesContext(s) {
  if (!s) return false;
  if (s.symbol !== activeSymbol) return false;
  const sigTf = s.timeframe || "";
  if (sigTf !== "" && sigTf !== timeframe) return false;
  if (s.kind === "TEST") return false;
  return true;
}

// สัญญาณล่าสุดที่จะแสดงใน panel = latest ACTIVE ของ context
// ถ้า latest ของ context เป็น OLD/CLOSED → คืน null (panel แสดง "No active signal")
function currentDisplaySignal() {
  if (!feed.latest) return null;
  const s = feed.latest.signal;
  if (!signalMatchesContext(s)) return null;
  if (s.kind !== "ACTIVE") return null; // panel ใช้ ACTIVE เท่านั้น
  return s;
}

// รายการ signal ที่จะวาดบนกราฟ (overlay) — current overlay จาก /api/latest เท่านั้น
// - Past OFF → ใช้ current active signal จาก feed.latest (active_only=1)
//   ถ้า latest เป็น null (ไม่มี ACTIVE สด) → ไม่วาดอะไรเลย (ห้าม fallback ไป history[0])
// - Past ON → เอา maxPastSignals อันใหม่สุดของ history ที่ match context (รวม OLD/CLOSED)
//   สีจาง + label status ชัด เพื่อแยกจาก active สด
// เรียงจากเก่า → ใหม่ เพื่อให้ latest อยู่บนสุด
function getDisplaySignals() {
  if (!showPastSignals) {
    // Past OFF: ใช้ latest active signal เท่านั้น — ห้าม fallback history
    if (!feed.latest || !feed.latest.signal) return [];
    const s = feed.latest.signal;
    if (!signalMatchesContext(s)) return [];
    if (s.kind !== "ACTIVE") return []; // latest จาก API active_only=1 ต้องเป็น ACTIVE เท่านั้น
    return [s];
  }
  // Past ON: historical overlay จาก /api/history
  if (!feed.history || !Array.isArray(feed.history.signals)) return [];
  const matched = feed.history.signals.filter(signalMatchesContext);
  const byId = new Map();
  for (const s of matched) {
    if (!byId.has(s.id)) byId.set(s.id, s);
  }
  let arr = [...byId.values()];
  arr.sort((a, b) => (a.signal_time || 0) - (b.signal_time || 0));
  if (arr.length > maxPastSignals) arr = arr.slice(arr.length - maxPastSignals);
  return arr;
}

// หา candle index ที่ใกล้ signal_time ที่สุด — จำกัดเฉพาะที่อยู่ในกราฟจริง
function findSignalCandleIndex(candles, signalTime) {
  if (!signalTime || !candles[0] || !candles[0].time) {
    return Math.floor(candles.length * 0.7); // fallback 70%
  }
  let best = -1, bestDiff = Infinity;
  for (let i = 0; i < candles.length; i++) {
    if (!candles[i].time) continue;
    const diff = Math.abs(candles[i].time - signalTime);
    if (diff < bestDiff) { bestDiff = diff; best = i; }
  }
  // ถ้า candle ที่ใกล้ที่สุดยังห่างเวลาเกิน 2 ชม → signal นอกกรอบกราฟ ไม่วาด arrow
  if (best < 0 || bestDiff > 7200) return -1;
  return best;
}

function candleTimeLabel(c) {
  if (c.time) {
    // ใช้ UTC เสมอ — candle.time จาก EA เป็น broker server time (epoch UTC)
    // ไม่ใช้ local timezone เพราะจะทำให้ label เพี้ยนจาก MT5 (เช่น +7h ถ้าอยู่ไทย)
    const d = new Date(c.time * 1000);
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
  }
  return "";
}

function fitCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0) return;
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawChart(ctx, rect.width, rect.height);
}

function drawChart(ctx, width, height) {
  const candles = getActiveCandles();
  const pad = { top: 20, right: 78, bottom: 28, left: 12 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  // price scale from candles only
  const candlePrices = candles.flatMap(c => [c.high, c.low]);
  if (candlePrices.length === 0) return;
  const cLo = Math.min(...candlePrices);
  const cHi = Math.max(...candlePrices);
  const cSpan = Math.max(cHi - cLo, Math.abs(cHi) * 0.001, 0.01);
  const min = cLo - cSpan * 0.12;
  const max = cHi + cSpan * 0.12;
  const y = price => pad.top + (max - price) / (max - min) * plotH;
  const clampY = price => Math.max(pad.top + 1, Math.min(pad.top + plotH - 1, y(price)));

  const futureSlots = Math.max(10, Math.ceil(candles.length * 0.18));
  const slot = plotW / (candles.length + futureSlots);
  const candleW = Math.max(2, Math.min(8, slot * 0.58));

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#0b0e11";
  ctx.fillRect(0, 0, width, height);

  // grid lines
  ctx.font = "10px IBM Plex Mono, monospace";
  ctx.textBaseline = "middle";
  for (let i = 0; i <= 6; i++) {
    const gy = pad.top + plotH * i / 6;
    ctx.strokeStyle = "#1c2228"; ctx.lineWidth = 1; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(pad.left, gy); ctx.lineTo(width - pad.right, gy); ctx.stroke();
    const price = max - (max - min) * i / 6;
    ctx.fillStyle = "#4a5568"; ctx.textAlign = "left";
    ctx.fillText(fmtPrice(price), width - pad.right + 6, gy);
  }

  // === PASS 0: DR ZONES (resistance/support) จาก /api/zones เท่านั้น — ห้ามวาดถ้าไม่มี payload ===
  // วาดก่อน candles เพื่อเป็น background layer
  // resistance = สีแดงโปร่งใส, support = สีเขียวโปร่งใส
  if (liveZones && liveZones.length > 0) {
    const candleFirstTime = candles[0] ? candles[0].time : null;
    const candleLastTime  = candles[candles.length - 1] ? candles[candles.length - 1].time : null;

    for (const zone of liveZones) {
      if (!zone || zone.hi == null || zone.lo == null) continue;
      const isResistance = zone.type === "resistance";
      const zoneColor = isResistance ? "#ff6470" : "#25d695";

      // คำนวณ X: ถ้ามี time1/time2 ให้ใช้ timeToX (ฟังก์ชันประกาศข้างล่าง — define ชั่วคราวที่นี่)
      let zStartX = pad.left;
      let zEndX   = width - pad.right;
      if (zone.time1 && candleFirstTime) {
        // หา candle index ที่ time ใกล้ที่สุด (inline)
        let b1 = 0, d1 = Infinity;
        for (let i = 0; i < candles.length; i++) {
          if (!candles[i].time) continue;
          const dd = Math.abs(candles[i].time - zone.time1);
          if (dd < d1) { d1 = dd; b1 = i; }
        }
        zStartX = pad.left + slot * b1 + slot / 2;
      }
      if (zone.time2 && candleLastTime) {
        let b2 = candles.length - 1, d2 = Infinity;
        for (let i = 0; i < candles.length; i++) {
          if (!candles[i].time) continue;
          const dd = Math.abs(candles[i].time - zone.time2);
          if (dd < d2) { d2 = dd; b2 = i; }
        }
        zEndX = pad.left + slot * b2 + slot / 2;
        // zone ที่ extend ไปถึงอนาคต → ยืดถึงขอบขวา
        if (zEndX < zStartX + slot * 2) zEndX = width - pad.right;
      }

      const hiY = clampY(zone.hi);
      const loY = clampY(zone.lo);
      const zTop = Math.min(hiY, loY);
      const zBot = Math.max(hiY, loY);
      const zH   = Math.max(2, zBot - zTop);

      // fill โปร่งใส
      ctx.fillStyle = zoneColor;
      ctx.globalAlpha = 0.08;
      ctx.fillRect(zStartX, zTop, Math.max(4, zEndX - zStartX), zH);

      // border บน/ล่าง
      ctx.strokeStyle = zoneColor;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(zStartX, hiY); ctx.lineTo(zEndX, hiY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(zStartX, loY); ctx.lineTo(zEndX, loY); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      // label ซ้ายของ zone
      ctx.font = "600 8px IBM Plex Mono, monospace";
      ctx.fillStyle = zoneColor;
      ctx.globalAlpha = 0.8;
      ctx.textAlign = "left";
      ctx.fillText(isResistance ? "R" : "S", zStartX + 3, zTop + 9);
      ctx.globalAlpha = 1;
    }
  }

  // === SIGNAL OVERLAY (multi-signal, MT5-style, render by EA objects payload 1:1) ===
  // วาดจากเก่า → ใหม่: latest/active อยู่บนสุด
  const signals = getDisplaySignals();
  const lineEndX = width - pad.right;

  // helper: แปลง candle time → x บนกราฟ (ใช้ candle time ที่ใกล้ที่สุดถ้าไม่ตรงเป๊ะ)
  function timeToX(t) {
    if (!t || !candles[0] || !candles[0].time) {
      // legacy: ไม่มี candle time → fallback ใช้ signal_time หา index
      return null;
    }
    // หา candle ที่ time ใกล้ที่สุด
    let best = 0, bestDiff = Infinity;
    for (let i = 0; i < candles.length; i++) {
      if (!candles[i].time) continue;
      const diff = Math.abs(candles[i].time - t);
      if (diff < bestDiff) { bestDiff = diff; best = i; }
    }
    return pad.left + slot * best + slot / 2;
  }

  // helper: legacy fallback block end X (active=ยาว, past=สั้น 20 แท่ง) — ใช้เฉพาะ sig.objects ไม่มี
  function legacyBlockEndX(sIdx, isActive) {
    if (sIdx < 0) return pad.left;
    const startX = pad.left + slot * sIdx + slot / 2;
    if (isActive) return lineEndX;
    return Math.min(lineEndX, startX + slot * 20);
  }

  // helper: วาด level line + label ที่ขอบขวา (สำหรับ active signal)
  function drawLevelLine(startX, endX, price, color, label, dashed, alpha = 1) {
    const yp = clampY(price);
    ctx.strokeStyle = color; ctx.globalAlpha = alpha;
    ctx.lineWidth = (label === "ENTRY") ? 2 : 1.5;
    ctx.setLineDash(dashed ? [5, 4] : (label === "ENTRY" ? [] : [4, 4]));
    ctx.beginPath(); ctx.moveTo(startX, yp); ctx.lineTo(endX, yp); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1; ctx.lineWidth = 1;
    // label ที่ขอบขวา (เฉพาะ active)
    if (endX >= lineEndX - 2) {
      ctx.font = "600 8px IBM Plex Mono, monospace";
      const lw = ctx.measureText(label).width + 10;
      ctx.fillStyle = color;
      ctx.fillRect(lineEndX - lw, yp - 7, lw, 14);
      ctx.fillStyle = label === "ENTRY" ? "#0d0a04" : label === "SL" ? "#160606" : "#0a1a12";
      ctx.textAlign = "left";
      ctx.fillText(label, lineEndX - lw + 5, yp + 1);
    }
  }

  // --- PASS 1: RR box + level lines ตาม EA objects payload (1:1) ---
  // วาดทุก signal ใน overlay ด้วย geometry จาก sig.objects เท่านั้น
  // - ACTIVE = alpha เต็ม สีสด + วาด level lines + labels
  // - latest ของ context (ตัวสุดท้าย) = วาด level แม้ kind != ACTIVE (เช่น Past ON แสดง OLD/CLOSED ล่าสุด)
  // - past signal อื่น ๆ (Past ON) = alpha จาง ใช้ block + arrow + status label พอ
  // - ถ้า sig.objects = null → skip (ห้าม fallback จาก entry/sl/tp เพราะไม่ตรงกับ MT5 1:1)
  for (let si = 0; si < signals.length; si++) {
    const sig = signals[si];
    const isActive = sig.kind === "ACTIVE";
    const isLatest = (si === signals.length - 1);
    const baseAlpha = isActive ? 1.0 : 0.4;
    const objs = sig.objects;

    // ถ้าไม่มี objects payload → skip signal นี้ (ไม่ใช่ MT5 1:1 ห้ามเดา)
    if (!objs) continue;

    // หา start X ของ signal จาก arrow.time (เสมอ)
    const arrowTime = objs.arrow ? objs.arrow.time : sig.signal_time;
    startX = timeToX(arrowTime);
    if (startX === null) continue; // ไม่มี candle time → ไม่สามารถวาดได้

    // end X: active → ขยายถึงขอบขวา, past → ใช้ level_e.time2 ถ้ามี
    // rr_box ถูกลบออก (scope = signal-only: arrow + Entry + SL + TP เท่านั้น)
    let endX;
    if (isActive) {
      endX = lineEndX;
    } else if (objs.level_e) {
      endX = timeToX(objs.level_e.time2) || lineEndX;
    } else {
      endX = lineEndX;
    }
    if (startX === null || endX === null) continue;

    // Level lines: วาดเมื่อ ACTIVE หรือเป็น latest ของ context (Past OFF = latest 1 อัน ต้องเห็นระดับ)
    // Past signal อื่น ๆ (Past ON, ไม่ใช่ latest) = ใช้ block + arrow + status label พอ ไม่วาด level
    const drawLevels = isActive || isLatest;

    if (drawLevels) {
      const tpS = sig.tp_status || {};
      const tpLevels = [
        { n: "TP1", p: sig.tp1, s: tpS.tp1, objKey: "level_tp1" },
        { n: "TP2", p: sig.tp2, s: tpS.tp2, objKey: "level_tp2" },
        { n: "TP3", p: sig.tp3, s: tpS.tp3, objKey: "level_tp3" },
        { n: "TP4", p: sig.tp4, s: tpS.tp4, objKey: "level_tp4" },
      ];

      for (const tp of tpLevels) {
        if (tp.p <= 0) continue;
        // visibility check จาก EA: ถ้ามี objects แต่ level_tp* = null → ไม่วาด
        if (objs && objs[tp.objKey] === null) continue;
        const isHit = tp.s === 1;
        const isMiss = tp.s === -1;
        const label = isHit ? `${tp.n} ✓ ${fmtPrice(tp.p)}` : `${tp.n} ${fmtPrice(tp.p)}`;
        const color = isHit ? "#25d695" : isMiss ? "#4a5568" : "#25d695";
        const alpha = isHit ? 0.9 : isMiss ? 0.3 : 0.45;
        // ใช้ drawLevelLine แต่ label ต้องรวม price
        const tpY = clampY(tp.p);
        ctx.strokeStyle = color; ctx.globalAlpha = alpha;
        ctx.lineWidth = isHit ? 1.5 : 1;
        ctx.setLineDash(isHit ? [] : [4, 4]);
        ctx.beginPath(); ctx.moveTo(startX, tpY); ctx.lineTo(lineEndX, tpY); ctx.stroke();
        ctx.setLineDash([]); ctx.globalAlpha = 1; ctx.lineWidth = 1;
        ctx.font = "600 8px IBM Plex Mono, monospace";
        const lw = ctx.measureText(label).width + 10;
        ctx.fillStyle = isHit ? "#25d695" : isMiss ? "#4a5568" : "#1a3d2b";
        ctx.fillRect(lineEndX - lw, tpY - 7, lw, 14);
        ctx.fillStyle = isHit ? "#0a1a12" : isMiss ? "#2a3a4a" : "#25d695"; ctx.textAlign = "left";
        ctx.fillText(label, lineEndX - lw + 5, tpY + 1);
      }

      // Entry line (yellow solid)
      if (!objs || objs.level_e !== null) {
        const entryLabel = `ENTRY ${fmtPrice(sig.entry)}`;
        const entryY = clampY(sig.entry);
        ctx.strokeStyle = "#f0b94b"; ctx.globalAlpha = 1; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(startX, entryY); ctx.lineTo(lineEndX, entryY); ctx.stroke();
        ctx.lineWidth = 1;
        ctx.font = "600 8px IBM Plex Mono, monospace";
        const elw = ctx.measureText(entryLabel).width + 10;
        ctx.fillStyle = "#f0b94b";
        ctx.fillRect(lineEndX - elw, entryY - 7, elw, 14);
        ctx.fillStyle = "#0d0a04"; ctx.textAlign = "left";
        ctx.fillText(entryLabel, lineEndX - elw + 5, entryY + 1);
      }

      // SL line (red dashed)
      if (sig.sl > 0 && (!objs || objs.level_sl !== null)) {
        const slLabel = `SL ${fmtPrice(sig.sl)}`;
        const slY = clampY(sig.sl);
        ctx.strokeStyle = "#ff6470"; ctx.globalAlpha = 0.8; ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        ctx.beginPath(); ctx.moveTo(startX, slY); ctx.lineTo(lineEndX, slY); ctx.stroke();
        ctx.setLineDash([]); ctx.globalAlpha = 1; ctx.lineWidth = 1;
        ctx.font = "600 8px IBM Plex Mono, monospace";
        const slw = ctx.measureText(slLabel).width + 10;
        ctx.fillStyle = "#ff6470";
        ctx.fillRect(lineEndX - slw, slY - 7, slw, 14);
        ctx.fillStyle = "#160606"; ctx.textAlign = "left";
        ctx.fillText(slLabel, lineEndX - slw + 5, slY + 1);
      }
    }
  }

  // candles (draw on top of zones)
  candles.forEach((c, i) => {
    const x = pad.left + slot * i + slot / 2;
    const up = c.close >= c.open;
    const color = up ? "#25d695" : "#ff6470";
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1; ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.moveTo(x, y(c.high)); ctx.lineTo(x, y(c.low)); ctx.stroke();
    const bodyTop = y(Math.max(c.open, c.close));
    const bodyBottom = y(Math.min(c.open, c.close));
    ctx.fillRect(x - candleW / 2, bodyTop, candleW, Math.max(1.5, bodyBottom - bodyTop));
  });

  // current price line (white/light)
  const curPrice = feed.market && feed.market.bid > 0 ? feed.market.bid : null;
  if (curPrice !== null) {
    const curY = clampY(curPrice);
    ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(pad.left, curY); ctx.lineTo(lineEndX, curY); ctx.stroke();
    ctx.setLineDash([]); ctx.lineWidth = 1;
    // price box on right
    ctx.fillStyle = "#2a3540";
    ctx.fillRect(lineEndX, curY - 8, pad.right - 2, 16);
    ctx.fillStyle = "#ffffff"; ctx.font = "700 9px IBM Plex Mono, monospace"; ctx.textAlign = "left";
    ctx.fillText(fmtPrice(curPrice), lineEndX + 4, curY + 1);
  }

  // --- signal arrows + status labels (วาดบน candles สำหรับทุก signal ใน overlay) ---
  // คำนวณ candle range สำหรับ inRange check
  const candleFirstTime = candles[0] && candles[0].time ? candles[0].time : null;
  const candleLastTime  = candles[candles.length - 1] && candles[candles.length - 1].time
    ? candles[candles.length - 1].time : null;
  // buffer = ประมาณ 10 bar ย้อนหลัง (Past ON อาจมี signal เพิ่งออกก่อนช่วง candle นิดหน่อย)
  const tfMinutes = timeframe === "M1" ? 1 : timeframe === "M5" ? 5 : 5;
  const rangeBuffer = tfMinutes * 60 * 10; // 10 bars

  for (const sig of signals) {
    const objs = sig.objects;
    // ตำแหน่ง arrow: ใช้ objects.arrow ถ้ามี, fallback signal_time + entry
    let arrowTime, arrowPrice;
    if (objs && objs.arrow) {
      arrowTime = objs.arrow.time;
      arrowPrice = objs.arrow.price;
    } else {
      arrowTime = sig.signal_time;
      arrowPrice = sig.entry;
    }

    // inRange check: Past ON → ตรวจว่า signal_time อยู่ในช่วง candles ที่แสดง
    // Past OFF (ACTIVE) → ยังวาดเสมอ (active สดอาจเพิ่งออกก่อน candle แรกนิดหน่อย)
    let inRange = true;
    if (showPastSignals && candleFirstTime && candleLastTime && arrowTime) {
      inRange = arrowTime >= (candleFirstTime - rangeBuffer) &&
                arrowTime <= (candleLastTime + rangeBuffer);
    }

    const sIdx = findSignalCandleIndex(candles, arrowTime);
    if (sIdx < 0 || !inRange) continue; // นอก range หรือ candle ไม่ match → ไม่วาด

    const isActive = sig.kind === "ACTIVE";
    const alpha = isActive ? 1.0 : 0.45;
    const sx = pad.left + slot * sIdx + slot / 2;
    const isBuy = sig.direction === "BUY";
    const arrowY = isBuy ? y(candles[sIdx].low) + 16 : y(candles[sIdx].high) - 16;
    const color = isBuy ? "#25d695" : "#ff6470";

    ctx.globalAlpha = alpha;
    if (isActive) { ctx.shadowColor = color; ctx.shadowBlur = 8; }
    ctx.fillStyle = color;
    if (isBuy) {
      ctx.beginPath(); ctx.moveTo(sx, arrowY - 10); ctx.lineTo(sx - 7, arrowY); ctx.lineTo(sx + 7, arrowY); ctx.closePath(); ctx.fill();
    } else {
      ctx.beginPath(); ctx.moveTo(sx, arrowY + 10); ctx.lineTo(sx - 7, arrowY); ctx.lineTo(sx + 7, arrowY); ctx.closePath(); ctx.fill();
    }
    ctx.shadowBlur = 0;

    // label: direction + status
    ctx.fillStyle = color; ctx.font = "700 10px IBM Plex Mono, monospace"; ctx.textAlign = "center";
    ctx.fillText(sig.direction, sx, arrowY + (isBuy ? 14 : -12));
    // past signal: ป้าย status
    if (!isActive) {
      let statusTxt = "";
      if (sig.kind === "CLOSED") {
        const hitCount = (sig.tp_status ? [sig.tp_status.tp1, sig.tp_status.tp2, sig.tp_status.tp3, sig.tp_status.tp4].filter(s => s === 1).length : 0);
        statusTxt = sig.result === "WIN" ? `WIN TP${hitCount || 1}` : sig.result === "LOSS" ? "LOSS · SL" : "CLOSED";
      } else if (sig.kind === "OLD") {
        statusTxt = "เก่า";
      }
      if (statusTxt) {
        ctx.font = "600 8px IBM Plex Mono, monospace";
        ctx.fillStyle = "#8a95a5";
        ctx.fillText(statusTxt, sx, arrowY + (isBuy ? 26 : -24));
      }
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
  }

  // time axis
  ctx.textAlign = "center"; ctx.fillStyle = "#4a5568"; ctx.font = "9px IBM Plex Mono, monospace";
  ctx.globalAlpha = 1;
  for (let i = 0; i <= 6; i++) {
    const index = Math.min(candles.length - 1, Math.round((candles.length - 1) * i / 6));
    const lbl = candleTimeLabel(candles[index]);
    if (lbl) {
      const tx = pad.left + slot * index + slot / 2;
      ctx.fillText(lbl, tx, height - 10);
    }
  }
  ctx.textAlign = "left";

  // debug log — สำหรับเทียบกับ MT5 journal (ไม่กระทบ UI)
  // แสดง candle range + overlay ids + signal inRange ตาม QC requirement
  const latestId = (feed.latest && feed.latest.signal) ? feed.latest.signal.id : null;
  const overlayIds = signals.map(s => s.id);
  const overlayMismatch = (!showPastSignals && latestId && overlayIds.length === 1 && overlayIds[0] !== latestId);

  // คำนวณ inRange ต่อ signal สำหรับ debug (ใช้ arrowTime เดียวกับที่วาด)
  const _cFirst = candles[0] && candles[0].time ? candles[0].time : null;
  const _cLast  = candles[candles.length - 1] && candles[candles.length - 1].time ? candles[candles.length - 1].time : null;
  const _buf = (timeframe === "M1" ? 1 : 5) * 60 * 10;

  console.debug("[chart] render", {
    context: `${activeSymbol} ${timeframe}`,
    chartMeta: chartMeta ? `ext=${chartMeta.extend_bars}` : "none",
    showPast: showPastSignals,
    candle_count: candles.length,
    candle_first_time: _cFirst,
    candle_last_time: _cLast,
    candle_first_utc: _cFirst ? new Date(_cFirst * 1000).toISOString() : null,
    candle_last_utc:  _cLast  ? new Date(_cLast  * 1000).toISOString() : null,
    zones_count: liveZones.length,
    latest_id: latestId,
    overlay_ids: overlayIds,
    overlay_count: signals.length,
    mismatch: overlayMismatch ? `overlay=${overlayIds[0]} != latest=${latestId}` : "none",
    signals: signals.map(s => {
      const aTime = (s.objects && s.objects.arrow) ? s.objects.arrow.time : s.signal_time;
      const inR = (!showPastSignals) ? "active(no-check)"
        : (!_cFirst || !_cLast || !aTime) ? "no-time-data"
        : (aTime >= (_cFirst - _buf) && aTime <= (_cLast + _buf)) ? true : false;
      return {
        id: s.id, kind: s.kind, dir: s.direction, entry: s.entry,
        signal_time: s.signal_time,
        signal_time_utc: s.signal_time ? new Date(s.signal_time * 1000).toISOString() : null,
        arrow_time: aTime,
        arrow_time_utc: aTime ? new Date(aTime * 1000).toISOString() : null,
        inRange: inR,
        has_objects: !!s.objects,
      };
    }),
  });
  if (overlayMismatch) {
    console.warn("[chart] BUG: overlay ไม่ตรง latest — Past OFF ต้องวาดเฉพาะ latest active เท่านั้น");
  }
}

canvas.addEventListener("mousemove", event => {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const yc = event.clientY - rect.top;
  const padLeft = 12, padRight = 70;
  const candles = getActiveCandles();
  if (x < padLeft || x > rect.width - padRight) { tooltip.hidden = true; return; }
  const index = Math.max(0, Math.min(candles.length - 1, Math.floor((x - padLeft) / (rect.width - padLeft - padRight) * candles.length)));
  const c = candles[index];
  const tlbl = candleTimeLabel(c) || (timeframe + " · " + (index + 1));
  tooltip.innerHTML = `<strong>${tlbl}${c.demo ? ' · DEMO' : ''}</strong><br>O ${fmtPrice(c.open)} &nbsp; H ${fmtPrice(c.high)}<br>L ${fmtPrice(c.low)} &nbsp; C ${fmtPrice(c.close)}`;
  tooltip.style.left = `${Math.min(x + 14, rect.width - 170)}px`;
  tooltip.style.top = `${Math.max(10, Math.min(yc - 34, rect.height - 72))}px`;
  tooltip.hidden = false;
});
canvas.addEventListener("mouseleave", () => { tooltip.hidden = true; });

timeframeButtons.forEach(button => button.addEventListener("click", () => {
  timeframeButtons.forEach(b => b.classList.toggle("active", b === button));
  timeframe = button.dataset.timeframe;
  $("timeframe-label").textContent = timeframe === "M5" ? "5 นาที" : "1 นาที";
  selectedSymbol = activeSymbol;
  pollNow();
}));
$("reset-chart").addEventListener("click", () => fitCanvas());
$("expand-chart").addEventListener("click", () => {
  if (!document.fullscreenElement) chartWrap.requestFullscreen?.(); else document.exitFullscreen?.();
});
document.addEventListener("fullscreenchange", fitCanvas);

// --- Past signals toggle ---
$("toggle-past").addEventListener("click", () => {
  showPastSignals = !showPastSignals;
  const btn = $("toggle-past");
  btn.setAttribute("aria-pressed", String(showPastSignals));
  btn.classList.toggle("active", showPastSignals);
  // show/hide max-past segmented
  $("max-past-group").hidden = !showPastSignals;
  fitCanvas();
});

// --- Max past signals segmented (5/10/20) ---
document.querySelectorAll("#max-past-group button").forEach(b => {
  b.addEventListener("click", () => {
    document.querySelectorAll("#max-past-group button").forEach(x => x.classList.remove("active"));
    b.classList.add("active");
    maxPastSignals = parseInt(b.dataset.max, 10) || 5;
    fitCanvas();
  });
});

symbolSelect.addEventListener("change", () => {
  selectedSymbol = symbolSelect.value || null;
  activeSymbol = selectedSymbol || (feed.market && feed.market.symbol);
  userPickedSymbol = !!selectedSymbol; // ผู้ใช้เลือกเอง → หยุด auto-follow
  pollNow();
});

// ============================================================
// API POLLING
// ============================================================
async function apiGet(path) {
  const r = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`${path} -> HTTP ${r.status}`);
  return r.json();
}

function pickLiveCandles() {
  const m = feed.market;
  if (!m || m.symbol !== activeSymbol) { liveCandles = []; return; }
  // timeframe ว่าง = EA ไม่ส่งมา → ยอมรับทุก timeframe
  const mktTf = m.timeframe || "";
  if (mktTf !== "" && mktTf !== timeframe) { liveCandles = []; return; }
  liveCandles = m.candles || [];
}

function pickLiveZones() {
  // liveZones ดึงจาก feed.zones (ที่ poll เก็บไว้)
  // ถ้าไม่มี payload → clear (ห้ามเดา/วาดเอง)
  const z = feed.zones;
  if (!z || !Array.isArray(z.zones)) { liveZones = []; return; }
  // filter เฉพาะ context ที่ตรงกัน
  if (z.symbol && z.symbol !== activeSymbol) { liveZones = []; return; }
  const zTf = z.timeframe || "";
  if (zTf !== "" && zTf !== timeframe) { liveZones = []; return; }
  liveZones = z.zones;
}

let pollTimer = null;
let polling = false; // ป้องกัน re-entry (poll ซ้อน)
function pollNow() { if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; } poll(); }

async function poll() {
  if (polling) return; // กันซ้อน
  polling = true;
  try {
    const health = await apiGet("/api/health");
    const contexts = await apiGet("/api/instances");
    const available = contexts.instances || [];
    const liveSymbol = contexts.market_symbol;   // EA ที่รันอยู่จริงตอนนี้
    const liveTf     = contexts.market_timeframe || timeframe;

    if (!userPickedSymbol) {
      // AUTO-FOLLOW: ถ้าผู้ใช้ไม่ได้เลือกเอง → ตาม EA เสมอ
      if (liveSymbol) {
        activeSymbol   = liveSymbol;
        selectedSymbol = liveSymbol;
        timeframe      = liveTf;
      } else if (available.length > 0) {
        const first    = available[0];
        activeSymbol   = first.symbol;
        selectedSymbol = first.symbol;
        timeframe      = first.timeframe || timeframe;
      }
    } else {
      // USER PICKED: เช็คว่า symbol ที่เลือกยังมีอยู่ไหม ถ้าไม่มีแล้วให้ fallback
      const currentExists = available.some(i => i.symbol === activeSymbol && i.timeframe === timeframe);
      if (!currentExists && liveSymbol) {
        activeSymbol     = liveSymbol;
        selectedSymbol   = liveSymbol;
        timeframe        = liveTf;
        userPickedSymbol = false; // reset — เพราะ symbol เดิมหายไปแล้ว
      }
    }

    const params = new URLSearchParams({ symbol: activeSymbol || "", timeframe });
    const contextQuery = `?${params.toString()}`;
    const [latest, history, stats, marketResp, metaResp, zonesResp] = await Promise.all([
      apiGet(`/api/latest${contextQuery}`),
      apiGet(`/api/history${contextQuery}&limit=50`),
      apiGet(`/api/stats${contextQuery}`),
      apiGet(`/api/market${contextQuery}`),
      apiGet(`/api/chart_meta${contextQuery}`),
      apiGet(`/api/zones${contextQuery}`).catch(() => ({ zones: [] })), // ถ้า endpoint ยังไม่มี → ไม่ crash
    ]);
    feed = {
      status: health.feed || "OFFLINE",
      health, latest, history, stats,
      market: marketResp.market || null,
      instances: available,
      zones: zonesResp || null,
    };
    chartMeta = (metaResp && metaResp.chart_meta) || null;
    if ((latest.signal) || (marketResp.market && marketResp.market.bid !== null)) hasRealData = true;
    pickLiveCandles();
    pickLiveZones();
  } catch (e) {
    feed = { ...feed, status: "OFFLINE" };
    liveCandles = [];
  }
  try { render(); } catch (e) { console.error("render error", e); }
  polling = false;
  pollTimer = setTimeout(poll, POLL_INTERVAL_MS);
}

// ============================================================
// RENDER
// ============================================================
function setFeedBadge(state, text) {
  const el = $("feed-status");
  el.classList.remove("live", "stale", "offline");
  el.classList.add(state.toLowerCase());
  $("feed-status-text").textContent = text;
}

function renderFeedStatus() {
  const h = feed.health;
  if (!h || feed.status === "OFFLINE") {
    setFeedBadge("OFFLINE", "EA FEED OFFLINE");
    $("chart-feed-label").textContent = "OFFLINE";
    $("chart-feed-label").className = "feed-tag off";
    return;
  }
  const age = h.last_market_age_s;
  const isStale = age !== null && age > (h.stale_seconds || 15);
  if (isStale) {
    setFeedBadge("STALE", "EA FEED STALE");
    $("chart-feed-label").textContent = "STALE";
    $("chart-feed-label").className = "feed-tag stale";
  } else {
    setFeedBadge("LIVE", "EA FEED LIVE");
    $("chart-feed-label").textContent = "REALTIME";
    $("chart-feed-label").className = "feed-tag live";
  }
}

function renderDemoBanner() {
  const banner = $("demo-banner");
  const demoBadge = $("demo-badge");
  const showDemo = !hasRealData;
  banner.classList.toggle("visible", showDemo);
  demoBadge.hidden = !showDemo;
}

function renderSymbolSelector() {
  const opts = [...new Set((feed.instances || []).filter(i => i.timeframe === timeframe).map(i => i.symbol))];
  if (!opts.length && activeSymbol) opts.push(activeSymbol);
  const prev = selectedSymbol || activeSymbol;
  symbolSelect.innerHTML = opts.map(s => `<option value="${s}"${s === prev ? " selected" : ""}>${s}</option>`).join("");
  timeframeButtons.forEach(button => button.classList.toggle("active", button.dataset.timeframe === timeframe));
  $("timeframe-label").textContent = timeframe === "M5" ? "5 นาที" : timeframe === "M1" ? "1 นาที" : timeframe;
}

function renderMarket() {
  const m = feed.market;
  // viewing symbol = activeSymbol (สิ่งที่ผู้ใช้เลือก), market feed symbol = m.symbol (ที่ EA ส่ง)
  const feedSymEl = $("feed-source");
  const feedSymVal = $("feed-source-symbol");
  if (m && m.symbol) {
    // แสดง "Feed: <symbol>" เมื่อ feed symbol ต่างจาก viewing symbol
    if (m.symbol !== activeSymbol) {
      feedSymEl.hidden = false;
      feedSymVal.textContent = m.symbol;
    } else {
      feedSymEl.hidden = true;
    }
  } else {
    feedSymEl.hidden = true;
  }

  if (m && m.symbol === activeSymbol) {
    $("market-symbol").textContent = m.symbol || DASH;
    $("market-desc").textContent = symbolDesc(m.symbol);
    $("symbol-icon").textContent = symbolIcon(m.symbol);
    $("chart-symbol").textContent = m.symbol || DASH;
    $("bid-price").textContent = fmtPrice(m.bid);
    $("ask-price").textContent = fmtPrice(m.ask);
    $("market-spread").textContent = m.spread !== null ? fmtInt(m.spread) : DASH;
    $("market-age").textContent = fmtAge(m.age_seconds);
    if (m.bid !== null) $("current-signal-price").textContent = fmtPrice(m.bid);
  } else if (!hasRealData) {
    $("bid-price").textContent = DASH;
    $("ask-price").textContent = DASH;
  } else {
    // มี feed แต่เป็น symbol อื่น → แสดง viewing symbol แต่ไม่มีราคา
    $("market-symbol").textContent = activeSymbol || DASH;
    $("market-desc").textContent = symbolDesc(activeSymbol);
    $("symbol-icon").textContent = symbolIcon(activeSymbol);
    $("chart-symbol").textContent = activeSymbol || DASH;
    $("bid-price").textContent = DASH;
    $("ask-price").textContent = DASH;
    $("market-spread").textContent = DASH;
    $("market-age").textContent = DASH;
  }
}

function signalKindBadge(kind) {
  const map = {
    ACTIVE: { txt: "ACTIVE",   cls: "active" },
    CLOSED: { txt: "CLOSED",   cls: "closed" },
    OLD:    { txt: "เก่า",    cls: "old" },
    TEST:   { txt: "TEST",     cls: "test" },
  };
  return map[kind] || { txt: kind || DASH, cls: "old" };
}

function renderSignal() {
  const sig = currentDisplaySignal();
  const emptyEl = $("signal-empty");
  const contentEl = $("signal-content");
  const kindBadge = $("signal-kind-badge");
  const resultBanner = $("signal-result-banner");

  if (!sig) {
    emptyEl.hidden = false;
    contentEl.hidden = true;
    // แยกข้อความ: ไม่มี signal เลย vs มีแต่ past/closed
    const all = (feed.history && feed.history.signals) || [];
    const ctxMatch = all.filter(s =>
      s.symbol === activeSymbol &&
      (s.timeframe || "") === (timeframe || "") &&
      s.kind !== "TEST"
    );
    const hasPast = ctxMatch.some(s => s.kind === "OLD" || s.kind === "CLOSED");
    kindBadge.textContent = "ยังไม่มีสัญญาณปัจจุบัน";
    kindBadge.className = hasPast ? "signal-kind-badge old" : "signal-kind-badge none";
    $("empty-symbol").textContent = `${activeSymbol || DASH} ${timeframe}`;
    return;
  }

  emptyEl.hidden = true;
  contentEl.hidden = false;

  const isClosed = sig.kind === "CLOSED" || sig.kind === "OLD";
  const isWin = sig.result === "WIN";
  const isLoss = sig.result === "LOSS";
  const tpStatus = sig.tp_status || {};
  const hitCount = [tpStatus.tp1, tpStatus.tp2, tpStatus.tp3, tpStatus.tp4].filter(s => s === 1).length;

  // ---- KIND BADGE ----
  if (isClosed && isWin) {
    kindBadge.textContent = `WIN · TP${hitCount}`;
    kindBadge.className = "signal-kind-badge active";
  } else if (isClosed && isLoss) {
    kindBadge.textContent = "LOSS · SL";
    kindBadge.className = "signal-kind-badge test";
  } else if (sig.kind === "ACTIVE") {
    kindBadge.textContent = "ACTIVE";
    kindBadge.className = "signal-kind-badge active";
  } else {
    const kb = signalKindBadge(sig.kind);
    kindBadge.textContent = kb.txt;
    kindBadge.className = `signal-kind-badge ${kb.cls}`;
  }

  // ---- DIRECTION + SYMBOL ----
  const isBuy = sig.direction === "BUY";
  $("signal-direction").className = `direction ${isBuy ? "buy" : "sell"}`;
  $("signal-direction").innerHTML = `<i data-lucide="${isBuy ? "arrow-up-right" : "arrow-down-right"}"></i> ${sig.direction}`;
  $("signal-symbol").textContent = sig.symbol;
  const ageTxt = sig.age_seconds != null ? ` · ${fmtAge(sig.age_seconds)}ที่แล้ว` : "";
  $("signal-time").textContent = `${fmtTimeShort(sig.signal_time)}${ageTxt}`;

  // status pill
  const pill = $("signal-status-pill");
  if (sig.kind === "ACTIVE") {
    pill.className = "active-pill kind-active";
    $("signal-status").textContent = sig.is_reentry ? "REENTRY" : "✦ Recon";
  } else {
    pill.className = "active-pill kind-none";
    $("signal-status").textContent = sig.status || DASH;
  }

  // ---- DIMMING ----
  if (isClosed) {
    contentEl.classList.add("is-closed");
  } else {
    contentEl.classList.remove("is-closed");
  }

  // ---- TP LEVELS (CLEAN) ----
  const rows = [
    { n: "TP1", p: sig.tp1, s: tpStatus.tp1 },
    { n: "TP2", p: sig.tp2, s: tpStatus.tp2 },
    { n: "TP3", p: sig.tp3, s: tpStatus.tp3 },
    { n: "TP4", p: sig.tp4, s: tpStatus.tp4 },
  ];
  let nextFound = false;
  const levelsHtml = rows.map(r => {
    const hit = r.s === 1;
    const missed = r.s === -1;
    const isNext = !hit && !missed && r.s === 0 && !nextFound && !isClosed;
    if (isNext) nextFound = true;

    let cls = "level-row";
    let badge = "";
    if (hit) {
      cls += " hit";
      badge = `<small class="tp-badge hit">✓ HIT</small>`;
    } else if (missed) {
      cls += " stop";
      badge = `<small class="tp-badge miss">✗</small>`;
    } else if (isNext) {
      cls += " next";
      badge = `<small class="tp-badge next">→ เป้าถัดไป</small>`;
    } else {
      const diff = (r.p - sig.entry) * (isBuy ? 1 : -1);
      badge = `<small>${diff >= 0 ? "+" : ""}${diff.toFixed(1)}</small>`;
    }
    return `<div class="${cls}"><span>${r.n}</span><strong>${fmtPrice(r.p)}</strong>${badge}</div>`;
  }).join("");

  // SL row
  const slDiff = (sig.entry - sig.sl) * (isBuy ? 1 : -1);
  const slHtml = `<div class="level-row stop"><span>SL</span><strong>${fmtPrice(sig.sl)}</strong><small>-${Math.abs(slDiff).toFixed(1)}</small></div>`;
  $("signal-levels").innerHTML = levelsHtml + slHtml;

  // ---- PROGRESS ----
  $("signal-progress").textContent = `${hitCount} / 4 TP`;
  $("signal-progress-bar").style.width = `${(hitCount / 4) * 100}%`;

  // ---- RESULT BANNER ----
  if (isClosed && (isWin || isLoss)) {
    resultBanner.className = `signal-result-banner visible ${isWin ? "win" : "loss"}`;
    $("result-icon").textContent = isWin ? "✅" : "❌";
    $("result-label").textContent = isWin ? "WIN" : "LOSS";
    $("result-detail").textContent = isWin
      ? `${sig.status || ("TP" + hitCount + " HIT")} · ${sig.direction} ${sig.symbol}`
      : `SL HIT · ${sig.direction} ${sig.symbol}`;
  } else {
    resultBanner.className = "signal-result-banner";
  }
}

function renderStats() {
  const grid = $("stats-grid");
  const s = feed.stats;
  $("stats-symbol").textContent = activeSymbol || DASH;
  if (!s || !s.targets) { grid.innerHTML = `<div class="stat-empty">ยังไม่มีสัญญาณที่ปิดผล</div>`; return; }
  $("stats-sample").textContent = s.sample_size !== undefined ? s.sample_size : DASH;
  if (s.sample_size === 0) {
    grid.innerHTML = `<div class="stat-empty">ยังไม่มีสัญญาณที่ปิดผลสำหรับ ${activeSymbol || DASH}</div>`;
    return;
  }
  grid.innerHTML = s.targets.map(t => {
    const wr = t.winrate === null || t.winrate === undefined ? DASH : `${t.winrate}%`;
    return `<div class="stat-item">
      <div class="stat-label"><span>${t.tp}</span><strong>${wr}</strong></div>
      <div class="mini-bar"><span style="width:${t.winrate || 0}%"></span></div>
      <div class="stat-numbers"><span>ชนะ ${t.win}</span><span>แพ้ ${t.loss}</span></div>
    </div>`;
  }).join("");
}

function fmtAgoShort(signalTimeSec) {
  if (!signalTimeSec) return "";
  const nowSec = Math.floor(Date.now() / 1000);
  const diff = nowSec - signalTimeSec;
  if (diff < 60) return "เมื่อกี้";
  if (diff < 3600) return `${Math.floor(diff / 60)} นาที`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ชม.`;
  return `${Math.floor(diff / 86400)} วัน`;
}

function renderHistory() {
  const container = $("history-cards");
  let rows = (feed.history && feed.history.signals) || [];
  // ซ่อน kind=OLD (ถูกแทนที่) — ไม่มีผล WIN/LOSS ไม่ต้องแสดง
  rows = rows.filter(r => r.kind !== "OLD");
  if (rows.length === 0) {
    container.innerHTML = `<div class="history-empty">ยังไม่มีประวัติสัญญาณ</div>`;
    return;
  }

  // Dedup: ใช้ signal ID ถ้ามี หรือ fallback เป็น direction+entry+symbol
  // เก็บไว้แค่อันล่าสุด
  const seen = new Map();
  rows = rows.filter(r => {
    // ใช้ ID ถ้ามี (unique จาก EA)
    const key = r.id || `${r.direction}_${r.entry}_${r.symbol}_${r.signal_time}`;
    if (seen.has(key)) return false; // ซ้ำ → กรองทิ้ง
    // fallback: ถ้าไม่มี ID ให้เช็ค entry+direction ใกล้กัน
    if (!r.id) {
      for (const [k, prev] of seen) {
        if (prev.direction === r.direction && prev.symbol === r.symbol
            && Math.abs(prev.entry - r.entry) < 1
            && Math.abs((prev.signal_time || 0) - (r.signal_time || 0)) < 300) {
          return false; // duplicate
        }
      }
    }
    seen.set(key, r);
    return true;
  });

  // เรียง: ACTIVE บนสุด → OLD(เก่า) → CLOSED (WIN/LOSS)
  const _kindOrder = { ACTIVE: 0, OLD: 1, CLOSED: 2, TEST: 3 };
  rows.sort((a, b) => {
    const ka = _kindOrder[a.kind] ?? 9;
    const kb = _kindOrder[b.kind] ?? 9;
    if (ka !== kb) return ka - kb;
    // ใน kind เดียวกัน: เรียงใหม่สุดก่อน
    return (b.updated_at || b.signal_time || 0) - (a.updated_at || a.signal_time || 0);
  });

  container.innerHTML = rows.map(r => {
    const isBuy = r.direction === "BUY";
    const tpS = r.tp_status || {};
    const tpArr = [
      { s: tpS.tp1 }, { s: tpS.tp2 }, { s: tpS.tp3 }, { s: tpS.tp4 }
    ];

    // badge ตาม kind
    let resultTxt, resultCls;
    if (r.kind === "TEST") {
      resultTxt = "TEST"; resultCls = "test";
    } else if (r.kind === "OLD") {
      resultTxt = "เก่า"; resultCls = "old";
    } else if (r.kind === "CLOSED") {
      if (r.result === "WIN") {
        const last = tpArr.reduce((acc, t, i) => t.s === 1 ? i + 1 : acc, 0);
        resultTxt = last > 0 ? `TP${last} ✓` : "WIN";
        resultCls = "win";
      } else {
        resultTxt = "SL HIT"; resultCls = "loss";
      }
    } else {
      resultTxt = "ACTIVE"; resultCls = "open";
    }

    const ago = fmtAgoShort(r.signal_time);
    const ageSec = r.age_seconds != null ? r.age_seconds : 0;
    const isOld = ageSec > 3600;
    const isVeryOld = ageSec > 86400;

    const dots = tpArr.map((t, i) => {
      const cls = t.s === 1 ? "hit" : (t.s === -1 ? "miss" : "open");
      return `<span class="hrow-dot ${cls}">T${i + 1}</span>`;
    }).join("");

    const rowCls = r.kind === "CLOSED" ? (r.result === "WIN" ? "win" : "loss")
                  : r.kind === "OLD" ? "old-row"
                  : r.kind === "TEST" ? "test-row"
                  : "";
    const ageCls = isVeryOld ? "very-old" : isOld ? "old" : "fresh";

    return `<div class="hrow ${rowCls}">
      <span class="hrow-age ${ageCls}">${ago}</span>
      <span class="hrow-dir ${isBuy ? "buy" : "sell"}">${r.direction}</span>
      <span class="hrow-result ${resultCls}">${resultTxt}</span>
      <span class="hrow-entry">${fmtPrice(r.entry)}</span>
      <span class="hrow-dots">${dots}</span>
    </div>`;
  }).join("");
}

let lastIconsRendered = 0;
function maybeRecreateIcons() {
  // lucide createIcons ทุกครั้งทำให้ DOM thrash → จำกัดทุก 10 วินาที หรือเมื่อมี HTML ใหม่
  const now = Date.now();
  if (!window.lucide) return;
  if (now - lastIconsRendered < 10000) return;
  try { window.lucide.createIcons(); lastIconsRendered = now; } catch (e) { /* ignore */ }
}

function render() {
  renderFeedStatus();
  renderDemoBanner();
  renderSymbolSelector();
  renderMarket();
  renderSignal();
  renderStats();
  renderHistory();
  fitCanvas();
  maybeRecreateIcons();
}

function updateClock() {
  const now = new Date();
  $("broker-time").textContent = now.toLocaleTimeString("th-TH", { hour12: false, timeZone: "Asia/Bangkok" });
}

new ResizeObserver(fitCanvas).observe(chartWrap);
window.addEventListener("resize", fitCanvas);
setInterval(updateClock, 1000);
updateClock();
render();
poll();
