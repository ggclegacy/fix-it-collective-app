import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  randomUUID,
} from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { db, transaction } from "../db";
import type { User } from "../types";
import {
  CONSENT_VERSION,
  intakeSchema,
  normalizeIntake,
  refreshDue,
  type Profile,
  type SessionDetails,
} from "./model";
import { services, studio } from "../catalog";
import { DateTime } from "luxon";

function tables() {
  const d = db();
  d.exec(`CREATE TABLE IF NOT EXISTS recovery_profiles(client_id TEXT PRIMARY KEY REFERENCES users(id),payload TEXT NOT NULL,revision INTEGER NOT NULL,updated_at TEXT NOT NULL,refreshed_at TEXT NOT NULL,signed_at TEXT NOT NULL,consent_version TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS recovery_access_log(id TEXT PRIMARY KEY,actor_id TEXT NOT NULL,client_id TEXT NOT NULL,event TEXT NOT NULL,created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS recovery_note_revisions(id TEXT PRIMARY KEY,client_id TEXT NOT NULL REFERENCES users(id),payload TEXT NOT NULL,author_id TEXT NOT NULL REFERENCES users(id),created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS recovery_notes(client_id TEXT PRIMARY KEY REFERENCES users(id),payload TEXT NOT NULL,author_id TEXT NOT NULL REFERENCES users(id),updated_at TEXT NOT NULL);`);
  return d;
}
function key() {
  const configured = process.env.RECOVERY_ENCRYPTION_KEY;
  if (configured) {
    if (!/^[a-f0-9]{64}$/i.test(configured))
      throw new Error("Recovery storage is not configured.");
    return Buffer.from(configured, "hex");
  }
  if (process.env.NODE_ENV === "production")
    throw new Error("Recovery storage is not configured.");
  const path = resolve(
    `${process.env.DATABASE_PATH ?? "data/collective.sqlite"}.recovery-key`,
  );
  try {
    return readFileSync(path);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  const value = randomBytes(32);
  try {
    writeFileSync(path, value, { mode: 0o600, flag: "wx" });
    return value;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "EEXIST")
      return readFileSync(path);
    throw e;
  }
}
export function encrypt(value: unknown, identity: string) {
  const iv = randomBytes(12),
    c = createCipheriv("aes-256-gcm", key(), iv);
  c.setAAD(Buffer.from(identity));
  const encrypted = Buffer.concat([
    c.update(JSON.stringify(value), "utf8"),
    c.final(),
  ]);
  return [iv, c.getAuthTag(), encrypted]
    .map((x) => x.toString("base64"))
    .join(".");
}
export function decrypt(payload: string, identity: string): unknown {
  const [iv, tag, data] = payload
    .split(".")
    .map((x) => Buffer.from(x, "base64"));
  const c = createDecipheriv("aes-256-gcm", key(), iv);
  c.setAAD(Buffer.from(identity));
  c.setAuthTag(tag);
  return JSON.parse(
    Buffer.concat([c.update(data), c.final()]).toString("utf8"),
  );
}
export function practitionerAccess(user: User, clientId: string) {
  if (!['owner','staff'].includes(user.role)) return false;
  const role = db().prepare('SELECT role,clinical FROM team_roles WHERE user_id=?').get(user.id) as {role:string;clinical:number}|undefined;
  if (role?.role === 'front_desk') return false;
  return Boolean(role?.clinical) || (process.env.RECOVERY_PRACTITIONER_USER_IDS ?? '').split(',').map(s=>s.trim()).includes(user.id) ||
    (process.env.NODE_ENV === 'development' && user.id === 'demo-staff' && clientId === 'demo-client');
}
function authorize(user: User, clientId: string) {
  if (user.id !== clientId && !practitionerAccess(user, clientId))
    throw new Error("Staff access to Recovery Room required.");
}
function audit(user: User, event: string, clientId = user.id) {
  db()
    .prepare(
      "INSERT INTO recovery_access_log(id,actor_id,client_id,event,created_at) VALUES(?,?,?,?,?)",
    )
    .run(randomUUID(), user.id, clientId, event, new Date().toISOString());
}
export function getProfile(user: User, clientId = user.id): Profile | null {
  authorize(user, clientId);
  const row = tables()
    .prepare("SELECT * FROM recovery_profiles WHERE client_id=?")
    .get(clientId) as
    | {
        payload: string;
        revision: number;
        updated_at: string;
        refreshed_at: string;
        signed_at: string;
        consent_version: string;
      }
    | undefined;
  if (!row) return null;
  const result = {
    answers: intakeSchema.parse(decrypt(row.payload, clientId)),
    revision: row.revision,
    updatedAt: row.updated_at,
    refreshedAt: row.refreshed_at,
    signedAt: row.signed_at,
    consentVersion: row.consent_version,
  };
  audit(user, "recovery.profile.read", clientId);
  return result;
}
export function saveProfile(
  user: User,
  input: {
    revision: number;
    mode: "full" | "update" | "unchanged";
    answers?: unknown;
  },
) {
  if (user.role !== "client")
    throw new Error("Use your client account to prepare a session.");
  tables();
  return transaction(() => {
    const previous = getProfile(user);
    if ((previous?.revision ?? 0) !== input.revision)
      throw new Error(
        "Your profile changed in another window. Reload before updating it.",
      );
    if (input.mode !== "full" && (!previous || refreshDue(previous)))
      throw new Error("Please complete a full profile refresh.");
    const data =
      input.mode === "unchanged"
        ? previous!.answers
        : normalizeIntake(intakeSchema.parse(input.answers));
    const now = new Date().toISOString();
    const result: Profile = {
      answers: data,
      revision: input.revision + 1,
      updatedAt: now,
      refreshedAt: input.mode === "full" ? now : previous!.refreshedAt,
      signedAt: input.mode === "unchanged" ? previous!.signedAt : now,
      consentVersion: CONSENT_VERSION,
    };
    db()
      .prepare(
        "INSERT INTO recovery_profiles VALUES(?,?,?,?,?,?,?) ON CONFLICT(client_id) DO UPDATE SET payload=excluded.payload,revision=excluded.revision,updated_at=excluded.updated_at,refreshed_at=excluded.refreshed_at,signed_at=excluded.signed_at,consent_version=excluded.consent_version",
      )
      .run(
        user.id,
        encrypt(data, user.id),
        result.revision,
        now,
        result.refreshedAt,
        result.signedAt,
        CONSENT_VERSION,
      );
    audit(user, `recovery.profile.${input.mode}`);
    return result;
  });
}
export function nextRecoverySession(user: User): SessionDetails {
  const row = db()
    .prepare(
      "SELECT id,service_id,start_at,end_at FROM appointments WHERE client_id=? AND professional_id='pro-b' AND status='confirmed' AND start_at>? ORDER BY start_at LIMIT 1",
    )
    .get(user.id, new Date().toISOString()) as
    | { id: string; service_id: string; start_at: string; end_at: string }
    | undefined;
  return row
    ? {
        id: row.id,
        label:
          services.find((s) => s.id === row.service_id)?.name ??
          "Recovery session",
        date: DateTime.fromISO(row.start_at)
          .setZone(studio.timezone)
          .toFormat("cccc, LLL d · h:mm a 'CT'"),
        duration: Math.round(
          (Date.parse(row.end_at) - Date.parse(row.start_at)) / 60000,
        ),
      }
    : null;
}
export function getRecoveryNote(user: User, clientId: string) {
  if (!practitionerAccess(user, clientId))
    throw new Error("Staff access to Recovery Room required.");
  const row = tables()
    .prepare("SELECT payload,updated_at FROM recovery_notes WHERE client_id=?")
    .get(clientId) as { payload: string; updated_at: string } | undefined;
  if (!row) return null;
  audit(user, "recovery.note.read", clientId);
  return {
    body: String(decrypt(row.payload, `note:${clientId}`)),
    updatedAt: row.updated_at,
  };
}
export function saveRecoveryNote(user: User, clientId: string, body: string) {
  if (!practitionerAccess(user, clientId))
    throw new Error("Staff access to Recovery Room required.");
  tables();
  transaction(() => {
    const previous=db().prepare('SELECT * FROM recovery_notes WHERE client_id=?').get(clientId) as {payload:string;author_id:string;updated_at:string}|undefined;
    if(previous && !db().prepare('SELECT 1 FROM recovery_note_revisions WHERE client_id=?').get(clientId))
      db().prepare('INSERT INTO recovery_note_revisions VALUES(?,?,?,?,?)').run(randomUUID(),clientId,previous.payload,previous.author_id,previous.updated_at);
    const payload=encrypt(body, `note:${clientId}`), now=new Date().toISOString();
    db().prepare('INSERT INTO recovery_note_revisions VALUES(?,?,?,?,?)').run(randomUUID(),clientId,payload,user.id,now);
    db().prepare('INSERT INTO recovery_notes VALUES(?,?,?,?) ON CONFLICT(client_id) DO UPDATE SET payload=excluded.payload,author_id=excluded.author_id,updated_at=excluded.updated_at').run(clientId,payload,user.id,now);
    audit(user, 'recovery.note.write', clientId);
  });
}
