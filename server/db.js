"use strict";
// ============================================================
// db.js - SQLite (better-sqlite3) connection + schema + queries
// ตาราง: signals, market_snapshots, events
// Instance key = symbol + timeframe (M1/M5 แยกกัน)
// ============================================================

const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const logger = require("./logger");

const DEFAULT_DB_PATH = path.join(__dirname, "data", "tradertoolsth.sqlite");

function resolveDbPath() {
  const configured = process.env.DB_PATH && process.env.DB_PATH.trim();
  if (!configured) return DEFAULT_DB_PATH;
  return path.isAbsolute(configured) ? configured : path.join(__dirname, configured);
}

function openDatabase() {
  const dbPath = resolveDbPath();
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 3000");

  db.exec(`
    CREATE TABLE IF NOT EXISTS signals (
      id              TEXT PRIMARY KEY,
      symbol          TEXT NOT NULL,
      timeframe       TEXT NOT NULL DEFAULT '',   -- M1 | M5 | ...
      direction       TEXT NOT NULL,
      signal_time     INTEGER NOT NULL,
      entry           REAL NOT NULL,
      sl              REAL NOT NULL,
      tp1             REAL NOT NULL,
      tp2             REAL NOT NULL,
      tp3             REAL NOT NULL,
      tp4             REAL NOT NULL,
      macd            REAL,
      is_reentry      INTEGER DEFAULT 0,
      status          TEXT DEFAULT 'ACTIVE',
      result          TEXT DEFAULT 'OPEN',
      tp1_status      INTEGER DEFAULT 0,
      tp2_status      INTEGER DEFAULT 0,
      tp3_status      INTEGER DEFAULT 0,
      tp4_status      INTEGER DEFAULT 0,
      source          TEXT,
      created_at      INTEGER NOT NULL,
      updated_at      INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS market_snapshots (
      symbol        TEXT NOT NULL,
      timeframe     TEXT NOT NULL DEFAULT '',
      bid           REAL,
      ask           REAL,
      spread        INTEGER,
      broker_time   INTEGER,
      candles       TEXT,
      updated_at    INTEGER NOT NULL,
      PRIMARY KEY (symbol, timeframe)
    );

    CREATE TABLE IF NOT EXISTS events (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      type        TEXT NOT NULL,
      payload     TEXT NOT NULL,
      created_at  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chart_meta (
      symbol            TEXT NOT NULL,
      timeframe         TEXT NOT NULL DEFAULT '',
      extend_bars       INTEGER,
      text_offset_bars  INTEGER,
      win_target        TEXT,
      show_rr_boxes     INTEGER,
      show_entry        INTEGER,
      show_sl           INTEGER,
      show_tp1          INTEGER,
      show_tp2          INTEGER,
      show_tp3          INTEGER,
      show_tp4          INTEGER,
      max_hist_signals  INTEGER,
      broker_time       INTEGER,
      updated_at        INTEGER NOT NULL,
      PRIMARY KEY (symbol, timeframe)
    );

    CREATE TABLE IF NOT EXISTS zones (
      symbol        TEXT NOT NULL,
      timeframe     TEXT NOT NULL DEFAULT '',
      zones         TEXT,
      broker_time   INTEGER,
      updated_at    INTEGER NOT NULL,
      PRIMARY KEY (symbol, timeframe)
    );

  `);

  // Upgrade databases created before symbol+timeframe became the instance key.
  const signalColumns = db.prepare("PRAGMA table_info(signals)").all().map(c => c.name);
  if (!signalColumns.includes("timeframe")) {
    db.exec("ALTER TABLE signals ADD COLUMN timeframe TEXT NOT NULL DEFAULT ''");
  }
  // signals.objects: JSON blob ของ visible chart objects (arrow/rr_box/level_*) จาก EA
  if (!signalColumns.includes("objects")) {
    db.exec("ALTER TABLE signals ADD COLUMN objects TEXT");
  }

  const marketColumns = db.prepare("PRAGMA table_info(market_snapshots)").all().map(c => c.name);
  if (!marketColumns.includes("timeframe")) {
    const hasM1 = marketColumns.includes("m1_candles");
    const hasM5 = marketColumns.includes("m5_candles");
    db.exec(`
      ALTER TABLE market_snapshots RENAME TO market_snapshots_legacy;
      CREATE TABLE market_snapshots (
        symbol TEXT NOT NULL, timeframe TEXT NOT NULL DEFAULT '', bid REAL, ask REAL,
        spread INTEGER, broker_time INTEGER, candles TEXT, updated_at INTEGER NOT NULL,
        PRIMARY KEY (symbol, timeframe)
      );
    `);
    const common = "symbol,bid,ask,spread,broker_time,updated_at";
    if (hasM1) db.exec(`INSERT INTO market_snapshots (${common},timeframe,candles) SELECT ${common},'M1',m1_candles FROM market_snapshots_legacy`);
    if (hasM5) db.exec(`INSERT INTO market_snapshots (${common},timeframe,candles) SELECT ${common},'M5',m5_candles FROM market_snapshots_legacy`);
    if (!hasM1 && !hasM5) db.exec(`INSERT INTO market_snapshots (${common},timeframe,candles) SELECT ${common},'',NULL FROM market_snapshots_legacy`);
    db.exec("DROP TABLE market_snapshots_legacy");
  }

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_signals_sym_tf_time ON signals(symbol, timeframe, signal_time DESC);
    CREATE INDEX IF NOT EXISTS idx_signals_updated ON signals(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_signals_sym_tf_upd ON signals(symbol, timeframe, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_events_time ON events(created_at DESC);
  `);

  logger.info("db", `opened ${dbPath}`);
  return db;
}

// ----- prepared statements (set after open) -----
const db = openDatabase();

const stmts = {
  upsertSignal: db.prepare(`
    INSERT INTO signals (
      id, symbol, timeframe, direction, signal_time, entry, sl, tp1, tp2, tp3, tp4,
      macd, is_reentry, status, result, tp1_status, tp2_status, tp3_status, tp4_status,
      source, created_at, updated_at, objects
    ) VALUES (
      @id, @symbol, @timeframe, @direction, @signal_time, @entry, @sl, @tp1, @tp2, @tp3, @tp4,
      @macd, @is_reentry, @status, @result, @tp1_status, @tp2_status, @tp3_status, @tp4_status,
      @source, @created_at, @updated_at, @objects
    )
    ON CONFLICT(id) DO UPDATE SET
      symbol=excluded.symbol,
      timeframe=excluded.timeframe,
      direction=excluded.direction,
      signal_time=excluded.signal_time,
      entry=excluded.entry, sl=excluded.sl,
      tp1=excluded.tp1, tp2=excluded.tp2, tp3=excluded.tp3, tp4=excluded.tp4,
      macd=COALESCE(excluded.macd, signals.macd),
      is_reentry=excluded.is_reentry,
      updated_at=excluded.updated_at,
      objects=COALESCE(NULLIF(excluded.objects,''), signals.objects)
  `),

  updateStatus: db.prepare(`
    UPDATE signals SET
      status      = COALESCE(@status, status),
      result      = COALESCE(@result, result),
      tp1_status  = COALESCE(@tp1_status, tp1_status),
      tp2_status  = COALESCE(@tp2_status, tp2_status),
      tp3_status  = COALESCE(@tp3_status, tp3_status),
      tp4_status  = COALESCE(@tp4_status, tp4_status),
      updated_at  = @updated_at
    WHERE id = @id
  `),

  upsertMarket: db.prepare(`
    INSERT INTO market_snapshots
      (symbol, timeframe, bid, ask, spread, broker_time, candles, updated_at)
    VALUES
      (@symbol, @timeframe, @bid, @ask, @spread, @broker_time, @candles, @updated_at)
    ON CONFLICT(symbol, timeframe) DO UPDATE SET
      bid=excluded.bid, ask=excluded.ask, spread=excluded.spread,
      broker_time=COALESCE(excluded.broker_time, market_snapshots.broker_time),
      candles=COALESCE(NULLIF(excluded.candles,''), market_snapshots.candles),
      updated_at=excluded.updated_at
  `),

  getSignalById: db.prepare(`SELECT * FROM signals WHERE id = ?`),

  // latest — global (fallback)
  getLatestSignal: db.prepare(`SELECT * FROM signals ORDER BY signal_time DESC LIMIT 1`),
  // latest by symbol
  getLatestSignalBySymbol: db.prepare(`SELECT * FROM signals WHERE symbol = ? ORDER BY signal_time DESC LIMIT 1`),
  // latest by symbol + timeframe
  getLatestSignalBySymbolTf: db.prepare(`SELECT * FROM signals WHERE symbol = ? AND timeframe = ? ORDER BY signal_time DESC LIMIT 1`),

  // latest ACTIVE only — filter result=OPEN + recent (updated_at >= cutoff) + TEST exclude
  // เรียงด้วย updated_at DESC เพราะ signal_time อาจเป็น broker time ที่เพี้ยน
  // activeOldCutoff = now - SIGNAL_OLD_SECONDS (bind จาก public.js)
  getLatestActiveSignal: db.prepare(`
    SELECT * FROM signals
    WHERE result = 'OPEN'
      AND updated_at >= ?
      AND (source IS NULL OR LOWER(source) NOT LIKE '%test%' AND LOWER(source) NOT LIKE '%seed%')
    ORDER BY updated_at DESC LIMIT 1
  `),
  getLatestActiveSignalBySymbol: db.prepare(`
    SELECT * FROM signals
    WHERE symbol = ? AND result = 'OPEN'
      AND updated_at >= ?
      AND (source IS NULL OR LOWER(source) NOT LIKE '%test%' AND LOWER(source) NOT LIKE '%seed%')
    ORDER BY updated_at DESC LIMIT 1
  `),
  getLatestActiveSignalBySymbolTf: db.prepare(`
    SELECT * FROM signals
    WHERE symbol = ? AND timeframe = ? AND result = 'OPEN'
      AND updated_at >= ?
      AND (source IS NULL OR LOWER(source) NOT LIKE '%test%' AND LOWER(source) NOT LIKE '%seed%')
    ORDER BY updated_at DESC LIMIT 1
  `),

  // history
  getHistory: db.prepare(`SELECT * FROM signals ORDER BY signal_time DESC LIMIT ?`),
  getHistoryBySymbol: db.prepare(`SELECT * FROM signals WHERE symbol = ? ORDER BY signal_time DESC LIMIT ?`),
  getHistoryBySymbolTf: db.prepare(`SELECT * FROM signals WHERE symbol = ? AND timeframe = ? ORDER BY signal_time DESC LIMIT ?`),

  // resolved stats
  getRecentResolved: db.prepare(`SELECT * FROM signals WHERE result IN ('WIN','LOSS') ORDER BY signal_time DESC LIMIT ?`),
  getRecentResolvedBySymbol: db.prepare(`SELECT * FROM signals WHERE result IN ('WIN','LOSS') AND symbol = ? ORDER BY signal_time DESC LIMIT ?`),
  getRecentResolvedBySymbolTf: db.prepare(`SELECT * FROM signals WHERE result IN ('WIN','LOSS') AND symbol = ? AND timeframe = ? ORDER BY signal_time DESC LIMIT ?`),

  // market
  getMarket: db.prepare(`SELECT * FROM market_snapshots ORDER BY updated_at DESC LIMIT 1`),
  getMarketBySymbol: db.prepare(`SELECT * FROM market_snapshots WHERE symbol = ? ORDER BY updated_at DESC LIMIT 1`),
  getMarketBySymbolTf: db.prepare(`SELECT * FROM market_snapshots WHERE symbol = ? AND timeframe = ? ORDER BY updated_at DESC LIMIT 1`),

  // active symbols/timeframes (recent)
  getActiveInstances: db.prepare(`
    SELECT DISTINCT symbol, timeframe FROM signals
    WHERE created_at >= ? ORDER BY symbol, timeframe
  `),
  getMarketInstances: db.prepare(`
    SELECT DISTINCT symbol, timeframe FROM market_snapshots
    WHERE updated_at >= ? ORDER BY symbol, timeframe
  `),

  countSignals: db.prepare(`SELECT COUNT(*) AS c FROM signals`),
  countResolved: db.prepare(`SELECT COUNT(*) AS c FROM signals WHERE result IN ('WIN','LOSS')`),

  // chart_meta (visual config ของแต่ละ chart instance — symbol+timeframe)
  upsertChartMeta: db.prepare(`
    INSERT INTO chart_meta
      (symbol, timeframe, extend_bars, text_offset_bars, win_target,
       show_rr_boxes, show_entry, show_sl, show_tp1, show_tp2, show_tp3, show_tp4,
       max_hist_signals, broker_time, updated_at)
    VALUES
      (@symbol, @timeframe, @extend_bars, @text_offset_bars, @win_target,
       @show_rr_boxes, @show_entry, @show_sl, @show_tp1, @show_tp2, @show_tp3, @show_tp4,
       @max_hist_signals, @broker_time, @updated_at)
    ON CONFLICT(symbol, timeframe) DO UPDATE SET
      extend_bars=excluded.extend_bars,
      text_offset_bars=excluded.text_offset_bars,
      win_target=excluded.win_target,
      show_rr_boxes=excluded.show_rr_boxes,
      show_entry=excluded.show_entry,
      show_sl=excluded.show_sl,
      show_tp1=excluded.show_tp1,
      show_tp2=excluded.show_tp2,
      show_tp3=excluded.show_tp3,
      show_tp4=excluded.show_tp4,
      max_hist_signals=excluded.max_hist_signals,
      broker_time=COALESCE(excluded.broker_time, chart_meta.broker_time),
      updated_at=excluded.updated_at
  `),
  getChartMetaBySymbolTf: db.prepare(`SELECT * FROM chart_meta WHERE symbol = ? AND timeframe = ?`),

  // zones (DR zones resistance/support ของ chart instance)
  upsertZones: db.prepare(`
    INSERT INTO zones (symbol, timeframe, zones, broker_time, updated_at)
    VALUES (@symbol, @timeframe, @zones, @broker_time, @updated_at)
    ON CONFLICT(symbol, timeframe) DO UPDATE SET
      zones=excluded.zones,
      broker_time=COALESCE(excluded.broker_time, zones.broker_time),
      updated_at=excluded.updated_at
  `),
  getZonesBySymbolTf: db.prepare(`SELECT * FROM zones WHERE symbol = ? AND timeframe = ?`),

  insertEvent: db.prepare(`INSERT INTO events (type, payload, created_at) VALUES (?, ?, ?)`),
};

const tx = db.transaction.bind(db);

module.exports = { db, stmts, tx };
