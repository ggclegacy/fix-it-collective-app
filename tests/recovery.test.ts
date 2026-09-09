import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { db, closeDatabase } from "../src/lib/db";
import {
  emptyIntake,
  intakeSchema,
  refreshDue,
  watchFlags,
} from "../src/lib/recovery/model";
import {
  getProfile,
  saveProfile,
  practitionerAccess,
  getRecoveryNote,
  saveRecoveryNote,
  nextRecoverySession,
} from "../src/lib/recovery/store";
import type { User } from "../src/lib/types";
const directory = mkdtempSync(join(tmpdir(), "fic-recovery-"));
process.env.DATABASE_PATH = join(directory, "test.sqlite");
process.env.SEED_DEMO = "true";
process.env.RECOVERY_ENCRYPTION_KEY = "a".repeat(64);
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
const data = {
  ...emptyIntake,
  work: "Mostly sitting",
  activity: "Moderate",
  firstMassage: "No",
  goal: "Recovery",
  pressure: "Medium",
  health: ["None of these"],
  care: "No",
  allergies: "No",
  medications: "No",
  bloodThinner: "No",
  bruising: "No",
  consent: true,
  signature: "Sample Client",
};
after(() => {
  closeDatabase();
  rmSync(directory, { recursive: true, force: true });
});
test("health screening requires explicit answers and relevant follow-ups", () => {
  assert.equal(intakeSchema.safeParse(emptyIntake).success, false);
  assert.equal(intakeSchema.safeParse(data).success, true);
  assert.equal(
    intakeSchema.safeParse({ ...data, health: ["Diabetes"] }).success,
    false,
  );
  assert.equal(
    intakeSchema.safeParse({ ...data, health: ["None of these", "Diabetes"] })
      .success,
    false,
  );
  assert.equal(
    intakeSchema.safeParse({ ...data, medications: "Yes" }).success,
    false,
  );
  assert.equal(
    intakeSchema.safeParse({ ...data, allergies: "Yes" }).success,
    false,
  );
  assert.equal(
    intakeSchema.safeParse({ ...data, consent: false }).success,
    false,
  );
  assert.equal(intakeSchema.safeParse({ ...data, pain: 11 }).success, false);
});
test("encrypted profile round trip, restricted access, revision conflicts and annual refresh", () => {
  const p = saveProfile(client, { revision: 0, mode: "full", answers: data });
  assert.equal(getProfile(client)?.answers.signature, "Sample Client");
  const raw = db().prepare("SELECT payload FROM recovery_profiles").get() as {
    payload: string;
  };
  assert.ok(!raw.payload.includes("Sample Client"));
  assert.throws(() => getProfile({ ...client, id: "demo-jordan" }, client.id));
  assert.equal(practitionerAccess(staff, client.id), false);
  assert.throws(() => getProfile(staff, client.id));
  process.env.RECOVERY_PRACTITIONER_USER_IDS = staff.id;
  assert.equal(getProfile(staff, client.id)?.revision, 1);
  assert.throws(() =>
    saveProfile(staff, { revision: 0, mode: "full", answers: data }),
  );
  const same = saveProfile(client, { revision: 1, mode: "unchanged" });
  assert.equal(same.refreshedAt, p.refreshedAt);
  assert.equal(same.signedAt, p.signedAt);
  assert.equal(same.revision, 2);
  assert.throws(() => saveProfile(client, { revision: 1, mode: "unchanged" }));
  assert.equal(
    refreshDue({ ...same, refreshedAt: "2020-01-01T00:00:00.000Z" }),
    true,
  );
  db()
    .prepare("UPDATE recovery_profiles SET refreshed_at=? WHERE client_id=?")
    .run("2020-01-01T00:00:00.000Z", client.id);
  assert.throws(() => saveProfile(client, { revision: 2, mode: "unchanged" }));
  assert.throws(() =>
    saveProfile(client, { revision: 2, mode: "update", answers: data }),
  );
  assert.equal(
    saveProfile(client, { revision: 2, mode: "full", answers: data }).revision,
    3,
  );
  assert.equal(nextRecoverySession(client), null);
});
test("cleared conditions purge hidden details, uncertainty and injury remain watch flags", () => {
  const flagged = intakeSchema.parse({
    ...data,
    health: ["Diabetes"],
    diabetes: { insulin: "Yes", sensation: "Not sure / discuss", wounds: "No" },
    bloodThinner: "Not sure / discuss",
    body: [{ area: "Left knee", tags: ["Injury", "Avoid"] }],
  });
  assert.ok(watchFlags(flagged).some((f) => f.includes("Blood thinner")));
  assert.ok(watchFlags(flagged).some((f) => f.includes("Injury: Left knee")));
  const p = saveProfile(client, {
    revision: 3,
    mode: "update",
    answers: {
      ...data,
      healthNotes: { Diabetes: "Hidden health text" },
      diabetes: { insulin: "Yes", sensation: "Yes", wounds: "Yes" },
      medicationNote: "Old medication",
      allergyNote: "Old allergy",
    },
  });
  assert.deepEqual(p.answers.healthNotes, {});
  assert.equal(p.answers.diabetes.insulin, "");
  assert.equal(p.answers.medicationNote, "");
  assert.equal(p.answers.allergyNote, "");
});
test("practitioner notes are encrypted and never available to clients or general staff", () => {
  saveRecoveryNote(staff, client.id, "Sample treatment response");
  assert.equal(
    getRecoveryNote(staff, client.id)?.body,
    "Sample treatment response",
  );
  assert.throws(() => getRecoveryNote(client, client.id));
  assert.throws(() => saveRecoveryNote(client, client.id, "attempt"));
  const row = db().prepare("SELECT payload FROM recovery_notes").get() as {
    payload: string;
  };
  assert.ok(!row.payload.includes("Sample treatment response"));
  delete process.env.RECOVERY_PRACTITIONER_USER_IDS;
  assert.throws(() => getRecoveryNote(staff, client.id));
});
