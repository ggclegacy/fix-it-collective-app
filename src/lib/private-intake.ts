import { createDecipheriv, randomUUID } from "node:crypto";
import { readBookingIntake } from "./booking-intake";
import { practitionerAccess } from "./recovery/store";
import { canManage } from "./booking-rules";
import { db } from "./db";
import type { User } from "./types";
/** New bookings use Recovery Room. Legacy encrypted intake remains readable until deliberately migrated. */
export function readIntake(user: User, reference: string) {
  if (reference.startsWith("recovery:"))
    return readBookingIntake(user, reference);
  if (
    !db()
      .prepare(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name='private_intakes'",
      )
      .get()
  )
    throw new Error("Intake reference not found.");
  const r = db()
    .prepare(
      "SELECT client_id,professional_id,answers FROM private_intakes WHERE id=?",
    )
    .get(reference) as
    { client_id: string; professional_id: string; answers: string } | undefined;
  if (
    !r ||
    (user.id !== r.client_id &&
      (!canManage(user, r.professional_id) ||
        !practitionerAccess(user, r.client_id)))
  )
    throw new Error("Intake access denied.");
  const key = process.env.INTAKE_ENCRYPTION_KEY;
  if (!key || !/^[a-f0-9]{64}$/i.test(key))
    throw new Error(
      "The legacy intake encryption key is required to read this historical record.",
    );
  const [iv, tag, data] = r.answers.split(".");
  const c = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(key, "hex"),
    Buffer.from(iv, "hex"),
  );
  c.setAuthTag(Buffer.from(tag, "hex"));
  const text = Buffer.concat([
    c.update(Buffer.from(data, "hex")),
    c.final(),
  ]).toString("utf8");
  db()
    .prepare("INSERT INTO audit VALUES(?,?,?,?,?)")
    .run(
      randomUUID(),
      user.id,
      null,
      `intake_read:${reference}`,
      new Date().toISOString(),
    );
  return text;
}
