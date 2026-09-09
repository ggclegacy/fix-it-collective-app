import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DateTime } from "luxon";
import { db, closeDatabase } from "../src/lib/db";
import {
  availableSlots,
  book,
  appointmentsFor,
  changeStatus,
} from "../src/lib/scheduling";
import { quote, studio } from "../src/lib/catalog";
import type { User } from "../src/lib/types";
const dir = mkdtempSync(join(tmpdir(), "fic-test-"));
process.env.DATABASE_PATH = join(dir, "test.sqlite");
process.env.SEED_DEMO = "true";
const client: User = {
  id: "demo-client",
  name: "Alex",
  email: "alex@example.test",
  phone: "",
  role: "client",
  marketing: 0,
  preferred_professional: null,
};
const staff: User = { ...client, id: "demo-staff", role: "staff" };
let date = DateTime.now()
  .setZone(studio.timezone)
  .plus({ days: 7 })
  .startOf("day");
if (date.weekday === 7) date = date.plus({ days: 1 });
const day = date.toISODate()!;
after(() => {
  closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});
test("professional pricing and add-on duration come from the catalog", () => {
  assert.throws(() => quote("signature-cut", "pro-b"));
  assert.equal(quote("signature-cut", "pro-a", ["scalp"]).duration, 60);
  assert.throws(() => quote("color", "pro-a"));
  assert.throws(() => quote("signature-cut", "pro-a", ["scalp", "scalp"]));
});
test("availability respects working hours, closing buffer, Sunday closure and minimum notice", () => {
  const slots = availableSlots("signature-cut", "pro-a", day);
  assert.ok(slots.length > 0);
  assert.equal(
    DateTime.fromISO(slots[0].start).setZone(studio.timezone).hour,
    date.weekday === 6 ? 10 : 9,
  );
  const close = date.set({ hour: date.weekday === 6 ? 16 : 18 });
  assert.ok(
    slots.every((s) => DateTime.fromISO(s.end).plus({ minutes: 15 }) <= close),
  );
  const sunday = date.set({ weekday: 7 }).toISODate()!;
  assert.equal(availableSlots("signature-cut", "pro-a", sunday).length, 0);
  const controlled = date.set({ hour: 12 });
  assert.ok(
    availableSlots(
      "signature-cut",
      "pro-a",
      day,
      [],
      undefined,
      controlled,
    ).every((s) => DateTime.fromISO(s.start) >= controlled.plus({ hours: 2 })),
  );
});
test("one booking persists across client and staff, rejects collisions, and cancellation frees time", () => {
  const slot = availableSlots("signature-cut", "pro-a", day)[0];
  const input = {
    serviceId: "signature-cut",
    professionalId: "pro-a",
    start: slot.start,
    addonIds: [],
    acknowledged: true,
    intake: "Test intake",
  };
  const id = book(client, input);
  assert.ok(appointmentsFor(client).some((a) => a.id === id));
  assert.ok(appointmentsFor(staff).some((a) => a.id === id));
  assert.throws(() => book(client, input), /no longer available/);
  assert.ok(
    !availableSlots("signature-cut", "pro-a", day).some(
      (s) => s.start === slot.start,
    ),
  );
  assert.ok(
    db().prepare("SELECT * FROM form_responses WHERE appointment_id=?").get(id),
  );
  assert.ok(
    db().prepare("SELECT * FROM outbox WHERE appointment_id=?").get(id),
  );
  changeStatus(client, id, "cancelled");
  assert.ok(
    availableSlots("signature-cut", "pro-a", day).some(
      (s) => s.start === slot.start,
    ),
  );
});
test("database itself enforces overlap and blocks even outside scheduling service", () => {
  const slot = availableSlots("signature-cut", "pro-a", day)[0];
  const id = book(client, {
    serviceId: "signature-cut",
    professionalId: "pro-a",
    start: slot.start,
    addonIds: [],
    acknowledged: true,
    intake: "",
  });
  assert.throws(
    () =>
      db()
        .prepare(
          "INSERT INTO appointments SELECT ?,client_id,professional_id,service_id,start_at,end_at,busy_until,price,status,addons,created_at FROM appointments WHERE id=?",
        )
        .run("duplicate-test", id),
    /just booked/,
  );
  assert.throws(
    () =>
      db()
        .prepare("INSERT INTO blocks VALUES(?,?,?,?,?)")
        .run("bad-block", "pro-a", slot.start, slot.end, "conflict"),
    /Move or cancel/,
  );
  changeStatus(staff, id, "cancelled");
});
test("rescheduling is atomic; conflict leaves original appointment intact", () => {
  const slots = availableSlots("signature-cut", "pro-a", day);
  const first = slots[0];
  const later = slots.at(-1)!;
  const input = {
    serviceId: "signature-cut",
    professionalId: "pro-a",
    start: first.start,
    addonIds: [],
    acknowledged: true,
    intake: "",
  };
  const id = book(client, input);
  const second = book(client, { ...input, start: later.start });
  assert.throws(
    () => book(client, { ...input, start: later.start }, id),
    /no longer available/,
  );
  assert.equal(
    appointmentsFor(client).find((a) => a.id === id)?.start_at,
    first.start,
  );
  changeStatus(staff, second, "cancelled");
  book(client, { ...input, start: later.start }, id);
  assert.equal(
    appointmentsFor(client).find((a) => a.id === id)?.start_at,
    later.start,
  );
  changeStatus(staff, id, "cancelled");
});
test("client cannot view or change another client visit, complete a visit, or complete a future visit as staff", () => {
  const slot = availableSlots("signature-cut", "pro-a", day)[0];
  const id = book(client, {
    serviceId: "signature-cut",
    professionalId: "pro-a",
    start: slot.start,
    addonIds: [],
    acknowledged: true,
    intake: "",
  });
  const other = { ...client, id: "demo-jordan" };
  assert.ok(!appointmentsFor(other).some((a) => a.id === id));
  assert.throws(() => changeStatus(other, id, "cancelled"), /not found/);
  assert.throws(() => changeStatus(client, id, "completed"), /Staff access/);
  assert.throws(() => changeStatus(staff, id, "completed"), /not started/);
  changeStatus(staff, id, "cancelled");
});
test("blocked time removes availability and an adjacent buffer boundary is valid", () => {
  const slot = availableSlots("signature-cut", "pro-a", day)[0];
  const end = DateTime.fromISO(slot.start).plus({ hours: 1 }).toUTC().toISO()!;
  db()
    .prepare("INSERT INTO blocks VALUES(?,?,?,?,?)")
    .run("break", "pro-a", slot.start, end, "Lunch");
  assert.ok(
    !availableSlots("signature-cut", "pro-a", day).some(
      (s) => s.start === slot.start,
    ),
  );
  assert.ok(
    availableSlots("signature-cut", "pro-a", day).some((s) => s.start === end),
  );
  db().prepare("DELETE FROM blocks WHERE id=?").run("break");
});
test("DST uses studio timezone and rejects invalid dates and dates outside the horizon", () => {
  const fixed = DateTime.fromISO("2026-10-20T08:00:00", {
    zone: studio.timezone,
  });
  const slots = availableSlots(
    "signature-cut",
    "pro-a",
    "2026-11-02",
    [],
    undefined,
    fixed,
  );
  assert.ok(slots[0].start.includes("15:00:00"));
  assert.throws(() => availableSlots("signature-cut", "pro-a", "2026-02-30"));
  assert.equal(
    availableSlots(
      "signature-cut",
      "pro-a",
      date.plus({ days: 60 }).toISODate()!,
    ).length,
    0,
  );
});
test("SQLite data survives a connection restart", () => {
  const before = appointmentsFor(client).length;
  closeDatabase();
  assert.equal(appointmentsFor(client).length, before);
});
