import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeDatabase } from "../src/lib/db";
import {
  emptyIntake,
  intakeSchema,
  compareBody,
  describeRegion,
  watchFlags,
} from "../src/lib/recovery/model";
import {
  saveProfile,
  getBodyHistory,
  getProfileVersion,
  getProfile,
} from "../src/lib/recovery/store";
import { readBookingIntake, intakeReference } from "../src/lib/booking-intake";
import type { User } from "../src/lib/types";
const dir = mkdtempSync(join(tmpdir(), "fic-body-"));
process.env.DATABASE_PATH = join(dir, "test.sqlite");
process.env.SEED_DEMO = "true";
process.env.RECOVERY_ENCRYPTION_KEY = "b".repeat(64);
const client: User = {
  id: "demo-client",
  name: "Alex",
  email: "alex@example.test",
  phone: "",
  role: "client",
  marketing: 0,
  preferred_professional: null,
};
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
  signature: "Body QA",
};
after(() => {
  closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});
test("legacy reports load, region validation rejects conflicts and preserves unknown intensity", () => {
  assert.equal(
    intakeSchema.parse({ ...data, body: [{ area: "Neck", tags: ["Pain"] }] })
      .body[0].intensity,
    undefined,
  );
  for (const body of [
    [{ area: "Neck", tags: ["Pain"], intensity: 11 }],
    [{ area: "Neck", tags: ["Pain"], intensity: -1 }],
    [{ area: "Neck", tags: ["Focus", "Avoid"] }],
    [{ area: "Neck", tags: ["Pain", "Pain"] }],
    [
      { area: "Neck", tags: ["Pain"] },
      { area: "Neck", tags: ["Avoid"] },
    ],
  ])
    assert.equal(intakeSchema.safeParse({ ...data, body }).success, false);
  assert.equal(
    intakeSchema.safeParse({
      ...data,
      noProblemAreas: true,
      body: [{ area: "Neck", tags: ["Pain"] }],
    }).success,
    false,
  );
  assert.equal(
    intakeSchema.safeParse({
      ...data,
      noProblemAreas: true,
      body: [{ area: "Neck", tags: ["Avoid"] }],
    }).success,
    true,
  );
});
test("encrypted body history, signed booking summary and changes survive database reopen", () => {
  const first = saveProfile(client, {
    revision: 0,
    mode: "full",
    answers: {
      ...data,
      body: [
        {
          area: "Left shoulder",
          tags: ["Tightness", "Light pressure"],
          intensity: 7,
        },
        { area: "Right knee", tags: ["Avoid"] },
      ],
    },
  });
  const reference = intakeReference(client, first.revision);
  const second = saveProfile(client, {
    revision: 1,
    mode: "update",
    answers: {
      ...first.answers,
      body: [
        {
          area: "Left shoulder",
          tags: ["Numbness / tingling", "Avoid"],
          intensity: 4,
        },
      ],
    },
  });
  closeDatabase();
  assert.deepEqual(getProfile(client)?.answers.body, second.answers.body);
  const history = getBodyHistory(client);
  assert.deepEqual(
    history.map((h) => h.revision),
    [2, 1],
  );
  assert.deepEqual(history[1].body, first.answers.body);
  assert.equal("signature" in history[0], false);
  assert.match(
    readBookingIntake(client, reference),
    /Light pressure · intensity 7\/10/,
  );
  assert.match(watchFlags(second.answers).join(), /Reported numbness/);
  assert.match(
    compareBody(second.answers.body, first.answers.body).join(),
    /no longer marked \(not a recovery assessment\)/,
  );
  assert.equal(
    describeRegion({ area: "Neck", tags: ["Focus"], intensity: 0 }),
    "Focus · intensity 0/10",
  );
  assert.deepEqual(
    getProfileVersion(client, client.id, 1)?.answers.body,
    first.answers.body,
  );
  assert.throws(() =>
    getBodyHistory({ ...client, id: "demo-jordan" }, client.id),
  );
  assert.throws(() =>
    getBodyHistory({ ...client, id: "demo-staff", role: "staff" }, client.id),
  );
});

test("intensity alone never invents a treatment preference; no-problem cannot contradict global pain", () => {
  const d = intakeSchema.parse({
    ...data,
    body: [{ area: "Neck", tags: [], intensity: 4 }],
  });
  assert.deepEqual(d.body[0].tags, []);
  assert.equal(describeRegion(d.body[0]), "intensity 4/10");
  assert.equal(
    intakeSchema.safeParse({ ...data, noProblemAreas: true, pain: 2 }).success,
    false,
  );
  assert.equal(
    intakeSchema.safeParse({ ...data, body: [{ area: "Neck", tags: [] }] })
      .success,
    false,
  );
});
