import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "../../foxystream.db");

export const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    watchlist TEXT NOT NULL DEFAULT '[]',
    watch_history TEXT NOT NULL DEFAULT '[]',
    search_history TEXT NOT NULL DEFAULT '[]',
    ratings TEXT NOT NULL DEFAULT '{}',
    playback_speed REAL NOT NULL DEFAULT 1.0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    host_id INTEGER NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    password TEXT,
    status TEXT NOT NULL DEFAULT 'idle',
    current_item TEXT,
    queue TEXT NOT NULL DEFAULT '[]',
    idle_until INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS room_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    viewer_id INTEGER REFERENCES users(id),
    viewer_name TEXT,
    subject_id TEXT NOT NULL,
    title TEXT NOT NULL,
    subject_type INTEGER NOT NULL DEFAULT 1,
    season INTEGER,
    episode INTEGER,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS room_schedule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    subject_id TEXT NOT NULL,
    title TEXT NOT NULL,
    subject_type INTEGER NOT NULL DEFAULT 1,
    season INTEGER,
    episode INTEGER,
    resolution TEXT NOT NULL DEFAULT '720',
    lang TEXT NOT NULL DEFAULT 'En',
    scheduled_time INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
`);

export default db;
