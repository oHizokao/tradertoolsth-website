# Tradertoolsth Signal Terminal

**Real-time trading signal dashboard** สำหรับ MT5 EA ที่ส่งสัญญาณผ่าน HTTP API มาแสดงผลบนเว็บ

---

## 📐 Architecture

```
MT5 (EA: Trend_Follow_M5M1)
        │
        │  POST /api/signal        (สัญญาณใหม่)
        │  POST /api/status        (TP/SL update)
        │  POST /api/market        (ราคา + candles)
        │  POST /api/signal/bulk   (sync ย้อนหลัง)
        ▼
┌─────────────────────────────┐
│  Node.js Server (port 8787) │
│  - SQLite (better-sqlite3)  │
│  - Express REST API         │
│  - Signal classification    │
└────────────┬────────────────┘
             │  GET /api/latest, /history, /stats, /market
             ▼
┌─────────────────────────────┐
│  Web Dashboard (index.html) │
│  - Real-time candle chart   │
│  - Signal panel (TP/SL)     │
│  - Signal history list      │
│  - Performance stats        │
└─────────────────────────────┘
```

---

## 🚀 Quick Start

### 1. Install & Run Server
```bash
cd server
npm install
node server.js
```

เปิดเบราว์เซอร์: `http://127.0.0.1:8787`

### 2. ตั้งค่า MT5 EA
1. Copy `Trend_Follow_M5M1.mq5` ไปใส่ใน `MQL5/Experts/`
2. Compile ใน MetaEditor (F7)
3. ใส่ EA ในกราฟ BTCUSDS M1 หรือ M5
4. ตั้งค่า EA:
   - `WebsiteURL` = `http://127.0.0.1:8787`
   - `WebsiteApiKey` = ค่าเดียวกับใน `server/.env`

### 3. Environment Variables (`server/.env`)
```env
PORT=8787
API_KEY=your-secret-key-here
STALE_SECONDS=15
SIGNAL_OLD_SECONDS=3600
```

---

## 🗂️ Project Structure

```
tradertoolsth-website/
├── index.html              # หน้า dashboard หลัก
├── app.js                  # Frontend logic (chart, signal panel, history)
├── styles.css              # CSS styling
├── Trend_Follow_M5M1.mq5   # MT5 EA source code
├── Trend_Follow_M5M1.ex5   # EA compiled binary
└── server/
    ├── server.js           # Entry point (Express app)
    ├── db.js               # SQLite schema + prepared statements
    ├── auth.js             # API key middleware
    ├── validate.js         # Input validation
    ├── routes/
    │   ├── public.js       # GET endpoints (dashboard reads)
    │   └── ingest.js       # POST endpoints (EA writes)
    └── scripts/
        ├── audit_signals.js      # ตรวจสอบ timestamps ใน DB
        └── patch_signal_times.js # แก้ timestamps ที่ผิด (one-time)
```

---

## 📡 API Endpoints

### EA → Server (POST, ต้องมี `X-Api-Key` header)

| Endpoint | Body | Description |
|---|---|---|
| `POST /api/signal` | Signal object | สัญญาณใหม่ หรือ update |
| `POST /api/status` | `{ id, status, result, tp1_status...tp4_status }` | อัปเดต TP/SL hit |
| `POST /api/market` | Market snapshot + candles | ราคาปัจจุบัน + OHLC |
| `POST /api/signal/bulk` | `{ signals: [...] }` | Bulk sync ย้อนหลัง (max 100) |

### Dashboard → Server (GET)

| Endpoint | Description |
|---|---|
| `GET /api/health` | Health check |
| `GET /api/latest?symbol=&timeframe=` | สัญญาณล่าสุด (ACTIVE) |
| `GET /api/history?symbol=&timeframe=&limit=50` | ประวัติสัญญาณ 50 รายการ |
| `GET /api/stats?symbol=&timeframe=` | สถิติ TP1-TP4 win rate |
| `GET /api/market?symbol=&timeframe=` | ราคา + candles ล่าสุด |
| `GET /api/instances` | รายชื่อ symbol+timeframe ที่ active |

---

## 📊 Signal Lifecycle

```
EA generates signal
        │
        ▼
POST /api/signal ──────► DB: result=OPEN, status=ACTIVE
        │
        │  TP hit
        ▼
POST /api/status ──────► DB: tp1_status=1, status="TP1 HIT"
        │
        │  All TPs hit or SL hit
        ▼
POST /api/status ──────► DB: result=WIN or LOSS
```

### Signal `kind` Classification (server-side)
| Kind | Condition |
|---|---|
| `ACTIVE` | `result=OPEN` และ age < 1 ชั่วโมง |
| `OLD` | `result=OPEN` แต่ age > 1 ชั่วโมง |
| `CLOSED` | `result=WIN` หรือ `result=LOSS` |
| `TEST` | source มี "test" หรือ "seed" |

> **หมายเหตุ Timezone:** MT5 ส่ง `signal_time` เป็น Broker Time ซึ่งอาจต่างจาก server UTC ดังนั้น server ใช้ `updated_at` (เวลาที่รับจริง) เป็น fallback สำหรับการคำนวณ age หาก `signal_time` อยู่ในอนาคต

---

## 🎨 Dashboard Features

### 📈 Chart
- **Candlestick chart** real-time (M1/M5)
- **Signal levels**: ENTRY (เหลือง), TP1-4 (เขียว), SL (แดง)
- **TP HIT**: เส้นทึบสว่าง + label "TP1 ✓"
- **Current price**: เส้นขาวประ + กล่องราคา

### 🎯 Signal Panel (ขวา)
- Badge: **ACTIVE** / **WIN · TP3** / **LOSS · SL**
- TP rows: name | price | `✓ HIT` / `→ เป้าถัดไป` / `+35.2`
- Progress bar: X / 4 TP
- Result banner (สีเขียว/แดง) เมื่อปิดผลแล้ว

### 📜 Signal History
- รายการสัญญาณ 50 อันล่าสุด
- แสดง age (เมื่อกี้ / 27 นาที / 5 ชม)
- TP dots: T1 T2 T3 T4 (สีเขียว = HIT)
- Dedup อัตโนมัติโดย signal ID

---

## ⚙️ EA Settings

| Parameter | Default | Description |
|---|---|---|
| `WebsiteURL` | `http://127.0.0.1:8787` | URL ของ server |
| `WebsiteApiKey` | (ต้องตั้ง) | API key ให้ตรงกับ server |
| `MaxSignalHistory` | 500 | จำนวน signals ที่ scan ย้อนหลัง |

> **Bulk Sync:** EA จะส่งสัญญาณย้อนหลัง **สูงสุด 100 อัน** เมื่อ initialize เพื่อป้องกัน EA ค้าง

---

## 🔧 Troubleshooting

### EA ค้าง / Freeze
- ตรวจสอบว่า server กำลัง run (`node server.js`)
- EA จำกัด bulk sync ที่ 100 signals แต่ถ้ายังช้า ลด `max_sync` ใน `WebsiteSyncAllSignals()`

### สัญญาณแสดงเป็น ACTIVE ทั้งที่เก่าแล้ว
- รัน: `node scripts/patch_signal_times.js` เพื่อแก้ timestamps ที่ผิด
- ตรวจสอบ: `node scripts/audit_signals.js`

### กราฟไม่แสดง candles
- EA ต้องส่ง `POST /api/market` พร้อม candles array
- ตรวจสอบ MT5 journal ว่า POST สำเร็จ

### สัญญาณไม่ match กับ MT5
- Broker time กับ server time อาจต่างกัน (timezone)
- Server ใช้ `updated_at` เป็น fallback สำหรับ signals ที่ signal_time อยู่ในอนาคต
