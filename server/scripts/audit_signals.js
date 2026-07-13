"use strict";
const { db } = require("../db");
const now = Math.floor(Date.now() / 1000);
console.log("NOW unix:", now, "=", new Date(now * 1000).toISOString());

const rows = db.prepare("SELECT id, signal_time, created_at, updated_at, result, direction, entry FROM signals ORDER BY rowid DESC LIMIT 10").all();
rows.forEach(r => {
  const ageSig = now - r.signal_time;
  const ageCreated = now - r.created_at;
  const kind = r.result === "WIN" || r.result === "LOSS" ? "CLOSED" :
               ageSig > 3600 ? "OLD" : "ACTIVE";
  console.log(`${r.direction} ${r.entry} | sig_age=${Math.round(ageSig/60)}m | created_age=${Math.round(ageCreated/60)}m | result=${r.result} | kind=${kind}`);
});
