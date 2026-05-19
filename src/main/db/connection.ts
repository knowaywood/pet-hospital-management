import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import * as schema from './schema'

let db: ReturnType<typeof drizzle<typeof schema>>
let sqlite: Database.Database

export function getDbPath(): string {
  const userDataPath = app.getPath('userData')
  return join(userDataPath, 'pet-hospital.db')
}

export function getAttachmentsDir(): string {
  const userDataPath = app.getPath('userData')
  return join(userDataPath, 'attachments')
}

export function getDatabase() {
  if (!db) {
    const dbPath = getDbPath()
    sqlite = new Database(dbPath)
    sqlite.pragma('journal_mode = WAL')
    sqlite.pragma('foreign_keys = ON')
    db = drizzle(sqlite, { schema })
    createTables(sqlite)
  }
  return db
}

function runMigration(sqlite: Database.Database) {
  // Migrate TEXT created_at → INTEGER for tables that might have old text format
  const tables = ['pets', 'appointments', 'medical_records', 'medicines', 'bills', 'vaccines', 'reminders', 'attachments', 'inventory_logs']
  for (const t of tables) {
    try {
      const col = sqlite.prepare(`PRAGMA table_info(${t})`).all() as any[]
      const createdAt = col.find((c: any) => c.name === 'created_at')
      if (createdAt && createdAt.type?.toUpperCase() === 'TEXT') {
        sqlite.exec(`ALTER TABLE ${t} RENAME COLUMN created_at TO _old_created_at`)
        sqlite.exec(`ALTER TABLE ${t} ADD COLUMN created_at INTEGER NOT NULL DEFAULT 0`)
        sqlite.exec(`UPDATE ${t} SET created_at = (strftime('%s', _old_created_at) * 1000) WHERE typeof(_old_created_at) = 'text' AND _old_created_at != ''`)
        try { sqlite.exec(`ALTER TABLE ${t} DROP COLUMN _old_created_at`) } catch {}
      }
    } catch {}
  }
  // Migrate birth_date → age
  try { sqlite.exec('ALTER TABLE pets RENAME COLUMN birth_date TO age') } catch {}
  // Unique index on phone
  try { sqlite.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_owners_phone ON owners(phone)') } catch {}
  // Add is_service column to medicines (migration)
  try { sqlite.exec('ALTER TABLE medicines ADD COLUMN is_service INTEGER NOT NULL DEFAULT 0') } catch {}
  // Add title column to attachments (migration)
  try { sqlite.exec('ALTER TABLE attachments ADD COLUMN title TEXT NOT NULL DEFAULT ""') } catch {}
}

function createTables(sqlite: Database.Database) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS owners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL UNIQUE,
      address TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id INTEGER NOT NULL REFERENCES owners(id),
      name TEXT NOT NULL,
      species TEXT NOT NULL,
      breed TEXT NOT NULL DEFAULT '',
      gender TEXT NOT NULL DEFAULT 'unknown' CHECK(gender IN ('male','female','unknown')),
      age TEXT NOT NULL DEFAULT '',
      weight_kg REAL NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pet_id INTEGER NOT NULL REFERENCES pets(id),
      owner_id INTEGER NOT NULL REFERENCES owners(id),
      doctor_name TEXT NOT NULL,
      scheduled_time TEXT NOT NULL,
      reason TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT 'treatment' CHECK(type IN ('treatment','grooming','bath','vaccination','other')),
      status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','in_progress','completed','cancelled')),
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS medical_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pet_id INTEGER NOT NULL REFERENCES pets(id),
      appointment_id INTEGER NOT NULL REFERENCES appointments(id),
      diagnosis TEXT NOT NULL DEFAULT '',
      prescription TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      total_fee REAL NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS medicines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      specification TEXT NOT NULL DEFAULT '',
      unit TEXT NOT NULL DEFAULT '片',
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      price_per_unit REAL NOT NULL DEFAULT 0,
      min_stock_alert INTEGER NOT NULL DEFAULT 10,
      is_service INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id INTEGER NOT NULL REFERENCES owners(id),
      appointment_id INTEGER NOT NULL REFERENCES appointments(id),
      total_amount REAL NOT NULL DEFAULT 0,
      paid_amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'unpaid' CHECK(status IN ('unpaid','partial','paid')),
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bill_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_id INTEGER NOT NULL REFERENCES bills(id),
      item_type TEXT NOT NULL CHECK(item_type IN ('consultation','medicine','procedure','other')),
      description TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL DEFAULT 0,
      amount REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS vaccines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pet_id INTEGER NOT NULL REFERENCES pets(id),
      vaccine_name TEXT NOT NULL,
      administered_date TEXT NOT NULL,
      next_due_date TEXT NOT NULL DEFAULT '',
      batch_number TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pet_id INTEGER NOT NULL REFERENCES pets(id),
      owner_id INTEGER NOT NULL REFERENCES owners(id),
      type TEXT NOT NULL CHECK(type IN ('vaccination','followup','custom')),
      title TEXT NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','completed','dismissed')),
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      record_id INTEGER NOT NULL REFERENCES medical_records(id),
      file_name TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL DEFAULT 0,
      thumbnail_path TEXT NOT NULL DEFAULT '',
      original_path TEXT NOT NULL DEFAULT '',
      preview_path TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inventory_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      medicine_id INTEGER NOT NULL REFERENCES medicines(id),
      change_type TEXT NOT NULL CHECK(change_type IN ('purchase','dispense','adjust','return')),
      quantity INTEGER NOT NULL,
      batch_number TEXT NOT NULL DEFAULT '',
      purchase_price REAL NOT NULL DEFAULT 0,
      related_id INTEGER NOT NULL DEFAULT 0,
      note TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT ''
    );
  `)
  runMigration(sqlite)
}
