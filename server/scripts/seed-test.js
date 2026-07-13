"use strict";
// ============================================================
// scripts/seed-test.js
// ส่ง payload ทดสอบครบ (signal + status + market) ไปยัง backend
// ไม่ต้องรอสัญญาณจริงจาก EA และไม่เปิดออเดอร์จริงใดๆ
//
// วิธีใช้:
//   1) cp .env.example .env  แล้วตั้ง API_KEY (ต้องตรงกับ TEST_KEY ด้านล่าง)
//   2) npm start              (รัน server ไว้ในอีก terminal)
//   3) node scripts/seed-test.js
//
// ถ้ายังไม่มี .env สคริปต์จะสร้างให้พร้อม key สำหรับทดสอบ
// ============================================================

require("dotenv").config();
const fs = require("fs");
const path = require("path");

const BASE = process.env.TEST_BASE_URL || `http://127.0.0.1:${process.env.PORT || 8787}`;
const KEY = process.env.API_KEY;

if (!KEY) {
  const envPath = path.join(__dirname, "..", ".env");
  const testKey = "dev-test-key-" + Math.random().toString(36).slice(2, 10);
  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(
      envPath,
      `PORT=8787\nAPI_KEY=${testKey}\nDB_PATH=\nALLOWED_ORIGIN=*\nSTALE_SECONDS=15\nMAX_CANDLES=120\n`
    );
    console.log(`[seed-test] สร้าง .env ใหม่ด้วย API_KEY=${testKey}`);
    console.log(`[seed-test] รันอีกครั้ง (โหลด .env แล้ว)`);
    process.exit(0);
  } else {
    console.error("[seed-test] API_KEY ไม่ถูกตั้งใน .env  เพิ่มบรรทัด API_KEY=... ก่อน");
    process.exit(1);
  }
}

function post(p, body) {
  return fetch(BASE + p, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": KEY },
    body: JSON.stringify(body),
  }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));
}

function get(p) {
  return fetch(BASE + p).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));
}

function mkCandles(base, n, step) {
  // สร้างแท่งเทียนจำลอง n แท่ง ราคาใกล้ base
  const out = [];
  let c = base;
  const now = Math.floor(Date.now() / 1000);
  for (let i = n - 1; i >= 0; i--) {
    const open = c;
    const drift = (Math.sin(i) + (Math.random() - 0.5)) * step;
    const close = +(open + drift).toFixed(2);
    const high = +(Math.max(open, close) + step * 0.4).toFixed(2);
    const low = +(Math.min(open, close) - step * 0.4).toFixed(2);
    out.push({ time: now - i * step * 100, open, high, low, close });
    c = close;
  }
  return out;
}

async function main() {
  const now = Math.floor(Date.now() / 1000);
  console.log(`\n[seed-test] target = ${BASE}\n`);

  // 1) signal ใหม่ (BUY)
  const sigId = `TEST-${now}-BUY`;
  console.log("→ POST /api/signal (BUY ใหม่)");
  console.log(await post("/api/signal", {
    id: sigId,
    symbol: "XAUUSD",
    direction: "BUY",
    signal_time: now - 120,
    entry: 2415.8,
    sl: 2413.2,
    tp1: 2417.1, tp2: 2418.4, tp3: 2419.7, tp4: 2421.0,
    macd: 0.00042,
    is_reentry: false,
    source: "seed-test",
  }));

  // 2) อัปเดต status: TP1 HIT
  console.log("→ POST /api/status (TP1 HIT)");
  console.log(await post("/api/status", {
    id: sigId,
    status: "TP1 HIT",
    tp1_status: 1,
  }));

  // 3) signal SELL ที่จบที่ SL (สำหรับ stats)
  const sellId = `TEST-${now}-SELL`;
  console.log("→ POST /api/signal (SELL) + /api/status (SL HIT)");
  await post("/api/signal", {
    id: sellId,
    symbol: "XAUUSD",
    direction: "SELL",
    signal_time: now - 600,
    entry: 2423.4,
    sl: 2425.0,
    tp1: 2422.0, tp2: 2420.6, tp3: 2419.2, tp4: 2417.8,
    macd: -0.00031,
    source: "seed-test",
  });
  console.log(await post("/api/status", {
    id: sellId,
    status: "SL HIT",
    result: "LOSS",
    tp1_status: -1, tp2_status: -1, tp3_status: -1, tp4_status: -1,
  }));

  // 4) market snapshot (ราคา + OHLC M1/M5)
  const bid = 2417.36, ask = 2417.51;
  console.log("→ POST /api/market (snapshot + M1/M5)");
  console.log(await post("/api/market", {
    symbol: "XAUUSD",
    bid, ask,
    spread: 15,
    broker_time: now,
    m1_candles: mkCandles(bid, 60, 0.3),
    m5_candles: mkCandles(bid, 60, 0.7),
  }));

  // 5) ทดสอบ GET ทั้งหมด
  console.log("\n— GET endpoints —");
  console.log("GET /api/health   :", JSON.stringify((await get("/api/health")).body));
  console.log("GET /api/latest   :", JSON.stringify((await get("/api/latest")).body));
  console.log("GET /api/history  :", `count=${((await get("/api/history?limit=10")).body||{}).count}`);
  console.log("GET /api/stats    :", JSON.stringify((await get("/api/stats?count=100")).body));
  const mk = (await get("/api/market")).body;
  console.log("GET /api/market   :", mk && mk.market ? `symbol=${mk.market.symbol} bid=${mk.market.bid} m1=${mk.market.m1_candles.length} m5=${mk.market.m5_candles.length} age=${mk.market.age_seconds}s` : "(none)");

  // 6) ทดสอบ auth: POST ไม่มี key ต้อง 401
  const noKey = await fetch(BASE + "/api/signal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: "NOKEY", symbol: "XAUUSD", direction: "BUY", entry: 1, sl: 1, tp1: 1, tp2: 1, tp3: 1, tp4: 1, signal_time: now }),
  });
  console.log(`\n— auth check: POST /api/signal ไม่มี key => HTTP ${noKey.status} (คาดว่า 401)\n`);

  console.log("[seed-test] เสร็จสิ้น  เปิด index.html เพื่อดูข้อมูลในหน้าเว็บ");
}

main().catch((e) => {
  console.error("[seed-test] error:", e.message);
  console.error(`       ตรวจว่า server รันอยู่ที่ ${BASE} (npm start)`);
  process.exit(1);
});
