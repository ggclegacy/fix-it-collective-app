import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID, scryptSync } from "node:crypto";
import { DateTime } from "luxon";
import { studio } from "./catalog";
let database: DatabaseSync | undefined;
export function db() {
  if (database) return database;
  if (process.env.VERCEL)
    throw new Error(
      "Configure a durable production database before deploying. Local SQLite is not supported on Vercel.",
    );
  const path = process.env.DATABASE_PATH ?? resolve("data/collective.sqlite");
  mkdirSync(dirname(path), { recursive: true });
  database = new DatabaseSync(path);
  database.exec(
    "PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;",
  );
  database.exec(`
 CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,phone TEXT NOT NULL DEFAULT '',password_hash TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'client' CHECK(role IN ('client','staff','owner')),marketing INTEGER NOT NULL DEFAULT 0,preferred_professional TEXT);
 CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS working_hours (professional_id TEXT NOT NULL,weekday INTEGER NOT NULL CHECK(weekday BETWEEN 1 AND 7),opens INTEGER NOT NULL,closes INTEGER NOT NULL,CHECK(opens>=0 AND closes<=1440 AND opens<closes),PRIMARY KEY(professional_id,weekday));
 CREATE TABLE IF NOT EXISTS appointments (id TEXT PRIMARY KEY,client_id TEXT NOT NULL REFERENCES users(id),professional_id TEXT NOT NULL,service_id TEXT NOT NULL,start_at TEXT NOT NULL,end_at TEXT NOT NULL,busy_until TEXT NOT NULL,price INTEGER NOT NULL CHECK(price>=0),status TEXT NOT NULL CHECK(status IN ('confirmed','completed','cancelled','no_show')),addons TEXT NOT NULL DEFAULT '[]',created_at TEXT NOT NULL,CHECK(start_at<end_at AND end_at<=busy_until));
 CREATE INDEX IF NOT EXISTS appointment_availability ON appointments(professional_id,start_at,busy_until,status);
 CREATE INDEX IF NOT EXISTS appointment_client ON appointments(client_id,start_at);
 CREATE TABLE IF NOT EXISTS blocks (id TEXT PRIMARY KEY,professional_id TEXT NOT NULL,start_at TEXT NOT NULL,end_at TEXT NOT NULL,reason TEXT NOT NULL,CHECK(start_at<end_at));
 CREATE TABLE IF NOT EXISTS notes (id TEXT PRIMARY KEY,client_id TEXT NOT NULL REFERENCES users(id),author_id TEXT NOT NULL REFERENCES users(id),body TEXT NOT NULL,visibility TEXT NOT NULL CHECK(visibility IN ('internal','client')),created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS form_responses (id TEXT PRIMARY KEY,appointment_id TEXT NOT NULL REFERENCES appointments(id),client_id TEXT NOT NULL REFERENCES users(id),form_key TEXT NOT NULL,version TEXT NOT NULL,answers TEXT NOT NULL,created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS outbox (id TEXT PRIMARY KEY,appointment_id TEXT NOT NULL REFERENCES appointments(id),event TEXT NOT NULL,payload TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS audit (id TEXT PRIMARY KEY,actor_id TEXT NOT NULL,appointment_id TEXT,event TEXT NOT NULL,created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS auth_attempts (key TEXT PRIMARY KEY,attempts INTEGER NOT NULL,reset_at INTEGER NOT NULL);
 CREATE TRIGGER IF NOT EXISTS prevent_overlap_insert BEFORE INSERT ON appointments WHEN NEW.status='confirmed' BEGIN
 SELECT RAISE(ABORT,'That time was just booked. Please choose another.') WHERE EXISTS(SELECT 1 FROM appointments WHERE professional_id=NEW.professional_id AND status='confirmed' AND start_at<NEW.busy_until AND busy_until>NEW.start_at);
 SELECT RAISE(ABORT,'That time is blocked.') WHERE EXISTS(SELECT 1 FROM blocks WHERE professional_id=NEW.professional_id AND start_at<NEW.busy_until AND end_at>NEW.start_at); END;
 CREATE TRIGGER IF NOT EXISTS prevent_overlap_update BEFORE UPDATE ON appointments WHEN NEW.status='confirmed' BEGIN
 SELECT RAISE(ABORT,'That time was just booked. Please choose another.') WHERE EXISTS(SELECT 1 FROM appointments WHERE id<>NEW.id AND professional_id=NEW.professional_id AND status='confirmed' AND start_at<NEW.busy_until AND busy_until>NEW.start_at);
 SELECT RAISE(ABORT,'That time is blocked.') WHERE EXISTS(SELECT 1 FROM blocks WHERE professional_id=NEW.professional_id AND start_at<NEW.busy_until AND end_at>NEW.start_at); END;
 CREATE TRIGGER IF NOT EXISTS prevent_block_overlap BEFORE INSERT ON blocks BEGIN
 SELECT RAISE(ABORT,'Move or cancel appointments before blocking this time.') WHERE EXISTS(SELECT 1 FROM appointments WHERE professional_id=NEW.professional_id AND status='confirmed' AND start_at<NEW.end_at AND busy_until>NEW.start_at); END;
 `);
  // Demo data is opt-in outside the development server. No public staff bypass in production.
  if (
    process.env.NODE_ENV === "development" ||
    process.env.SEED_DEMO === "true"
  )
    seed(database);
  return database;
}
function seed(d: DatabaseSync) {
  if (d.prepare("SELECT id FROM users WHERE id=?").get("demo-client")) return;
  transaction(() => {
    const hash =
      "unusable:" + scryptSync(randomUUID(), randomUUID(), 64).toString("hex");
    for (const [id, name, email, role] of [
      ["demo-client", "Alex Morgan", "alex@example.test", "client"],
      ["demo-staff", "Studio preview", "studio@example.test", "staff"],
      ["demo-jordan", "Jordan Ellis", "jordan@example.test", "client"],
    ])
      d.prepare(
        "INSERT INTO users(id,name,email,password_hash,role) VALUES(?,?,?,?,?)",
      ).run(id, name, email, hash, role);
    for (const pro of ["pro-a", "pro-b"])
      for (const day of [1, 2, 3, 4, 5, 6])
        d.prepare("INSERT OR IGNORE INTO working_hours VALUES(?,?,?,?)").run(
          pro,
          day,
          day === 6 ? 600 : 540,
          day === 6 ? 960 : 1080,
        );
    const now = DateTime.now().setZone(studio.timezone);
    const records = [
      {
        id: "seed-next",
        client: "demo-client",
        date: now
          .plus({ days: 1 })
          .set({ hour: 11, minute: 0, second: 0, millisecond: 0 }),
        status: "confirmed",
      },
      {
        id: "seed-today",
        client: "demo-jordan",
        date: now.set({ hour: 14, minute: 0, second: 0, millisecond: 0 }),
        status: "confirmed",
      },
      {
        id: "seed-history",
        client: "demo-client",
        date: now
          .minus({ days: 28 })
          .set({ hour: 11, minute: 0, second: 0, millisecond: 0 }),
        status: "completed",
      },
    ];
    for (const r of records) {
      if (r.status === "confirmed" && r.date.weekday === 7)
        r.date = r.date.plus({ days: 1 });
      d.prepare("INSERT INTO appointments VALUES(?,?,?,?,?,?,?,?,?,?,?)").run(
        r.id,
        r.client,
        "pro-a",
        "signature-cut",
        r.date.toUTC().toISO()!,
        r.date.plus({ minutes: 45 }).toUTC().toISO()!,
        r.date.plus({ minutes: 60 }).toUTC().toISO()!,
        6500,
        r.status,
        "[]",
        now.toUTC().toISO()!,
      );
    }
  });
}
export function transaction<T>(fn: () => T): T {
  const d = db();
  d.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    d.exec("COMMIT");
    return result;
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  }
}
export function closeDatabase() {
  database?.close();
  database = undefined;
}
