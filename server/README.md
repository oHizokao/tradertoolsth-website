# Tradertoolsth Signal Server

รับ HTTP POST JSON จาก EA `Trend_Follow_M5M1` (MT5) แล้วบันทึกลง SQLite
หน้า Signal Terminal (`index.html`) ดึงข้อมูลจาก GET endpoints ตรงนี้

**Stack:** Node.js + Express + better-sqlite3 + dotenv + cors

---

## 1) ติดตั้ง

```bash
cd server
npm install
cp .env.example .env       # แล้วแก้ API_KEY ให้เป็นค่าที่ยากเดา
```

ต้องมี Node.js เวอร์ชัน 18 ขึ้นไป (ทดสอบกับ Node 22)

## 2) รัน

```bash
npm start          # รันปกติ
npm run dev        # auto-reload (node --watch)
```

ค่าเริ่มต้นฟังที่ `http://0.0.0.0:8787`
เปิดหน้า Signal Terminal ได้ที่ `http://127.0.0.1:8787/`
ดูข้อมูล API server ได้ที่ `http://127.0.0.1:8787/api/info`

> **หน้าเว็บกับ API รันบน origin เดียวกัน:** server เสิร์ฟ static files
> (`index.html`, `styles.css`, `app.js`) จาก project root (parent ของ `server/`)
> จึงเปิด `http://127.0.0.1:8787/` ในเบราว์เซอร์แล้วเห็น Signal Terminal ได้ทันที
> ส่วน `app.js` จะใช้ same-origin เป็น `API_BASE` อัตโนมัติ (ถ้าเปิดไฟล์ `index.html`
> ตรงๆ ผ่าน `file://` จะ fallback ไป `http://127.0.0.1:8787`)

## 3) ทดสอบโดยไม่ต้องรอสัญญาณจริง

```bash
npm start                       # terminal 1: รัน server
npm run seed:test               # terminal 2: ส่ง payload ทดสอบ (signal/status/market)
```

`seed:test` จะ:
- สร้าง `.env` ให้ใหม่หากยังไม่มี (พร้อม API_KEY)
- POST signal BUY ใหม่, อัปเดตสถานะ TP1 HIT, POST SELL ที่จบ SL, POST market snapshot (M1/M5)
- เรียก GET ทุก endpoint แสดงผล
- ตรวจ auth: POST ที่ไม่มี `x-api-key` ต้องได้ `401`

ไม่มีการส่งคำสั่งเทรดใดๆ ทั้งสิ้น

---

## API

### อ่าน (GET — ไม่ต้องมี key)

| Method | Path | คำอธิบาย |
| --- | --- | --- |
| GET | `/api/health` | สถานะ server + อายุข้อมูลล่าสุด + `feed` (`LIVE`/`STALE`/`OFFLINE`) |
| GET | `/api/latest` | สัญญาณล่าสุด |
| GET | `/api/history?limit=50` | ประวัติสัญญาณ (ใหม่→เก่า) |
| GET | `/api/stats?count=100` | Win/Loss/Winrate ต่อ TP1–TP4 จากสัญญาณที่ปิดผลแล้ว |
| GET | `/api/market` | snapshot ราคา + แท่งเทียน M1/M5 ล่าสุด |
| GET | `/api/info` | รายการ endpoint ของ server |

### เขียน (POST — ต้องมี header `x-api-key: <API_KEY>`)

| Method | Path | คำอธิบาย |
| --- | --- | --- |
| POST | `/api/signal` | สัญญาณใหม่ หรืออัปเดต (UPSERT ตาม `id`) |
| POST | `/api/status` | อัปเดตสถานะ TP/SL ของ signal `id` ที่มีอยู่ |
| POST | `/api/market` | snapshot ราคา + OHLC M1/M5 |

หากไม่มี key → `401`, payload ผิด format → `400`, `id` ไม่พบใน `/api/status` → `404`

---

## Payload ตัวอย่าง

### POST /api/signal
```json
{
  "id": "790011-1783853667",
  "symbol": "XAUUSD",
  "direction": "BUY",
  "signal_time": 1783853667,
  "entry": 2415.80,
  "sl": 2413.20,
  "tp1": 2417.10, "tp2": 2418.40, "tp3": 2419.70, "tp4": 2421.00,
  "macd": 0.00042,
  "is_reentry": false,
  "source": "Trend_Follow_M5M1"
}
```

### POST /api/status
```json
{
  "id": "790011-1783853667",
  "status": "TP1 HIT",
  "result": "OPEN",
  "tp1_status": 1, "tp2_status": 0, "tp3_status": 0, "tp4_status": 0
}
```
`tpX_status`: `1` = HIT (win), `-1` = miss/SL, `0` = ยังเปิดอยู่

### POST /api/market
```json
{
  "symbol": "XAUUSD",
  "bid": 2417.36,
  "ask": 2417.51,
  "spread": 15,
  "broker_time": 1783853787,
  "m1_candles": [
    { "time": 1783853700, "open": 2417.0, "high": 2417.4, "low": 2416.8, "close": 2417.2 }
  ],
  "m5_candles": [
    { "time": 1783853700, "open": 2416.5, "high": 2417.5, "low": 2416.3, "close": 2417.3 }
  ]
}
```
`time` ใช้ epoch seconds ของเวลาเปิดแท่ง (broker time)

---

## ตั้งค่า MT5 ให้ EA ส่ง WebRequest ได้

ก่อนที่ EA จะเรียก backend ได้ MT5 ต้องอนุญาต URL:

1. เปิด MT5 → **Tools → Options → Expert Advisors**
2. ติ๊ก **Allow WebRequest for listed URL**
3. เพิ่ม URL ของ server: `http://127.0.0.1:8787` (รันในเครื่อง) หรือโดเมนจริงถ้า deploy
4. กด OK แล้วโหลด EA ใหม่

ใน inputs ของ EA ตั้ง:
- `InpUseWebsiteSync = true`
- `InpWebsiteApiUrl = http://127.0.0.1:8787`
- `InpWebsiteApiKey = <ค่าเดียวกับ API_KEY ใน .env>`
- `InpWebsitePriceMs = 3000`

กดปุ่ม **Test Telegram** บนกราฟ EA จะส่ง test signal ไปทั้ง Telegram และ Website (ถ้าเปิด sync ไว้)

---

## โครงสร้างไฟล์

```
server/
├── server.js              Express app (entrypoint)
├── db.js                  SQLite connection + schema + prepared statements
├── auth.js                middleware ตรวจ x-api-key (timing-safe)
├── validate.js            payload validators (signal/status/market)
├── logger.js              request + error logging
├── routes/
│   ├── ingest.js          POST /api/signal, /api/status, /api/market
│   └── public.js          GET /api/health, /latest, /history, /stats, /market
├── scripts/
│   └── seed-test.js       ส่ง payload ทดสอบครบ
├── data/                  (runtime) เก็บ tradertoolsth.sqlite
├── .env.example
└── package.json
```

## Best-TP lifecycle

- TP1-TP3 keep the signal open; TP4 closes it as a win.
- SL before any TP closes as `SL HIT / LOSS`.
- SL after a TP closes at the highest achieved target, such as `TP3 THEN SL / WIN`.
- Target states are cumulative: a TP3 close records TP1-TP3 as hit and TP4 as missed.
- Same-candle TP/SL ambiguity is resolved conservatively with SL first.
- A replacement is stored as `REPLACED` and is excluded from Latest and resolved statistics.
- Run lifecycle checks with `npm test`.

## Schema (SQLite)

- **signals** — สัญญาณหนึ่งแถวต่อ `id` (UPSERT ตาม id) เก็บ entry/sl/tp1-4/status/result/tpX_status
- **market_snapshots** — แถวเดียวต่อ symbol เก็บ bid/ask/spread + m1/m5 candles (JSON)
- **events** — audit log ทุกการเขียน (signal/status/market)

## งานที่ยังเหลือ (production)

- วาง server บน VPS พร้อม HTTPS/reverse proxy
- เปลี่ยน `API_KEY` เป็นค่าจริงที่ยากเดา และตั้ง `ALLOWED_ORIGIN` เป็นโดเมนเว็บจริง
- สำรองไฟล์ `data/*.sqlite` เป็นระยะ
- (ไม่บังคับ) เพิ่ม rate limiting / IP allowlist ถ้าเปิดสู่สาธารณะ
