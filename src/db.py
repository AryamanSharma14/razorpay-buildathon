import sqlite3
import json
from src import config

def _conn():
    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with _conn() as conn:
        conn.executescript("""
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_id TEXT UNIQUE NOT NULL,
  order_id TEXT,
  amount_paise INTEGER NOT NULL,
  currency TEXT DEFAULT 'INR',
  email TEXT, contact TEXT,
  error_source TEXT, error_step TEXT, error_reason TEXT, error_code TEXT,
  classification TEXT,
  classify_reason TEXT,
  confidence REAL,
  top_features TEXT,
  retry_at TEXT,
  attempts INTEGER DEFAULT 0,
  payment_link_id TEXT,
  payment_link_url TEXT,
  nudge_channel TEXT,
  nudge_message TEXT,
  nudge_reasoning TEXT,
  recovered INTEGER DEFAULT 0,
  recovered_at TEXT,
  merchant_cancelled INTEGER DEFAULT 0,
  raw_payload TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_id TEXT, action TEXT, detail TEXT,
  ts TEXT DEFAULT (datetime('now'))
);
        """)

def insert_event(data: dict):
    cols = ", ".join(data.keys())
    placeholders = ", ".join("?" * len(data))
    with _conn() as conn:
        conn.execute(
            f"INSERT OR IGNORE INTO events ({cols}) VALUES ({placeholders})",
            list(data.values())
        )

def update_event(payment_id: str, **fields):
    if not fields:
        return
    set_clause = ", ".join(f"{k}=?" for k in fields)
    with _conn() as conn:
        conn.execute(
            f"UPDATE events SET {set_clause} WHERE payment_id=?",
            [*fields.values(), payment_id]
        )

def get_event(payment_id: str) -> dict | None:
    with _conn() as conn:
        row = conn.execute("SELECT * FROM events WHERE payment_id=?", (payment_id,)).fetchone()
        return dict(row) if row else None

def all_events() -> list[dict]:
    with _conn() as conn:
        rows = conn.execute("SELECT * FROM events ORDER BY created_at DESC").fetchall()
        return [dict(r) for r in rows]

def log_audit(payment_id: str, action: str, detail: str = ""):
    with _conn() as conn:
        conn.execute(
            "INSERT INTO audit_log (payment_id, action, detail) VALUES (?, ?, ?)",
            (payment_id, action, detail)
        )
