"use strict";
// One-time patch: แก้ signals ที่ created_at ผิด (bulk sync ทำให้ created_at = ตอนนี้)
// เพื่อให้ signalKind() คำนวณ age ถูกต้อง

const { db } = require("../db");

const nowSec = Math.floor(Date.now() / 1000);

// Patch: SET created_at = signal_time สำหรับ signals ที่
//   - signal_time เก่ากว่า 30 นาที
//   - created_at ใหม่กว่า signal_time เกิน 30 นาที (แสดงว่าถูก bulk sync หลังจากนั้น)
const patchResult = db.prepare(`
  UPDATE signals
  SET created_at = signal_time
  WHERE signal_time IS NOT NULL
    AND signal_time > 0
    AND signal_time < (created_at - 1800)
    AND result = 'OPEN'
`).run();

console.log(`[patch] Fixed ${patchResult.changes} stale OPEN signals (created_at → signal_time)`);

// ตรวจสอบ OPEN signals หลัง patch
const openSignals = db.prepare(`
  SELECT id, direction, entry, signal_time, created_at, status, result
  FROM signals
  WHERE result = 'OPEN'
  ORDER BY signal_time DESC
  LIMIT 10
`).all();

const nowTime = Math.floor(Date.now() / 1000);
console.log(`\n[open signals after patch]:`);
for (const s of openSignals) {
  const age = nowTime - s.signal_time;
  const ageHr = (age / 3600).toFixed(1);
  const kind = age > 3600 ? "OLD" : "ACTIVE";
  console.log(`  ${s.direction} ${s.entry} | signal_time=${s.signal_time} | age=${ageHr}h | → ${kind}`);
}
