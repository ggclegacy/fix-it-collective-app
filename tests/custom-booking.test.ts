import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { DateTime } from "luxon";
import { db, closeDatabase } from "../src/lib/db";
import {
  availableSlots,
  book,
  changeStatus,
  appointmentsFor,
} from "../src/lib/scheduling";
import { readBookingIntake as readIntake } from "../src/lib/booking-intake";
import { saveProfile } from "../src/lib/recovery/store";
import { emptyIntake } from "../src/lib/recovery/model";
import { recordSettlement } from "../src/lib/booking-integrations";
import type { User } from "../src/lib/types";
const directory = mkdtempSync(join(tmpdir(), "fic-custom-"));
process.env.DATABASE_PATH = join(directory, "test.sqlite");
process.env.SEED_DEMO = "true";
process.env.RECOVERY_ENCRYPTION_KEY = "ab".repeat(32);
const client: User = {
  id: "demo-client",
  name: "Test",
  email: "alex@example.test",
  phone: "",
  role: "client",
  marketing: 0,
  preferred_professional: null,
};
const katie: User = { ...client, id: "demo-staff", role: "staff" };
let day = DateTime.now().setZone("America/Chicago").plus({ days: 14 });
if (day.weekday === 7) day = day.plus({ days: 1 });
const date = day.toISODate()!;
after(() => {
  closeDatabase();
  rmSync(directory, { recursive: true, force: true });
});
function enableMassage() {
  db()
    .prepare("INSERT OR REPLACE INTO service_rules VALUES(?,?,?,?,?,?,?,?,?,?)")
    .run("massage", 60, 20, 10000, 0, 0, 180, 30, 48, 1);
  for (const id of [
    "therapist_name",
    "therapist_license",
    "establishment_name",
    "establishment_license",
  ])
    db()
      .prepare("INSERT OR REPLACE INTO business_settings VALUES(?,?)")
      .run(id, "TEST ONLY");
}
test("unconfigured massage is closed; rules determine duration, buffer, price and horizon", () => {
  assert.equal(availableSlots("massage", "pro-b", date).length, 0);
  enableMassage();
  const slots = availableSlots("massage", "pro-b", date);
  assert.ok(slots.length);
  assert.equal(slots[0].duration, 60);
  assert.equal(slots[0].price, 10000);
  assert.equal(
    availableSlots("massage", "pro-b", day.plus({ days: 40 }).toISODate()!)
      .length,
    0,
  );
});
test("massage intake is encrypted, never copied into general forms, and restricted to therapist or client", () => {
  const start = availableSlots("massage", "pro-b", date)[0].start;
  saveProfile(client, {
    revision: 0,
    mode: "full",
    answers: {
      ...emptyIntake,
      work: "Mostly sitting",
      activity: "Moderate",
      firstMassage: "No",
      goal: "Relaxation",
      pressure: "Medium",
      health: ["None of these"],
      care: "No",
      allergies: "No",
      medications: "No",
      bloodThinner: "No",
      bruising: "No",
      consent: true,
      signature: "Confidential health test",
    },
  });
  const requestKey = randomUUID();
  const input = {
    serviceId: "massage",
    professionalId: "pro-b",
    start,
    addonIds: [],
    acknowledged: true,
    intake: "Confidential health test",
    healthUnchanged: true,
    requestKey,
  };
  const id = book(client, input);
  assert.equal(book(client, input), id);
  const detail = db()
    .prepare("SELECT * FROM booking_details WHERE appointment_id=?")
    .get(id) as { intake_id: string };
  const raw = db()
    .prepare(
      "SELECT payload AS answers FROM recovery_profiles WHERE client_id=?",
    )
    .get(client.id) as { answers: string };
  assert.ok(!raw.answers.includes("Confidential"));
  assert.match(
    readIntake(client, detail.intake_id),
    /Confidential health test/,
  );
  assert.throws(() => readIntake(katie, detail.intake_id), /denied/);
  assert.equal(
    db().prepare("SELECT 1 FROM form_responses WHERE appointment_id=?").get(id),
    undefined,
  );
  assert.ok(!appointmentsFor(katie).some((a) => a.id === id));
  assert.throws(() => changeStatus(katie, id, "cancelled"), /restricted/);
  changeStatus(client, id, "cancelled");
});
test("returning clients reuse intake and rescheduling preserves the lifecycle and original policy", () => {
  const start = availableSlots("massage", "pro-b", date)[0].start;
  const input = {
    serviceId: "massage",
    professionalId: "pro-b",
    start,
    addonIds: [],
    acknowledged: true,
    intake: "",
    healthUnchanged: true,
  };
  const id = book(client, input);
  const before = db()
    .prepare("SELECT * FROM booking_details WHERE appointment_id=?")
    .get(id) as { intake_id: string };
  const next = availableSlots("massage", "pro-b", date).at(-1)!.start;
  assert.equal(book(client, { ...input, start: next }, id), id);
  assert.equal(
    (
      db()
        .prepare("SELECT * FROM booking_details WHERE appointment_id=?")
        .get(id) as { intake_id: string }
    ).intake_id,
    before.intake_id,
  );
  assert.equal(
    (
      db().prepare("SELECT COUNT(*) AS n FROM recovery_profiles").get() as {
        n: number;
      }
    ).n,
    1,
  );
  changeStatus(client, id, "cancelled");
});
test("payment requirements fail closed; server settlements are idempotent and bounded", () => {
  db()
    .prepare("UPDATE service_rules SET deposit=2500 WHERE service_id='massage'")
    .run();
  const start = availableSlots("massage", "pro-b", date)[0].start;
  assert.throws(
    () =>
      book(client, {
        serviceId: "massage",
        professionalId: "pro-b",
        start,
        addonIds: [],
        acknowledged: true,
        intake: "",
        healthUnchanged: true,
      }),
    /payment setup/,
  );
  db()
    .prepare("UPDATE service_rules SET deposit=0 WHERE service_id='massage'")
    .run();
  const id = book(client, {
    serviceId: "massage",
    professionalId: "pro-b",
    start,
    addonIds: [],
    acknowledged: true,
    intake: "",
    healthUnchanged: true,
  });
  const event = {
    eventId: "test-event",
    appointmentId: id,
    amount: 2500,
    currency: "USD" as const,
    status: "paid" as const,
  };
  recordSettlement(event);
  recordSettlement(event);
  assert.equal(
    (
      db()
        .prepare("SELECT paid FROM booking_details WHERE appointment_id=?")
        .get(id) as { paid: number }
    ).paid,
    2500,
  );
  assert.throws(
    () => recordSettlement({ ...event, eventId: "too-much", amount: 10000 }),
    /balance/,
  );
  changeStatus(client, id, "cancelled");
});
test("cancellation queues waitlist openings without health information", () => {
  const start = availableSlots("massage", "pro-b", date)[0].start;
  const id = book(client, {
    serviceId: "massage",
    professionalId: "pro-b",
    start,
    addonIds: [],
    acknowledged: true,
    intake: "",
    healthUnchanged: true,
  });
  db()
    .prepare(
      "INSERT INTO waitlist VALUES('waiting','demo-jordan','pro-b','massage',?,'waiting',?)",
    )
    .run(date, new Date().toISOString());
  changeStatus(client, id, "cancelled");
  assert.ok(
    db()
      .prepare(
        "SELECT 1 FROM notification_jobs WHERE waitlist_id='waiting' AND event='waitlist_opening'",
      )
      .get(),
  );
});
test("two independent processes cannot reserve the same provider interval", async () => {
  const { execFile } = await import("node:child_process");
  const start = availableSlots("signature-cut", "pro-a", date)[0].start;
  const moduleUrl = new URL("../src/lib/scheduling.ts", import.meta.url).href;
  const dbUrl = new URL("../src/lib/db.ts", import.meta.url).href;
  const input = {
    serviceId: "signature-cut",
    professionalId: "pro-a",
    start,
    addonIds: [],
    acknowledged: true,
    intake: "",
  };
  const source = `import {book} from ${JSON.stringify(moduleUrl)};import {closeDatabase} from ${JSON.stringify(dbUrl)};try{book(JSON.parse(process.argv[1]),JSON.parse(process.argv[2]));console.log('reserved')}catch{console.log('conflict')}finally{closeDatabase()}`;
  const attempt = (id: string) =>
    new Promise<string>((resolve, reject) =>
      execFile(
        process.execPath,
        [
          "--import",
          "tsx",
          "--input-type=module",
          "--eval",
          source,
          JSON.stringify({ ...client, id }),
          JSON.stringify(input),
        ],
        { env: process.env },
        (error, stdout) => (error ? reject(error) : resolve(stdout.trim())),
      ),
    );
  const result = await Promise.all([
    attempt("demo-client"),
    attempt("demo-jordan"),
  ]);
  assert.deepEqual(result.sort(), ["conflict", "reserved"]);
});
