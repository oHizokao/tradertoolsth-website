"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { evaluateCandles, statusPatch } = require("../signal-lifecycle");

function signal(overrides = {}) {
  return {
    id: "sig-1",
    direction: "BUY",
    signal_time: 100,
    entry: 100,
    sl: 95,
    tp1: 101,
    tp2: 102,
    tp3: 103,
    tp4: 104,
    status: "ACTIVE",
    result: "OPEN",
    tp1_status: 0,
    tp2_status: 0,
    tp3_status: 0,
    tp4_status: 0,
    ...overrides,
  };
}

test("BUY closes at the best TP when SL is hit later", () => {
  const result = evaluateCandles(signal(), [
    { time: 100, high: 103.2, low: 99 },
    { time: 160, high: 101, low: 94.8 },
  ]);
  assert.deepEqual(
    [result.tp1_status, result.tp2_status, result.tp3_status, result.tp4_status],
    [1, 1, 1, -1]
  );
  assert.equal(result.status, "TP3 THEN SL");
  assert.equal(result.result, "WIN");
  assert.equal(result.terminal, true);
});

test("SELL closes at the best TP when SL is hit later", () => {
  const result = evaluateCandles(signal({
    direction: "SELL", sl: 105, tp1: 99, tp2: 98, tp3: 97, tp4: 96,
  }), [
    { time: 100, high: 101, low: 96.8 },
    { time: 160, high: 105.2, low: 99 },
  ]);
  assert.equal(result.status, "TP3 THEN SL");
  assert.equal(result.bestTp, 3);
  assert.equal(result.result, "WIN");
});

test("SL before any TP is a loss", () => {
  const result = evaluateCandles(signal(), [{ time: 100, high: 100.5, low: 94.9 }]);
  assert.equal(result.status, "SL HIT");
  assert.equal(result.result, "LOSS");
  assert.equal(result.bestTp, 0);
});

test("TP4 closes immediately as a win", () => {
  const result = evaluateCandles(signal(), [{ time: 100, high: 104.1, low: 99 }]);
  assert.equal(result.status, "TP4 HIT");
  assert.equal(result.result, "WIN");
  assert.equal(result.bestTp, 4);
});

test("SL wins ambiguous same-candle ordering", () => {
  const result = evaluateCandles(signal(), [{ time: 100, high: 104.1, low: 94.9 }]);
  assert.equal(result.status, "SL HIT");
  assert.equal(result.bestTp, 0);
});

test("EA status with achieved TPs and remaining misses closes at best TP", () => {
  const result = statusPatch(signal(), {
    status: "TP3 HIT",
    result: "WIN",
    tp1_status: 1,
    tp2_status: 1,
    tp3_status: 1,
    tp4_status: -1,
  });
  assert.equal(result.status, "TP3 THEN SL");
  assert.equal(result.result, "WIN");
  assert.equal(result.bestTp, 3);
});

test("an intermediate EA win remains open until TP4 or SL", () => {
  const result = statusPatch(signal(), {
    status: "TP2 HIT",
    result: "WIN",
    tp1_status: 1,
    tp2_status: 1,
  });
  assert.equal(result.status, "TP2 HIT");
  assert.equal(result.result, "OPEN");
  assert.equal(result.terminal, false);
});

test("a reported higher TP fills lower cumulative targets", () => {
  const result = statusPatch(signal(), { status: "TP3 HIT", result: "WIN", tp3_status: 1 });
  assert.deepEqual(
    [result.tp1_status, result.tp2_status, result.tp3_status, result.tp4_status],
    [1, 1, 1, 0]
  );
  assert.equal(result.result, "OPEN");
});
