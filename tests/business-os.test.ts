import { DatabaseSync } from "node:sqlite";
import { migrateBusiness } from "../src/lib/business/schema";
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID, createCipheriv, randomBytes } from "node:crypto";
import { DateTime } from "luxon";
import { db, closeDatabase } from "../src/lib/db";
import {
  createOrder,
  collectCash,
  products,
  orders,
  saveProduct,
  moveStock,
  voidOrder,
} from "../src/lib/business/commerce";
import {
  metrics,
  refreshGrowth,
  commandSearch,
  capacity,
} from "../src/lib/business/intelligence";
import {
  saveSoap,
  soapHistory,
  saveRelationship,
} from "../src/lib/business/records";
import { scopes } from "../src/lib/business/access";
import { changeStatus, availableSlots } from "../src/lib/scheduling";
import { readIntake } from "../src/lib/private-intake";
import type { User } from "../src/lib/types";
const dir = mkdtempSync(join(tmpdir(), "fic-os-"));
process.env.DATABASE_PATH = join(dir, "test.sqlite");
process.env.SEED_DEMO = "true";
process.env.RECOVERY_ENCRYPTION_KEY = "cd".repeat(32);
process.env.INTAKE_ENCRYPTION_KEY = "ab".repeat(32);
const client: User = {
    id: "demo-client",
    name: "Client",
    email: "test@example.test",
    phone: "",
    role: "client",
    marketing: 0,
    preferred_professional: null,
  },
  katie: User = { ...client, id: "demo-staff", role: "staff" },
  owner: User = { ...client, id: "owner", role: "owner" },
  milla: User = { ...client, id: "milla", role: "staff" },
  desk: User = { ...client, id: "desk", role: "staff" };
for (const u of [owner, milla, desk])
  db()
    .prepare(
      "INSERT INTO users(id,name,email,password_hash,role) VALUES(?,?,?,?,?)",
    )
    .run(u.id, u.id, `${u.id}@example.test`, "unusable", u.role);
for (const u of [milla, desk])
  db().prepare("INSERT INTO staff_assignments VALUES(?,?)").run(u.id, "pro-b");
db()
  .prepare("INSERT INTO team_roles VALUES(?,?,?)")
  .run("milla", "provider", 1);
db()
  .prepare("INSERT INTO team_roles VALUES(?,?,?)")
  .run("desk", "front_desk", 0);
after(() => {
  closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});
let product = "",
  order = "";
test("additive migration preserves booking IDs, policies and foreign keys", () => {
  assert.ok(
    db().prepare("SELECT 1 FROM appointments WHERE id='seed-history'").get(),
  );
  assert.equal(db().prepare("PRAGMA foreign_key_check").all().length, 0);
  assert.ok(
    db()
      .prepare("SELECT 1 FROM schema_migrations WHERE version='business-os-1'")
      .get(),
  );
});
test("roles deny clients and cross-provider workspace access", () => {
  assert.throws(() => scopes(client), /Staff access/);
  assert.throws(() => scopes(katie, "kamilla"), /restricted/);
  assert.deepEqual(scopes(desk), ["pro-b"]);
  assert.deepEqual(scopes(owner), ["pro-a", "pro-b"]);
  assert.throws(() => saveProduct(katie, {}), /owner/);
});
test("checkout calculates discounts and tax on server; cash is atomic and idempotent", () => {
  product = saveProduct(owner, {
    sku: "GG-TEST",
    name: "Groomed Gent test oil",
    brand: "Groomed Gent",
    price: 2000,
    tax_bps: 825,
    low_stock: 1,
    replenish_days: 45,
  });
  moveStock(owner, {
    productId: product,
    quantity: 3,
    kind: "received",
    reason: "Test receipt",
    requestKey: randomUUID(),
  });
  const input = {
    requestKey: randomUUID(),
    clientId: client.id,
    professionalId: "pro-a",
    appointmentId: "seed-history",
    items: [{ productId: product, quantity: 2 }],
    discount: 1000,
    tip: 500,
    serviceTaxBps: 0,
  };
  order = createOrder(katie, input);
  assert.equal(createOrder(katie, input), order);
  assert.throws(
    () => createOrder(katie, { ...input, tip: 600 }),
    /different order/,
  );
  const o = orders(katie).find((o) => o.id === order)!;
  assert.equal(o.subtotal, 10500);
  assert.equal(o.total, 10299);
  assert.equal(o.tax, 299);
  assert.equal(o.paid, 0);
  assert.equal(products(katie)[0].stock, 3);
  assert.throws(
    () => collectCash(katie, order, randomUUID(), o.total - 1),
    /Balance changed/,
  );
  const key = randomUUID();
  collectCash(katie, order, key, o.total);
  collectCash(katie, order, key, o.total);
  assert.equal(products(katie)[0].stock, 1);
  assert.equal(
    db().prepare("SELECT * FROM order_payments WHERE order_id=?").all(order)
      .length,
    1,
  );
  assert.equal(orders(katie).find((o) => o.id === order)?.status, "paid");
  assert.throws(
    () => collectCash(milla, order, randomUUID(), o.total),
    /access denied/,
  );
  changeStatus(katie, "seed-history", "checked_out");
  assert.equal(
    db()
      .prepare(
        "SELECT stage FROM booking_details WHERE appointment_id='seed-history'",
      )
      .get()?.stage,
    "checked_out",
  );
});
test("inventory ledger rejects overselling and mutation; failed checkout rolls back payment", () => {
  const input = {
    requestKey: randomUUID(),
    clientId: client.id,
    professionalId: "pro-a",
    appointmentId: null,
    items: [{ productId: product, quantity: 1 }],
    discount: 0,
    tip: 0,
    serviceTaxBps: 0,
  };
  const id = createOrder(katie, input);
  moveStock(owner, {
    productId: product,
    quantity: -1,
    kind: "damage",
    reason: "Broken bottle",
    requestKey: randomUUID(),
  });
  assert.throws(
    () => collectCash(katie, id, randomUUID(), 2165),
    /Insufficient stock/,
  );
  assert.equal(orders(katie).find((o) => o.id === id)?.status, "open");
  assert.equal(
    db().prepare("SELECT * FROM order_payments WHERE order_id=?").all(id)
      .length,
    0,
  );
  assert.throws(
    () => db().prepare("UPDATE inventory_movements SET quantity=100").run(),
    /immutable/,
  );
  voidOrder(katie, id);
  assert.equal(orders(katie).find((o) => o.id === id)?.status, "void");
});
test("clinical access is explicit; SOAP is encrypted, revisioned and concurrency-safe", () => {
  const now = DateTime.now().minus({ hours: 4 });
  db()
    .prepare("INSERT INTO appointments VALUES(?,?,?,?,?,?,?,?,?,?,?)")
    .run(
      "massage-session",
      client.id,
      "pro-b",
      "massage",
      now.toUTC().toISO()!,
      now.plus({ minutes: 60 }).toUTC().toISO()!,
      now.plus({ minutes: 80 }).toUTC().toISO()!,
      10000,
      "completed",
      "[]",
      now.toUTC().toISO()!,
    );
  const note = {
    subjective: "Private medication discussion",
    objective: "Findings",
    assessment: "Response",
    plan: "Follow up",
    areas: ["Neck"],
    techniques: "Gentle",
    pressure: "Light",
    response: "Comfortable",
    followUpDays: 14,
  };
  assert.throws(() => saveSoap(desk, "massage-session", 0, note), /clinical/);
  assert.throws(() => saveSoap(owner, "massage-session", 0, note), /clinical/);
  assert.equal(saveSoap(milla, "massage-session", 0, note), 1);
  assert.throws(
    () => saveSoap(milla, "massage-session", 0, note),
    /another window/,
  );
  assert.equal(
    saveSoap(milla, "massage-session", 1, { ...note, plan: "Updated plan" }),
    2,
  );
  assert.equal(soapHistory(milla, "massage-session").length, 2);
  assert.equal(soapHistory(milla, "massage-session")[1].note.plan, "Follow up");
  const stored = db()
    .prepare("SELECT payload FROM soap_revisions LIMIT 1")
    .get() as { payload: string };
  assert.ok(!stored.payload.includes("Private medication"));
  assert.throws(
    () => db().prepare("DELETE FROM soap_revisions").run(),
    /immutable/,
  );
  const intake = `recovery:${client.id}:1`;
  assert.throws(() => readIntake(desk, intake), /denied/);
  assert.throws(() => readIntake(owner, intake), /denied/);
  assert.deepEqual(commandSearch(desk, "Private medication"), []);
});
test("reporting uses receipts, separates service and retail, scopes providers, and never invents fees", () => {
  const m = metrics(katie, 7);
  assert.equal(m.collected, 10299);
  assert.equal(m.serviceSales, 5881);
  assert.equal(m.retailSales, 3619);
  assert.equal(m.tips, 500);
  assert.equal(m.tax, 299);
  assert.equal(metrics(milla, 7).collected, 0);
  assert.equal(m.retention, null);
  assert.ok(m.outstanding >= 0);
});
test("deterministic overdue signals persist, deduplicate and resolve after rebooking", () => {
  saveRelationship(katie, {
    clientId: client.id,
    professionalId: "pro-a",
    occupation: "",
    preferences: "Low taper",
    tags: "",
    returnDays: 7,
    referralSource: "referral",
    communication: "Use client consent",
  });
  db()
    .prepare("UPDATE appointments SET status='cancelled' WHERE id='seed-next'")
    .run();
  let result = refreshGrowth(katie);
  assert.ok(result.some((o) => o.kind === "rebooking"));
  assert.equal(
    refreshGrowth(katie).filter((o) => o.kind === "rebooking").length,
    result.filter((o) => o.kind === "rebooking").length,
  );
  db()
    .prepare("UPDATE appointments SET status='confirmed' WHERE id='seed-next'")
    .run();
  result = refreshGrowth(katie);
  assert.ok(!result.some((o) => o.kind === "rebooking"));
});
test("shared resources remove slots and reject conflicting direct database writes", () => {
  let day = DateTime.now().setZone("America/Chicago").plus({ days: 10 });
  if (day.weekday === 7) day = day.plus({ days: 1 });
  const first = availableSlots("signature-cut", "pro-a", day.toISODate()!)[0];
  assert.ok(first);
  db()
    .prepare("INSERT INTO resources VALUES(?,?,?)")
    .run("shared", "main", "Shared room");
  for (const p of ["pro-a", "pro-b"])
    db().prepare("INSERT INTO provider_resources VALUES(?,?)").run(p, "shared");
  db()
    .prepare("INSERT INTO appointments VALUES(?,?,?,?,?,?,?,?,?,?,?)")
    .run(
      "room-session",
      client.id,
      "pro-b",
      "massage",
      first.start,
      DateTime.fromISO(first.start).plus({ minutes: 60 }).toUTC().toISO()!,
      DateTime.fromISO(first.start).plus({ minutes: 80 }).toUTC().toISO()!,
      10000,
      "confirmed",
      "[]",
      new Date().toISOString(),
    );
  assert.ok(
    !availableSlots("signature-cut", "pro-a", day.toISODate()!).some(
      (s) => s.start === first.start,
    ),
  );
  assert.throws(
    () =>
      db()
        .prepare("INSERT INTO appointments VALUES(?,?,?,?,?,?,?,?,?,?,?)")
        .run(
          "conflict",
          client.id,
          "pro-a",
          "signature-cut",
          first.start,
          first.end,
          DateTime.fromISO(first.end).plus({ minutes: 15 }).toUTC().toISO()!,
          6500,
          "confirmed",
          "[]",
          new Date().toISOString(),
        ),
    /resource/,
  );
});
test("capacity removes overlapping blocks once and does not inflate utilization", () => {
  let day = DateTime.now()
    .setZone("America/Chicago")
    .plus({ days: 20 })
    .startOf("day");
  if (day.weekday === 7) day = day.plus({ days: 1 });
  const h = db()
    .prepare(
      "SELECT opens,closes FROM working_hours WHERE professional_id='pro-a' AND weekday=?",
    )
    .get(day.weekday) as { opens: number; closes: number };
  for (const [id, s, e] of [
    ["b1", 60, 120],
    ["b2", 90, 150],
  ] as const)
    db()
      .prepare("INSERT INTO blocks VALUES(?,?,?,?,?)")
      .run(
        id,
        "pro-a",
        day
          .plus({ minutes: h.opens + s })
          .toUTC()
          .toISO()!,
        day
          .plus({ minutes: h.opens + e })
          .toUTC()
          .toISO()!,
        "Break",
      );
  const c = capacity(katie, day, day.plus({ days: 1 }));
  assert.equal(c.available, h.closes - h.opens - 90);
  assert.equal(c.occupied, 0);
});

test("upgrading a populated legacy booking table preserves deposits, stages and policy snapshots", () => {
  const legacy = new DatabaseSync(":memory:");
  legacy.exec(`PRAGMA foreign_keys=ON;
    CREATE TABLE users(id TEXT PRIMARY KEY);
    CREATE TABLE appointments(id TEXT PRIMARY KEY,client_id TEXT REFERENCES users(id),professional_id TEXT,start_at TEXT,busy_until TEXT,status TEXT);
    CREATE TABLE booking_details(appointment_id TEXT PRIMARY KEY REFERENCES appointments(id),stage TEXT NOT NULL,deposit INTEGER NOT NULL,paid INTEGER NOT NULL,payment_status TEXT NOT NULL,cancellation_hours INTEGER NOT NULL,intake_id TEXT,request_key TEXT,policy_snapshot TEXT NOT NULL);
    INSERT INTO users VALUES('old-client');
    INSERT INTO appointments VALUES('old-visit','old-client','pro-a','2026-01-01T10:00:00.000Z','2026-01-01T11:00:00.000Z','confirmed');
    INSERT INTO booking_details VALUES('old-visit','checked_in',2000,2000,'partially_paid',24,NULL,'original-key','{"price":6500}');`);
  migrateBusiness(legacy);
  migrateBusiness(legacy);
  const row = legacy.prepare("SELECT * FROM booking_details").get()!;
  assert.equal(row.stage, "checked_in");
  assert.equal(row.paid, 2000);
  assert.equal(row.request_key, "original-key");
  assert.equal(row.policy_snapshot, '{"price":6500}');
  assert.equal(legacy.prepare("PRAGMA foreign_key_check").all().length, 0);
  legacy.close();
});

test("historical encrypted intakes survive the unified Recovery Room transition", () => {
  db().exec(
    "CREATE TABLE IF NOT EXISTS private_intakes(id TEXT PRIMARY KEY,client_id TEXT,professional_id TEXT,answers TEXT,created_at TEXT)",
  );
  const iv = randomBytes(12),
    c = createCipheriv(
      "aes-256-gcm",
      Buffer.from(process.env.INTAKE_ENCRYPTION_KEY!, "hex"),
      iv,
    );
  const encrypted = Buffer.concat([
    c.update("Historical confidential note", "utf8"),
    c.final(),
  ]);
  const payload = [
    iv.toString("hex"),
    c.getAuthTag().toString("hex"),
    encrypted.toString("hex"),
  ].join(".");
  db()
    .prepare("INSERT INTO private_intakes VALUES(?,?,?,?,?)")
    .run(
      "legacy-intake",
      client.id,
      "pro-b",
      payload,
      new Date().toISOString(),
    );
  assert.equal(
    readIntake(milla, "legacy-intake"),
    "Historical confidential note",
  );
  assert.equal(
    readIntake(client, "legacy-intake"),
    "Historical confidential note",
  );
  assert.throws(() => readIntake(desk, "legacy-intake"), /denied/);
  assert.throws(() => readIntake(owner, "legacy-intake"), /denied/);
});

test("staged rollout migration repairs an existing order table without losing rows", () => {
  const d = new DatabaseSync(":memory:");
  d.exec(
    `CREATE TABLE schema_migrations(version TEXT PRIMARY KEY,applied_at TEXT NOT NULL);INSERT INTO schema_migrations VALUES('business-os-1','2026-09-09');CREATE TABLE orders(id TEXT PRIMARY KEY,request_key TEXT NOT NULL);INSERT INTO orders VALUES('existing-order','existing-request');`,
  );
  migrateBusiness(d);
  migrateBusiness(d);
  assert.equal(d.prepare("SELECT id FROM orders").get()?.id, "existing-order");
  assert.equal(
    d.prepare("SELECT request_hash FROM orders").get()?.request_hash,
    "",
  );
  assert.ok(
    d
      .prepare("SELECT 1 FROM schema_migrations WHERE version='business-os-2'")
      .get(),
  );
  d.close();
});
