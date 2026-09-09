import {
  getProfile,
  getProfileVersion,
  practitionerAccess,
} from "./recovery/store";
import {
  describeRegion,
  refreshDue,
  CONSENT_VERSION,
  watchFlags,
} from "./recovery/model";
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
export function intakeReference(user: User, expectedRevision?: number) {
  const p = getProfile(user);
  if (!p || refreshDue(p))
    throw new Error(
      "Complete Prepare Your Session before confirming this massage.",
    );
  if (expectedRevision !== undefined && expectedRevision !== p.revision)
    throw new Error(
      "Your intake changed in another window. Review the updated profile before confirming this booking.",
    );
  if (!getProfileVersion(user, user.id, p.revision))
    throw new Error("Unable to preserve your signed intake. Please try again.");
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
  const booked = getProfileVersion(user, client, Number(match[2]));
  if (!booked)
    throw new Error(
      "The signed intake version for this booking is unavailable. Review the current profile with the client; do not treat it as the original record.",
    );
  const d = booked.answers;
  const current = profile.answers;
  return [
    ...(profile.revision !== booked.revision
      ? [
          `UPDATED SINCE BOOKING · Current profile version ${profile.revision}, confirmed ${profile.updatedAt}.`,
          `CURRENT WATCH: ${watchFlags(current).join("; ") || "No watch flags reported"}.`,
          `CURRENT AVOID: ${
            current.body
              .filter((b) => b.tags.includes("Avoid"))
              .map((b) => b.area)
              .join(", ") || "None marked"
          }. ${current.avoidNote}`,
          `CURRENT ALLERGIES: ${current.allergies}. ${current.allergyNote}`,
        ]
      : []),
    `SIGNED PROFILE AT BOOKING · Version ${booked.revision}. Signed by ${d.signature} on ${booked.signedAt}.`,
    `Work: ${d.work}. ${d.occupation}. Activity: ${d.activity}. First massage: ${d.firstMassage}.`,
    `Goal: ${d.goal}. ${d.goalNote}`,
    `Pressure: ${d.pressure}. Pain: ${d.pain}/10.`,
    `Body areas: ${d.body.map((b) => `${b.area}: ${describeRegion(b)}`).join("; ") || "None marked"}`,
    ...(d.noProblemAreas
      ? [
          "Client reports no pain / problem areas; confirm treatment boundaries.",
        ]
      : []),
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
    `Consent (${booked.consentVersion}): ${booked.consentText || "Historical wording unavailable; retain the recorded version identifier."}`,
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
