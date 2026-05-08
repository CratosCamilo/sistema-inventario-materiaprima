import { getDb } from './connection'

export function runMigrations(): void {
  const db = getDb()

  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      name                 TEXT    NOT NULL,
      category             TEXT    NOT NULL,
      base_unit            TEXT    NOT NULL,
      visual_unit          TEXT    NOT NULL,
      conversion_factor    REAL    NOT NULL DEFAULT 1,
      stock_minimum        REAL    NOT NULL DEFAULT 0,
      stock_current        REAL    NOT NULL DEFAULT 0,
      initial_stock_loaded INTEGER NOT NULL DEFAULT 0,
      active               INTEGER NOT NULL DEFAULT 1,
      notes                TEXT,
      created_at           TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at           TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      contact    TEXT,
      phone      TEXT,
      email      TEXT,
      notes      TEXT,
      active     INTEGER NOT NULL DEFAULT 1,
      created_at TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS purchase_entries (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      date           TEXT    NOT NULL,
      invoice_number TEXT,
      supplier_id    INTEGER,
      supplier_name  TEXT,
      responsible    TEXT,
      notes          TEXT,
      status         TEXT    NOT NULL DEFAULT 'active',
      created_at     TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at     TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    );

    CREATE TABLE IF NOT EXISTS purchase_entry_items (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_id  INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity  REAL    NOT NULL,
      unit      TEXT    NOT NULL,
      unit_cost REAL,
      notes     TEXT,
      FOREIGN KEY (entry_id)   REFERENCES purchase_entries(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS exits (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      date        TEXT NOT NULL,
      destination TEXT NOT NULL,
      responsible TEXT,
      notes       TEXT,
      status      TEXT NOT NULL DEFAULT 'active',
      created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS exit_items (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      exit_id    INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity   REAL    NOT NULL,
      unit       TEXT    NOT NULL,
      notes      TEXT,
      FOREIGN KEY (exit_id)    REFERENCES exits(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS stock_adjustments (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      date           TEXT    NOT NULL,
      product_id     INTEGER NOT NULL,
      stock_system   REAL    NOT NULL,
      stock_physical REAL    NOT NULL,
      difference     REAL    NOT NULL,
      reason         TEXT,
      notes          TEXT,
      responsible    TEXT,
      status         TEXT    NOT NULL DEFAULT 'active',
      created_at     TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at     TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS inventory_movements (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id     INTEGER NOT NULL,
      type           TEXT    NOT NULL,
      direction      TEXT    NOT NULL,
      quantity       REAL    NOT NULL,
      unit           TEXT    NOT NULL,
      date           TEXT    NOT NULL,
      reference_type TEXT,
      reference_id   INTEGER,
      notes          TEXT,
      responsible    TEXT,
      created_at     TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key        TEXT PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_movements_product ON inventory_movements(product_id);
    CREATE INDEX IF NOT EXISTS idx_movements_date    ON inventory_movements(date);
    CREATE INDEX IF NOT EXISTS idx_movements_type    ON inventory_movements(type);
    CREATE INDEX IF NOT EXISTS idx_entry_items_entry ON purchase_entry_items(entry_id);
    CREATE INDEX IF NOT EXISTS idx_exit_items_exit   ON exit_items(exit_id);
  `)
}
