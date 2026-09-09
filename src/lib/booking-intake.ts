import { getProfile, practitionerAccess } from "./recovery/store";
import { refreshDue, CONSENT_VERSION } from "./recovery/model";
import { db } from "./db";
import { canManage } from "./booking-rules";
import type { User } from "./types";
export function intakeStatus(user: User) {
  const profile = getProfile(user);
  return {
    hasIntake: Boolean(profile && !refreshDue(profile)),
    revision: profile?.revision ?? 0,
  };
}
export function intakeReference(user: User) {
  const p = getProfile(user);
  if (!p || refreshDue(p))
    throw new Error(
      "Complete Prepare Your Session before confirming this massage.",
    );
  return `recovery:${user.id}:${p.revision}`;
}
export function readBookingIntake(user: User, reference: string) {
  const match = /^recovery:(.+):(\d+)$/.exec(reference);
  if (!match) throw new Error("Intake reference not found.");
  const client = match[1];
  if (
    user.id !== client &&
    (!canManage(user, "pro-b") || !practitionerAccess(user, client))
  )
    throw new Error("Intake access denied.");
  if (
    user.id !== client &&
    !db()
      .prepare(
        "SELECT 1 FROM appointments WHERE client_id=? AND professional_id='pro-b'",
      )
      .get(client)
  )
    throw new Error("Intake access denied.");
  const profile = getProfile(user, client);
  if (!profile) throw new Error("Intake not found.");
  const d = profile.answers;
  return [
    `Signed by ${d.signature}. Booking intake version ${match[2]}; current version ${profile.revision}.`,
    `Goal: ${d.goal}. ${d.goalNote}`,
    `Pressure: ${d.pressure}. Pain: ${d.pain}/10.`,
    `Body areas: ${d.body.map((b) => `${b.area}: ${b.tags.join(", ")}`).join("; ") || "None marked"}`,
    `Avoid: ${d.avoidNote || "None noted"}`,
    `Health: ${d.health.join(", ")}. ${Object.entries(d.healthNotes)
      .map(([k, v]) => `${k}: ${v}`)
      .join("; ")}`,
    `Diabetes follow-up: insulin ${d.diabetes.insulin || "not applicable"}, sensation ${d.diabetes.sensation || "not applicable"}, wounds ${d.diabetes.wounds || "not applicable"}`,
    `Current care: ${d.care}. ${d.careNote}`,
    `Allergies: ${d.allergies}. ${d.allergyNote}`,
    `Medications: ${d.medications}. ${d.medicationNote}`,
    `Blood thinners: ${d.bloodThinner}. Bruising: ${d.bruising}`,
    d.extra,
    "Review the current signed profile with the client before treatment.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function clientIntakeStatus(viewer: User, clientId: string) {
  if (viewer.id !== clientId && !canManage(viewer, "pro-b"))
    throw new Error("Intake status access denied.");
  if (
    !db()
      .prepare(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name='recovery_profiles'",
      )
      .get()
  )
    return { hasIntake: false, revision: 0 };
  const p = db()
    .prepare(
      "SELECT revision,consent_version,refreshed_at FROM recovery_profiles WHERE client_id=?",
    )
    .get(clientId) as
    | { revision: number; consent_version: string; refreshed_at: string }
    | undefined;
  return {
    hasIntake: Boolean(
      p &&
      p.consent_version === CONSENT_VERSION &&
      Date.now() - Date.parse(p.refreshed_at) < 365 * 86400000,
    ),
    revision: p?.revision ?? 0,
  };
}
