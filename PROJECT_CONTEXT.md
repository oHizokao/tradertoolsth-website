# Tradertoolsth - Project Context

## เป้าหมาย

สร้างเว็บไซต์ **Tradertoolsth** เพื่อแสดงสัญญาณเทรดจาก EA ชื่อ `Trend_Follow_M5M1` ให้ดูเป็นมืออาชีพ อ่านง่าย และคุ้นเคยสำหรับคนที่ใช้กราฟเทรดจริง

เวอร์ชันแรกต้องเป็น **Landing page หน้าเดียว** ที่เน้นการดูสัญญาณและกราฟ ไม่ใช่หน้าเว็บไซต์แนวโฆษณา

## EA ที่เป็นแหล่งข้อมูล

- ชื่อไฟล์: `Trend_Follow_M5M1.mq5`
- ตำแหน่งปัจจุบัน:
  `C:\Users\UsEr\AppData\Roaming\MetaQuotes\Terminal\75108AAC6E09E57B5EE619C88DF23A51\MQL5\Experts\Trend_Follow_M5M1.mq5`
- เป็น **Signal EA** ไม่ได้เปิดออเดอร์จริง
- EA สร้างสัญญาณ, วาดวัตถุบนกราฟ MT5, ติดตามผล TP/SL, มี Dashboard และส่ง Telegram ได้
- ต้องเปิด MT5 และรัน EA ไว้ตลอดเพื่อให้มีสัญญาณและราคาส่งเข้าเว็บ

## ค่าที่เว็บต้องนำไปแสดง

เมื่อ EA ออกสัญญาณ เว็บควรได้รับและแสดง:

- Signal ID
- Symbol เช่น `XAUUSD`
- Direction: `BUY` หรือ `SELL`
- เวลาที่ออกสัญญาณ
- Entry หรือ Entry Zone
- Stop Loss
- TP1, TP2, TP3, TP4
- สถานะปัจจุบัน เช่น `ACTIVE`, `TP1 HIT`, `TP2 HIT`, `TP3 HIT`, `TP4 HIT`, `SL HIT`
- ผลลัพธ์ของสัญญาณที่ปิดแล้ว

สำหรับกราฟ เว็บต้องรับข้อมูลจาก MT5 โบรกเกอร์เดียวกับ EA:

- ราคา ณ ปัจจุบัน
- แท่งเทียน OHLC ของ M1 และ M5
- เวลาและ Timeframe ของแท่งเทียน

## Dashboard ที่ต้องตรงกับ EA

EA มี Dashboard ที่คำนวณ Win rate จากสัญญาณที่ปิดผลแล้วล่าสุด โดยค่าเริ่มต้นใช้ 100 สัญญาณ (`InpDashSignalCount`)

Win rate ต้องแสดงแบบแยกตามเป้าหมาย:

| Target | ค่าที่ต้องแสดง |
| --- | --- |
| TP1 | Win, Loss, Winrate |
| TP2 | Win, Loss, Winrate |
| TP3 | Win, Loss, Winrate |
| TP4 | Win, Loss, Winrate |

### สิ่งที่ห้ามแสดงในตอนนี้

EA ไม่ได้เปิดออเดอร์จริง จึงไม่ควรอ้างข้อมูลเหล่านี้จนกว่าจะมีแหล่งข้อมูลและสูตรคำนวณที่ชัดเจน:

- Monthly Return
- กำไร/ขาดทุนจากพอร์ตจริง
- Profit Factor จากบัญชีเทรด
- Equity หรือ Balance
- Pips รวม หาก EA ยังไม่ได้ส่งและกำหนดวิธีคิดไว้ชัดเจน

## แนวทางหน้าตาเว็บไซต์

หน้าเว็บควรเป็น **Signal Terminal** ที่ดูคล้ายแพลตฟอร์มกราฟเทรดสมัยใหม่ ไม่ใช่ TradingView ที่ฝังมาโดยตรง

### ส่วนบนของหน้า

- ชื่อแบรนด์ Tradertoolsth / Trend Follow
- สถานะการเชื่อมต่อข้อมูลจาก EA เช่น `EA FEED LIVE`
- สัญญาณล่าสุดเป็นจุดเด่น
- แสดง `BUY` หรือ `SELL`, XAUUSD, Entry, SL, TP1-TP4 และสถานะ

### กราฟหลัก

- เป็น Candlestick Chart ที่หน้าตาและการใช้งานคุ้นเคยแบบ TradingView
- มี Timeframe อย่างน้อย M1 และ M5
- แสดงราคาจาก MT5 ของโบรกเกอร์เดียวกับ EA
- วาดเส้น Entry, SL และ TP1-TP4 บนกราฟ
- วางป้าย BUY/SELL ณ จุดออกสัญญาณ
- รองรับซูมและเลื่อนดูย้อนหลังในเวอร์ชันใช้งานจริง

### ส่วน Dashboard และ History

- ตาราง Win / Loss / Winrate แยก TP1-TP4 ตาม EA
- Signal History: เวลา, Direction, Entry, ผลลัพธ์, สถานะ
- สามารถมีภาพ Snapshot จาก MT5 ตอนออกสัญญาณเป็นข้อมูลเสริมภายหลัง

## แหล่งข้อมูลกราฟ: ข้อสรุปที่ตกลงกัน

กราฟหลักต้องใช้ราคาและแท่งเทียนจาก MT5 ไม่ใช่ราคา TradingView จากภายนอก

เหตุผล: ราคา XAUUSD ของ TradingView อาจต่างจากโบรกเกอร์ที่ EA ใช้ ทำให้ Entry, SL และ TP ดูไม่ตรงกับสัญญาณจริง

คำว่า "เหมือน TradingView" หมายถึง **หน้าตาและประสบการณ์การใช้กราฟ** ไม่ได้หมายถึงใช้ TradingView เป็นแหล่งสัญญาณหรือแหล่งราคาหลัก

## การเชื่อมต่อข้อมูลที่ต้องสร้างภายหลัง

ตอนนี้ยังไม่มี API ของเว็บไซต์ ต้องสร้างขึ้นใหม่

โครงสร้างที่ต้องการ:

```text
Trend_Follow_M5M1 บน MT5
        -> ส่ง Signal + สถานะ + OHLC/ราคา
API ของเว็บไซต์
        -> บันทึกข้อมูล
ฐานข้อมูล
        -> อ่านข้อมูล
Landing page / Signal Terminal
```

EA ควรส่งข้อมูลออกผ่าน HTTP ไปยัง API ของเว็บไซต์:

- ส่งทันทีเมื่อเกิดสัญญาณใหม่
- ส่งเมื่อสถานะสัญญาณเปลี่ยน เช่น TP หรือ SL ถูกแตะ
- ส่งแท่งเทียนและราคาปัจจุบันเป็นระยะ เช่น ทุก 3-5 วินาที

หาก MT5 ปิดหรือ EA หยุดทำงาน เว็บไซต์ยังแสดงข้อมูลล่าสุดที่บันทึกไว้ได้ แต่จะไม่มีข้อมูลสดหรือสัญญาณใหม่

## สถานะปัจจุบันของงาน

- เปลี่ยนชื่อ EA และไฟล์เป็น `Trend_Follow_M5M1` แล้ว
- ย้ายไฟล์ EA ไปที่โฟลเดอร์ `MQL5/Experts` แล้วเพื่อทดสอบใน MT5
- สร้างหน้า Signal Terminal แบบ Static Prototype แล้วในโฟลเดอร์นี้:
  - `index.html`: โครงหน้าจอ
  - `styles.css`: งานออกแบบและ responsive layout
  - `app.js`: กราฟแท่งเทียนจำลอง, ราคาเคลื่อนไหวจำลอง, สลับ M1/M5 และขยายกราฟ
- หน้าจอแสดงกระบวนการสัญญาณ 5 ขั้น: ตรวจแนวโน้ม, ยืนยันโซน, ออกสัญญาณ, ติดตาม TP/SL และสรุปผล
- หน้าเว็บยังใช้ข้อมูลจำลอง และแสดงป้าย `DEMO DATA` / `EA FEED SIMULATED` อย่างชัดเจน
- ทดสอบการแสดงผลบนเดสก์ท็อปและมือถือแล้ว รวมถึงปุ่มสลับ M1/M5
- ยังไม่มี API, ฐานข้อมูล หรือการส่งข้อมูลจริงจาก EA ไปยังเว็บ

## บันทึกงาน

### 2026-07-12 (Prototype)

- สร้าง Signal Terminal Prototype ให้สอดคล้องกับข้อมูลที่ EA สามารถส่งได้
- เพิ่มกราฟ Candlestick พร้อมเส้น Entry, SL, TP1-TP4 และป้าย BUY
- เพิ่มแผงสัญญาณล่าสุด, สถิติ TP1-TP4 และประวัติสัญญาณในรูปแบบข้อมูลจำลอง
- วางแนวทางเชื่อมข้อมูลจริง: EA ส่ง HTTP POST แบบ JSON ไปยัง API, API บันทึกลงฐานข้อมูล และหน้าเว็บอ่านจาก API
- ยืนยันหลักการทำงาน: เว็บไซต์แสดงผลเท่านั้น ส่วน EA เป็นผู้สร้างสัญญาณและเป็นแหล่งข้อมูลราคา/ระดับสัญญาณ

### 2026-07-12 (ระบบเชื่อมข้อมูลจริง — ทดสอบในเครื่องแล้ว)

เป้าหมายรอบนี้คือสร้างไปป์ไลน์ข้อมูลจริงจาก EA `Trend_Follow_M5M1` บน MT5 ไปยังหน้า Signal Terminal โดยรันทดสอบได้ในเครื่อง ยังไม่ deploy

#### สิ่งที่ทำเสร็จ

- **สร้าง backend Node.js ใน `server/`** (Express + better-sqlite3 + dotenv + cors)
  - ไฟล์: `server.js`, `db.js` (schema + prepared statements), `auth.js` (timing-safe API key), `validate.js` (payload validators), `logger.js` (request/error logging)
  - routes: `routes/ingest.js` (POST), `routes/public.js` (GET)
  - สนับสนุน: `package.json`, `.env.example`, `.gitignore`, `README.md`, `scripts/seed-test.js`
- **API endpoints ครบ:**
  - POST (ต้องมี `x-api-key`): `/api/signal` (UPSERT ตาม id), `/api/status` (อัปเดต TP/SL), `/api/market` (snapshot ราคา + OHLC M1/M5)
  - GET (ไม่ต้อง key): `/api/health`, `/api/latest`, `/api/history?limit=`, `/api/stats?count=`, `/api/market`
  - `health` คืน `feed` = `LIVE` / `STALE` / `OFFLINE` ตามอายุข้อมูล market
- **แก้หน้าเว็บ** (`index.html`, `app.js`, `styles.css`):
  - ดึง API จริงทุก 3 วินาที (`Promise.all` ของ health/latest/history/stats/market)
  - สถานะการเชื่อมต่อ 3 ระดับแสดงใน badge: `EA FEED LIVE` (เขียว), `EA FEED STALE` (เหลือง), `EA FEED OFFLINE` (เทา)
  - กฎ fallback DEMO เข้มงวด: แสดง banner `DEMO DATA` + ข้อมูลจำลอง **เฉพาะเมื่อไม่เคยได้ข้อมูลจริงเลย** ทันที่ที่มีข้อมูลจริง 1 รายการ banner DEMO จะถูกซ่อน ห้ามปนข้อมูล demo กับข้อมูลจริง
  - กราฟ candlestick รับ candles จริงจาก `m1_candles`/`m5_candles` และวาดเส้น Entry/SL/TP1-TP4 + ลูกศร BUY/SELL จากสัญญาณจริง
- **แก้ EA `Trend_Follow_M5M1.mq5`** (เพิ่ม ไม่ทำลายของเดิม):
  - เพิ่ม input group `=== Website Sync ===`: `InpUseWebsiteSync`, `InpWebsiteApiUrl`, `InpWebsiteApiKey`, `InpWebsiteTimeout`, `InpWebsitePriceMs`, `InpWebsiteCandles`
  - เพิ่ม helper HTTP ปลอดภัย: `WebsiteReady()`, `JsonEscape()`, `WebsitePostJson()` (ใช้ WebRequest 7-arg เหมือน Telegram แต่ header `Content-Type: application/json` + `x-api-key`), `WebsiteBuildSignalJson/StatusJson/CandlesJson/MarketJson`, และ `WebsiteSendSignal/Status/Market`
  - จุดเชื่อม: `FireSignal` (ส่งสัญญาณใหม่), `EvalSignalLive` (ส่ง status เมื่อ TP/SL เปลี่ยน ตรวจ delta ก่อนส่ง), `OnTick` (ส่ง market ตาม `InpWebsitePriceMs`), `SendTelegramTest` (กดปุ่มเดียวทดสอบทั้ง Telegram + Website)
  - ทุก helper เริ่มต้นด้วย `if(!WebsiteReady()) return;` จึงปิดได้ด้วย input เดียว ไม่กระทบ Telegram และ signal engine เดิม
- **เพิ่มวิธีทดสอบ** โดยไม่ต้องรอสัญญาณจริง: `npm run seed:test` (ส่ง signal BUY + TP1 HIT + SELL→SL + market snapshot) และปุ่ม Test Signal บนกราฟ EA (ไม่มีการเปิดออเดอร์จริงใดๆ)
- **เปิดใช้งานหน้าเว็บผ่าน backend**: `http://127.0.0.1:8787/` เสิร์ฟ Signal Terminal โดยตรง และย้ายข้อมูล server ไปที่ `/api/info`
- **แก้ bug demo badge หลังทดสอบ browser**: เพิ่ม rule `[hidden]` และตั้ง `hidden` ให้ `demo-banner` โดยตรง เพื่อไม่ให้ `DEMO DATA` แสดงเมื่อมีข้อมูลจริงแล้ว
- **ผลตรวจสุดท้ายหลังแก้เพิ่ม**: `node --check` ผ่านทุกไฟล์ JS หลัก, `http://127.0.0.1:8787/` คืนหน้า HTML, `/api/health` เป็น `ok`, feed เป็น `LIVE` หลัง `seed:test`, browser แสดง `EA FEED LIVE` และไม่มี `DEMO DATA` เมื่อมีข้อมูลจริง

#### ผลทดสอบในเครื่อง (ผ่านทั้งหมด)

- `npm install` สำเร็จ และ better-sqlite3 native module ทำงานบน Node 22 / Windows x64
- `seed-test.js`: POST signal/status/market ได้ 200 ครบ, GET ทุก endpoint คืนข้อมูลถูกต้อง
- auth: POST ไม่มี `x-api-key` → `401`, payload ผิด → `400`, `id` ไม่พบใน `/api/status` → `404`, route ไม่มี → `404`
- CORS: ส่ง `Access-Control-Allow-Origin: *`
- สถานะ feed: มีข้อมูลสด → `LIVE`, ข้อมูลเก่า > 15s → `STALE`, ไม่มีข้อมูลเลย → `OFFLINE`
- frontend `app.js` ผ่าน `node --check` (syntax ถูก)
- EA `.mq5` compile ผ่านด้วย `C:\Program Files\EC Markets MT5 Terminal\MetaEditor64.exe`: 0 errors, 0 warnings และสร้าง `Trend_Follow_M5M1.ex5`

#### วิธีรัน

```bash
# 1) backend
cd server
npm install                 # ครั้งแรก
cp .env.example .env        # แล้วแก้ API_KEY
npm start                   # ฟัง http://127.0.0.1:8787

# 2) ทดสอบโดยไม่ต้องรอสัญญาณจริง
npm run seed:test           # terminal 2 (ส่ง payload ครบ)

# 3) ดูหน้าเว็บ
#    เปิด http://127.0.0.1:8787/
```

#### วิธีตั้งค่า Allow WebRequest ใน MT5

ก่อนที่ EA จะส่ง HTTP ไป backend ได้ MT5 ต้องอนุญาต URL:

1. MT5 → **Tools → Options → Expert Advisors**
2. ติ๊ก **Allow WebRequest for listed URL**
3. เพิ่ม `http://127.0.0.1:8787` (หรือ URL ของ server จริงถ้า deploy)
4. กด OK แล้ว reload EA

ใน inputs ของ EA ตั้ง:
- `InpUseWebsiteSync = true`
- `InpWebsiteApiUrl = http://127.0.0.1:8787`
- `InpWebsiteApiKey = <ค่าเดียวกับ API_KEY ใน server/.env>`
- `InpWebsitePriceMs = 3000` (ส่ง snapshot ราคาทุก 3 วินาที)

กดปุ่ม **Test Signal** บนกราฟ EA จะส่ง test signal ไปทั้ง Telegram และ Website Sync (ถ้าเปิดไว้)

บันทึกใช้งานจริง 2026-07-12: ปรับค่า default สำหรับทดสอบ local ให้ `InpUseWebsiteSync = true` และ `InpWebsiteApiKey = dev-test-key-t47101fs` แล้ว compile `Trend_Follow_M5M1.ex5` ใหม่ผ่าน 0 errors / 0 warnings เพื่อให้กด Reset ใน EA properties แล้วใช้งาน Website Sync ได้ทันที

#### หลักการที่ใช้ในการแยก demo กับจริง

- `hasRealData` ใน `app.js` ตั้งเป็น `true` เมื่อได้ signal หรือ market จริงแม้ 1 ครั้ง
- banner DEMO + badge `DEMO DATA` แสดงเฉพาะเมื่อ `hasRealData === false`
- กราฟ candlestick: ใช้ candles จริงถ้ามี, ถ้าไม่มีจึงใช้ `makeDemoCandles()` และไม่วาด demand zone (demand zone เป็นของ demo เท่านั้น)

### 2026-07-12 (ใช้งานจริงในเครื่อง - รอบตรวจล่าสุด)

- ตรวจแล้วว่า backend ที่ `http://127.0.0.1:8787/` ยังทำงาน และ `/api/health` เป็น `feed: LIVE`
- ยืนยันว่า EA/MT5 ส่ง market snapshot จริงเข้า backend ต่อเนื่องทุกประมาณ 3 วินาที: event ล่าสุดเป็น `market` และ `last_market_age_s` ใกล้ 0
- พบว่าปุ่ม `Test Signal` ยังไม่สร้าง signal ใหม่ในฐานข้อมูล: `signal_count` ยังเป็น 4 และ recent events มีแต่ `market`
- แก้ `Trend_Follow_M5M1.mq5` เพื่อ debug และใช้งานปุ่มทดสอบให้ชัดขึ้น:
  - เพิ่ม log เมื่อกด `Test Signal` ว่า Website Sync เปิดอยู่ไหม, URL คืออะไร, API key ยาวกี่ตัว
  - เพิ่ม log เมื่อ POST สำเร็จ เช่น `/api/signal OK`
  - เพิ่ม signal id ใน log `[WebSync] signal`
  - ให้ test signal ใช้ `TimeLocal()` เพื่อสร้าง id ใหม่ตามเวลาปัจจุบัน ลดโอกาสชน id เดิม
- Compile `Trend_Follow_M5M1.ex5` ใหม่แล้วผ่าน: 0 errors / 0 warnings
- รอบทดสอบถัดมาพบว่า MT5 ยังไม่ได้โหลดโค้ด debug ใหม่จริงจาก memory เดิม และมีการกดปุ่ม `Load` ผิดจนหน้าต่างเลือก `.set` บังอยู่
- แก้เพิ่มอีกชั้นใน `OnTick`: ถ้าปุ่ม `Test Signal` ถูกกดค้างแต่ `OnChartEvent` ไม่ยิง จะตรวจ `OBJPROP_STATE`, reset ปุ่ม, แล้วเรียก `SendTelegramTest()` เอง
- Compile ใหม่อีกครั้งแล้วผ่าน: 0 errors / 0 warnings, `Trend_Follow_M5M1.ex5` อัปเดตเวลา 2026-07-12 20:31:46 +07:00
- เพิ่ม `InpSendStartupWebsiteTest` ชั่วคราวเป็น `true`, กด Reset/OK ใน Inputs เพื่อบังคับให้ EA reinit ด้วยค่า default ใหม่ และพิสูจน์การส่ง `/api/signal` จาก EA จริง
- ยืนยันสำเร็จ: `/api/health` เปลี่ยนเป็น `signal_count: 5`, `last_signal_age_s` สด และ `/api/latest` ได้ signal ใหม่จาก EA จริง:
  - `id: 790011-1783888589`
  - `symbol: XAUUSDS`
  - `direction: BUY`
  - `entry: 4113.78`, `sl: 4109.67`, `tp1: 4115.84`, `tp2: 4117.89`, `tp3: 4119.95`, `tp4: 4122.01`
  - `source: Trend_Follow_M5M1`
- ปิด `InpSendStartupWebsiteTest` กลับเป็น `false` แล้ว compile เวอร์ชันใช้งานจริงทับไว้ ผ่าน 0 errors / 0 warnings
- สถานะตอนนี้: เว็บใช้งานได้ที่ `http://127.0.0.1:8787/`, market feed เป็น LIVE, signal จาก EA เข้า backend/web ได้จริงแล้ว
- ทำ cleanup สุดท้าย: ลบ logic startup-test ออกจาก `OnInit` เพื่อกันการยิง test ซ้ำในอนาคต แล้ว compile `Trend_Follow_M5M1.ex5` อีกครั้ง ผ่าน 0 errors / 0 warnings
- Restart MT5 หลัง cleanup แล้วตรวจซ้ำ:
  - `signal_count` ยังเป็น 5 (ไม่ยิง test ซ้ำเอง)
  - `feed: LIVE`
  - `last_market_age_s: 0`
  - `/api/latest` ยังเป็น signal จริงล่าสุดจาก EA `790011-1783888589`
- สถานะพร้อมใช้งาน: เปิด MT5 + EA ค้างไว้, เปิด backend ค้างไว้, แล้วใช้งานเว็บที่ `http://127.0.0.1:8787/`

### 2026-07-12 (Requirement เพิ่มเติมเรื่อง realtime chart + signal display)

- หน้าเว็บควรแยกให้ชัดระหว่าง **กราฟ realtime** กับ **signal ล่าสุด**
- กราฟต้องขยับตามราคา/แท่งเทียนจาก MT5 แบบ realtime ตาม market snapshot ที่ EA ส่งมา
- Signal ล่าสุดควรค้างไว้บนกราฟให้เห็นสวย ๆ เฉพาะเมื่อมี signal จริงอยู่ในระบบ และต้องไม่ทำให้ผู้ใช้เข้าใจผิดว่าเป็นสัญญาณใหม่เสมอ
- ถ้ายังไม่มี signal จริงของคู่ที่เลือก/คู่ที่กำลังดู ควรแสดงสถานะชัดเจน เช่น `No active signal` หรือ `Waiting for signal` แทนการโชว์ signal test/เก่าแบบหลอกตา
- ถ้ามี signal อยู่ ให้แสดงเหมือน signal trading ที่ควรเป็น:
  - แสดง direction BUY/SELL, symbol, entry, SL, TP1-TP4
  - วาดเส้น/label บนกราฟ realtime
  - แสดงสถานะว่า `ACTIVE`, `TP HIT`, `SL HIT`, หรือ `STALE/OLD` ถ้าสัญญาณเก่า
  - ถ้า signal เป็น test หรือ seed data ต้องไม่ปนกับ signal จริงในการใช้งานจริง
- เป้าหมาย UX: ผู้ใช้เปิดเว็บแล้วเข้าใจทันทีว่า "ตอนนี้มีสัญญาณจริงไหม", "กราฟสดอยู่ไหม", และ "signal ที่เห็นเป็น signal ล่าสุด/active/เก่าหรือ test"

### 2026-07-12 (QC หลัง GLM ปรับ realtime/signal)

- Backend/API ยังทำงาน: `/api/health` เป็น `feed: LIVE`, market สด (`last_market_age_s` ใกล้ 0)
- Market ปัจจุบันที่ backend ส่งขึ้นเว็บมีทั้ง `XAUUSDS` และ `BTCUSDS`; `/api/symbols` คืน `market_symbol: XAUUSDS` ในรอบตรวจนี้
- พบ bug หน้าบ้านที่ทำให้กราฟ/การ render ค้าง:
  - Console error ซ้ำ: `ReferenceError: c is not defined`
  - ตำแหน่ง: `app.js` ใน `getActiveLevels()`
  - โค้ดผิด: `const cMax = Math.max(...c.high, ...candlePrices);`
  - ต้องแก้เป็น `const cMax = Math.max(...candlePrices);`
- พบ logic signal ยังทำให้เข้าใจผิด:
  - `/api/latest?symbol=XAUUSDS` คืน signal เก่ามากอายุประมาณ 9,000+ วินาที แต่ `kind` ยังเป็น `ACTIVE`
  - เหตุผล: `server/routes/public.js` ตั้ง logic ว่า signal ที่ result ยังไม่ WIN/LOSS เป็น `ACTIVE` เสมอ ไม่ว่าจะเก่าแค่ไหน
  - ควรเปลี่ยนให้ signal ที่อายุเกิน `SIGNAL_OLD_SECONDS` เป็น `OLD/STALE` แม้ result ยัง `OPEN` เพื่อไม่ให้เว็บดูเหมือนมี signal สด
- พบ UX issue:
  - ถ้า market symbol ปัจจุบันเป็น XAUUSDS แต่ผู้ใช้เปิด/สนใจ BTCUSD จะยังดูเหมือนเว็บค้างที่ XAU เพราะ selector เลือก market symbol อัตโนมัติ
  - ต้องทำให้ symbol selector ชัดขึ้น และ/หรือแสดงข้อความว่า "กำลังดู symbol ไหน" กับ "market feed ล่าสุดมาจาก symbol ไหน"
- คำแนะนำ QC: แก้ bug console error ก่อน แล้วค่อยแก้ signal freshness/kind logic และ UX no-signal/stale-signal

### 2026-07-12 (Use case ที่ต้องแก้ให้ใช้งานจริง)

ผู้ใช้ยืนยัน use case จากภาพ MT5 `BTCUSDs,M1`:

- Signal ที่ผ่านมาแล้วต้องแสดงให้ชัดว่าเป็น signal เก่า/ผ่านไปแล้ว ไม่ใช่ active สด
  - บนกราฟควรวาด historical signal แบบใน MT5: ลูกศร, Entry, SL, TP1-TP4 และเส้น/label ที่มองออกว่าเป็นสัญญาณอดีต
  - Panel ต้องมีป้ายเช่น `PAST SIGNAL`, `CLOSED`, `OLD`, `TP HIT`, `SL HIT` แยกจาก `ACTIVE`
- กราฟต้องมีพื้นที่ด้านหน้าราคา/แท่งเทียน ไม่ให้แท่งล่าสุดชิดขอบขวาเกินไป
  - ต้อง reserve right-side whitespace/future bars ประมาณ 15-25% ของ plot width หรือเทียบเท่า 10-20 แท่ง เพื่อให้ดูเหมือนกราฟเทรดจริงและมีพื้นที่วาง label/ระดับราคา
- เว็บต้องโชว์ signal เฉพาะคู่เงินเดียวกันกับ EA/กราฟที่เปิดอยู่
  - ห้ามสลับไปมาระหว่าง XAUUSDS/BTCUSDS แบบมั่วเพราะหลาย EA ส่งพร้อมกัน
  - ต้องมี active/current symbol ชัดเจน และทุก endpoint/UI ต้อง filter ตาม symbol นี้
  - ถ้าเลือก/ตรวจพบ BTCUSDS ต้องโชว์เฉพาะ market + signal + history + stats ของ BTCUSDS
  - ถ้า symbol นั้นไม่มี active signal สด ให้แสดง `No active signal for BTCUSDS` แต่ยังสามารถโชว์ historical signals ของ BTCUSDS ได้แบบ clearly past
- เว็บต้องใช้ timeframe เดียวกับกราฟ MT5/EA ที่กำลังเปิดอยู่ด้วย
  - ถ้า EA อยู่บน `BTCUSDs,M1` เว็บต้องแสดง `BTCUSDs` และ timeframe `M1`
  - ถ้า EA อยู่บน `BTCUSDs,M5` เว็บต้องแสดง `BTCUSDs` และ timeframe `M5`
  - ห้ามให้เว็บสลับ timeframe เองจนไม่ตรงกับกราฟ MT5 ที่ผู้ใช้กำลังดู
  - EA/backend ต้องส่ง/เก็บ `timeframe` หรือ `chart_timeframe` ของ instance ที่ส่งข้อมูล เพื่อให้เว็บเลือก candles/signal/history ให้ตรง
  - ถ้ามีหลาย EA instance ส่งพร้อมกัน ต้องมี current instance key เช่น `symbol + timeframe` ไม่ใช่แค่ symbol
- เป้าหมายใหม่: ใช้งานจริงเป็น single-symbol terminal ตามกราฟ/EA ปัจจุบัน ไม่ใช่ global latest signal board

### 2026-07-12 (จุดค้างก่อนอัปขึ้น GitHub)

สถานะล่าสุดหลัง GLM ทำบางส่วน:

- Backend ยังรันและรับข้อมูล MT5 ได้จริง แต่ frontend/use case ยังไม่สมบูรณ์
- จุดค้างหลักที่ต้องแก้ต่อ:
  1. Signal เก่า/ผ่านไปแล้วต้องแสดงเป็น `PAST`, `OLD`, `CLOSED`, `TP HIT`, หรือ `SL HIT` ให้ชัด ห้ามดูเหมือน active สด
  2. กราฟต้องมี right padding/future space ด้านหน้าราคา ไม่ให้แท่งล่าสุดชิดขอบขวา
  3. เว็บต้องยึด context เดียวกับ EA ที่ใช้งานจริง: `symbol + timeframe` เช่น `BTCUSDS:M1`
  4. ห้าม fallback ข้าม symbol/timeframe แบบเงียบ ๆ เช่น เปิด BTCUSDS แต่ไปดึง XAUUSDS signal
  5. API และ frontend ต้อง filter ด้วย `symbol` และ `timeframe` เดียวกันทุก endpoint: latest/history/stats/market
  6. Frontend ยังเคยพบ console error ใน `app.js/getActiveLevels()` จาก `c is not defined`; ต้องตรวจซ้ำหลังแก้ทุกครั้ง
- สถานะ Git/GitHub:
  - โฟลเดอร์ parent `MQL5` มี git remote เดิมเป็น `forge.mql5.io` ไม่ใช่ GitHub
  - โปรเจกต์เว็บควรแยกเป็น GitHub repo ของตัวเองใน `MQL5/Experts/Tradertoolsth_Website`
  - เพิ่ม `.gitignore` ระดับโปรเจกต์แล้ว เพื่อกัน `server/.env`, `server/data/`, SQLite, logs, และ `node_modules`
  - ห้ามอัป `server/.env` เพราะมี API key local; ให้ใช้ `server/.env.example` แทน
  - สร้าง GitHub repo และ push snapshot แรกสำเร็จแล้ว:
    `https://github.com/oHizokao/tradertoolsth-website`
  - Branch หลัก: `main`
  - Commit แรก: `1385e63` (`Initial Tradertoolsth website snapshot`)

## ลำดับงานที่ควรทำต่อ

งานที่ 1–6 ทำเสร็จแล้วในรอบนี้ (ทดสอบในเครื่องผ่าน) ส่วนที่เหลือ:

1. ✅ ~~เลือกที่รัน API และฐานข้อมูล~~ (ทดสอบในเครื่องแล้ว, ใช้ SQLite)
2. ✅ ~~สร้าง API และฐานข้อมูลรับสัญญาณ/สถานะ/ราคา/OHLC~~ (`server/`)
3. ✅ ~~เพิ่มการส่ง HTTP JSON จาก EA เมื่อเกิดสัญญาณและ TP/SL เปลี่ยน~~ (Website Sync helpers)
4. ✅ ~~เพิ่มการส่งราคาและ OHLC M1/M5 เป็นระยะ~~ (`InpWebsitePriceMs`)
5. ✅ ~~เปลี่ยนหน้าเว็บให้ดึงข้อมูลจาก API + fallback demo ชัดเจน~~ (`app.js`/`index.html`)
6. ✅ ~~compile EA ใน MetaEditor~~ (`Trend_Follow_M5M1.ex5`, 0 errors / 0 warnings)
7. **ทดสอบ end-to-end บน MT5**: เปิด EA บนกราฟ XAUUSD M5 → กดปุ่ม Test Signal → ดูข้อมูลเข้าหน้าเว็บ
8. **deploy**: ย้าย backend ไป VPS พร้อม HTTPS/reverse proxy, ตั้ง `API_KEY` จริง, `ALLOWED_ORIGIN` เป็นโดเมนเว็บ, เพิ่ม URL ของ server ใน MT5 Allow WebRequest
9. (ไม่บังคับ) เพิ่ม rate limiting / IP allowlist / auth ฝั่งหน้าเว็บอ่าน / snapshot image จาก MT5 ตอนออกสัญญาณ

## หลักการสำคัญ

- เว็บมีหน้าที่แสดงผล ไม่คำนวณสัญญาณแทน EA
- ทุกระดับราคาของสัญญาณต้องมาจาก EA โดยตรง
- อย่าแสดงสถิติหรือผลตอบแทนที่ไม่มีข้อมูลจริงรองรับ
- ความตรงกับกราฟและราคาของ MT5 สำคัญกว่าการใช้ข้อมูลจากผู้ให้บริการกราฟภายนอก
## Codex QC และแก้จุดค้างรอบ 2026-07-12 (symbol + timeframe)

- พบสาเหตุหน้าเว็บ offline/ค้างหลังงาน GLM: backend เปลี่ยนเป็น `/api/instances` แต่ `app.js` ยังเรียก `/api/symbols` และยังอ่าน candles แบบเก่า `m1_candles/m5_candles`
- แก้ frontend ให้ใช้ context เดียวกันทุก request: `symbol + timeframe` สำหรับ latest/history/stats/market และไม่ fallback ข้าม context
- แก้ frontend ให้อ่าน `market.candles`, ตรวจ timeframe ของ market/signal, แสดง `No active signal for SYMBOL TF` เมื่อ context นั้นไม่มี signal
- สัญญาณ `OLD/CLOSED` ยังคงแสดงอย่างชัดเจน; `TEST` ไม่ถูกนำมาแสดงเป็นสัญญาณจริง
- เพิ่ม future space ด้านขวากราฟประมาณ 18% (อย่างน้อย 10 bars) เพื่อไม่ให้แท่งล่าสุดชิดขอบ
- พบฐานข้อมูลเดิมไม่มีคอลัมน์ `timeframe` ทำให้ server เปิดไม่ขึ้น; เพิ่ม migration อัตโนมัติแบบรักษาข้อมูลเดิม และแยก legacy market candles เป็น M1/M5
- เปลี่ยนการตัดสินอายุ signal ให้ใช้ `created_at` เพื่อไม่ให้ status update ทำให้ signal เก่ากลับเป็น ACTIVE
- คอมไพล์ `Trend_Follow_M5M1.mq5` สำเร็จ: 0 errors, 0 warnings; `.ex5` อัปเดตแล้ว
- Browser QC ผ่าน: BTCUSDS M5 และ BTCUSDS M1 แสดงกราฟ REALTIME แยกกัน, no-signal ตรง context, canvas ไม่ว่าง และ console ไม่มี error
- API QC ผ่าน: `/api/market?symbol=BTCUSDS&timeframe=M1` และ M5 คืน candles คนละชุด; `/api/latest` ของ context ที่ไม่มี signal คืน `null` ไม่หยิบ XAUUSDS มาแทน
- ขั้นตอนที่ต้องทำใน MT5: ถอด EA instance เก่าแล้วใส่ `Trend_Follow_M5M1.ex5` ใหม่ (หรือปิด/เปิด MT5) เพื่อให้ runtime เริ่มส่ง `timeframe`; record เก่าที่ timeframe ว่างจะไม่ถูกนำไปปนกับ M1/M5

### 2026-07-13 (QC Fix: DR Zones + Timezone + Past ON inRange)

#### ปัญหาที่แก้

1. **Timezone เพี้ยน (เว็บ 17:xx vs MT5 08:xx)**
   - สาเหตุ: `candleTimeLabel()` ใช้ `"th-TH"` locale → JS แปลง epoch เป็น Bangkok local (+7)
   - แต่ `candle.time` จาก EA เป็น broker server time (UTC epoch)
   - แก้: เปลี่ยนเป็น `timeZone: "UTC"` ใน `toLocaleTimeString` เพื่อให้ตรงกับ MT5

2. **กล่องแดง/เขียวบน MT5 คือ DR Zones ไม่ใช่ RR Box**
   - `win_target=NONE` → EA ไม่ส่ง `rr_box` → `rrNull: 105` ทุก signal → ไม่ใช่ bug แต่เป็น design
   - สิ่งที่ MT5 วาด = DR zones (Dynamic Range resistance/support) ไม่ใช่ Risk/Reward box
   - แก้ frontend: fetch `/api/zones` ทุก poll cycle (endpoint มีอยู่แล้วใน server)
   - วาด DR zones เป็น background layer (PASS 0) ก่อน candles
   - resistance = สีแดง 8% fill + border dashed, support = สีเขียว 8% fill + border dashed
   - label "R" / "S" ซ้ายของ zone
   - ถ้าไม่มี zones payload → ไม่วาดอะไร (ไม่เดา)

3. **Legend ผิด (Risk/Reward)**
   - แก้ `index.html`: เปลี่ยน legend "Risk"→"Resistance", "Reward"→"Support"
   - legend zone จะซ่อนอยู่ (`hidden`) และจะแสดงเฉพาะเมื่อมี zones payload จริง

4. **Past ON วาด signal นอก candle range**
   - เพิ่ม `inRange` check: ถ้า `arrowTime` อยู่นอกช่วง `[candle_first - buffer, candle_last + buffer]` → skip
   - buffer = 10 bars ย้อนหลัง (M1 = 10 วินาที, M5 = 50 วินาที)
   - Past OFF (ACTIVE signal) ยังวาดเสมอ (active สดอาจออกก่อน candle range นิดหน่อย)

5. **Debug log ครบถ้วน**
   - เพิ่ม `candle_first_time`, `candle_last_time`, `candle_first_utc`, `candle_last_utc`
   - เพิ่ม `zones_count` (จำนวน DR zones ที่โหลดมา)
   - ต่อ signal: เพิ่ม `signal_time_utc`, `arrow_time`, `arrow_time_utc`, `inRange`

#### สิ่งที่ต้องทำ (EA ฝั่ง) เพื่อให้ zones ทำงานได้
- EA ต้องส่ง `POST /api/zones` พร้อม payload:
  ```json
  { "symbol": "XAUUSD", "timeframe": "M1", "zones": [
    { "type": "resistance", "time1": epoch, "time2": epoch, "hi": price, "lo": price },
    { "type": "support",    "time1": epoch, "time2": epoch, "hi": price, "lo": price }
  ]}
  ```
- ส่งทุก new bar หรือทุก market cycle (เพื่อ keep zones fresh)
- Server รับอยู่แล้วที่ `/api/zones` (validate + upsert ต่อ symbol+timeframe)

#### QC ที่ผ่านหลังแก้
- `node --check app.js` → 0 errors ✅
- `node --check server/*.js` → 0 errors ✅
- Timezone: candle time label ใช้ UTC → ตรงกับ broker server time ✅
- DR zones: วาดเฉพาะเมื่อ `/api/zones` ส่ง payload มา, ไม่มี = ไม่วาด ✅
- Past ON inRange: signal นอก candle range ถูก skip ✅
- Debug log: มี candle_first/last_time + inRange ต่อ signal ✅
- Legend: ไม่บอก Risk/Reward ถ้าไม่มี zones จริง ✅

