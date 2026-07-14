"use strict";

function tpStates(signal) {
  return [1, 2, 3, 4].map((n) => {
    const value = signal[`tp${n}_status`];
    return value === 1 || value === -1 ? value : 0;
  });
}

function highestHit(states) {
  return states.reduce((highest, state, index) => state === 1 ? index + 1 : highest, 0);
}

function lifecycleFromStates(signal, states = tpStates(signal)) {
  const next = [...states];
  const status = String(signal.status || "").toUpperCase();
  const explicitStop = signal.result === "LOSS" || status.includes("SL HIT") || status.includes("THEN SL");

  // Target statistics are cumulative: reaching TP3 necessarily reached TP1 and TP2.
  const reportedBestTp = highestHit(next);
  for (let i = 0; i < reportedBestTp; i++) next[i] = 1;

  if (explicitStop) {
    for (let i = 0; i < next.length; i++) {
      if (next[i] === 0) next[i] = -1;
    }
  }

  const bestTp = highestHit(next);
  const stopped = next.some((state) => state === -1);
  let result = "OPEN";
  let normalizedStatus = bestTp > 0 ? `TP${bestTp} HIT` : "ACTIVE";
  let terminal = false;
  let reason = null;

  if (next[3] === 1) {
    result = "WIN";
    normalizedStatus = "TP4 HIT";
    terminal = true;
    reason = "TP4";
  } else if (stopped) {
    terminal = true;
    if (bestTp > 0) {
      result = "WIN";
      normalizedStatus = `TP${bestTp} THEN SL`;
      reason = `SL_AFTER_TP${bestTp}`;
    } else {
      result = "LOSS";
      normalizedStatus = "SL HIT";
      reason = "SL_BEFORE_TP";
    }
  }

  return {
    status: normalizedStatus,
    result,
    tp1_status: next[0],
    tp2_status: next[1],
    tp3_status: next[2],
    tp4_status: next[3],
    bestTp,
    terminal,
    reason,
  };
}

function evaluateCandles(signal, candles) {
  let state = lifecycleFromStates(signal);
  if (state.terminal || !Array.isArray(candles)) return state;

  const ordered = candles
    .filter((c) => c && Number.isFinite(c.high) && Number.isFinite(c.low))
    .filter((c) => !c.time || c.time >= signal.signal_time)
    .sort((a, b) => (a.time || 0) - (b.time || 0));
  const targets = [signal.tp1, signal.tp2, signal.tp3, signal.tp4];

  for (const candle of ordered) {
    const states = [state.tp1_status, state.tp2_status, state.tp3_status, state.tp4_status];
    const isBuy = signal.direction === "BUY";
    const stopHit = signal.sl > 0 && (isBuy ? candle.low <= signal.sl : candle.high >= signal.sl);

    // OHLC cannot prove intrabar order, so a candle touching SL and TP is resolved at SL first.
    if (stopHit) {
      for (let i = 0; i < states.length; i++) {
        if (states[i] === 0) states[i] = -1;
      }
      return lifecycleFromStates(signal, states);
    }

    for (let i = 0; i < targets.length; i++) {
      if (states[i] !== 0 || !(targets[i] > 0)) continue;
      const targetHit = isBuy ? candle.high >= targets[i] : candle.low <= targets[i];
      if (targetHit) states[i] = 1;
    }

    state = lifecycleFromStates(signal, states);
    if (state.terminal) return state;
  }

  return state;
}

function statusPatch(signal, incoming = {}) {
  const merged = { ...signal };
  for (const key of ["status", "result", "tp1_status", "tp2_status", "tp3_status", "tp4_status"]) {
    if (incoming[key] !== null && incoming[key] !== undefined) merged[key] = incoming[key];
  }
  return lifecycleFromStates(merged);
}

function hasLifecycleChange(signal, next) {
  return ["status", "result", "tp1_status", "tp2_status", "tp3_status", "tp4_status"]
    .some((key) => signal[key] !== next[key]);
}

module.exports = { evaluateCandles, hasLifecycleChange, lifecycleFromStates, statusPatch };
