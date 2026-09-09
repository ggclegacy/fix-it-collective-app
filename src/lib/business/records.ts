import { z } from "zod";
import { randomUUID } from "node:crypto";
import { db, transaction } from "../db";
import { assertManage } from "../booking-rules";
import { practitionerAccess, encrypt, decrypt } from "../recovery/store";
import { assertClient, auditBusiness } from "./access";
import type { Appointment, User } from "../types";
export const soapSchema = z.object({
  subjective: z.string().trim().min(1).max(6000),
  objective: z.string().trim().min(1).max(6000),
  assessment: z.string().trim().min(1).max(6000),
  plan: z.string().trim().min(1).max(6000),
  areas: z.array(z.string().max(60)).max(30),
  techniques: z.string().max(1000),
  pressure: z.string().max(100),
  response: z.string().max(2000),
  followUpDays: z.number().int().min(1).max(365).nullable(),
});
export type Soap = z.infer<typeof soapSchema>;
function appointment(user: User, id: string, clinical = false) {
  const a = db().prepare("SELECT * FROM appointments WHERE id=?").get(id) as
    Appointment | undefined;
  if (!a) throw new Error("Appointment not found.");
  assertManage(user, a.professional_id);
  if (
    clinical &&
    (a.professional_id !== "pro-b" || !practitionerAccess(user, a.client_id))
  )
    throw new Error("Staff access to clinical records required.");
  return a;
}
export function soapHistory(user: User, id: string) {
  appointment(user, id, true);
  auditBusiness(user, "soap", id, "read");
  return (
    db()
      .prepare(
        "SELECT * FROM soap_revisions WHERE appointment_id=? ORDER BY revision DESC",
      )
      .all(id) as {
      id: string;
      appointment_id: string;
      revision: number;
      author_id: string;
      payload: string;
      created_at: string;
    }[]
  ).map((r) => ({
    id: r.id,
    revision: r.revision,
    author: r.author_id,
    createdAt: r.created_at,
    note: soapSchema.parse(decrypt(r.payload, `soap:${id}:${r.revision}`)),
  }));
}
export function saveSoap(
  user: User,
  id: string,
  revision: number,
  raw: unknown,
) {
  z.number().int().min(0).parse(revision);
  const note = soapSchema.parse(raw);
  return transaction(() => {
    const a = appointment(user, id, true);
    if (
      !["confirmed", "completed"].includes(a.status) ||
      Date.parse(a.start_at) > Date.now()
    )
      throw new Error("Session has not started or was cancelled.");
    const last =
      (
        db()
          .prepare(
            "SELECT MAX(revision) AS n FROM soap_revisions WHERE appointment_id=?",
          )
          .get(id) as { n: number | null }
      ).n ?? 0;
    if (last !== revision)
      throw new Error(
        "This note changed in another window. Reload before saving.",
      );
    const next = last + 1;
    db()
      .prepare("INSERT INTO soap_revisions VALUES(?,?,?,?,?,?)")
      .run(
        randomUUID(),
        id,
        next,
        user.id,
        encrypt(note, `soap:${id}:${next}`),
        new Date().toISOString(),
      );
    auditBusiness(user, "soap", id, `revision:${next}`);
    return next;
  });
}
export const relationshipSchema = z.object({
  clientId: z.string(),
  professionalId: z.string(),
  occupation: z.string().trim().max(160),
  preferences: z.string().trim().max(2000),
  tags: z.string().trim().max(500),
  returnDays: z.number().int().min(1).max(365).nullable(),
  referralSource: z.string().trim().max(120),
  communication: z.string().trim().max(120),
});
export type Relationship = {
  occupation: string;
  preferences: string;
  tags: string;
  return_days: number | null;
  referral_source: string;
  communication: string;
};
export function relationship(
  user: User,
  clientId: string,
  professionalId: string,
) {
  assertClient(user, clientId, professionalId);
  return (
    (db()
      .prepare(
        "SELECT * FROM client_relationships WHERE client_id=? AND professional_id=?",
      )
      .get(clientId, professionalId) as Relationship | undefined) ?? {
      occupation: "",
      preferences: "",
      tags: "",
      return_days: null,
      referral_source: "",
      communication: "Use client consent",
    }
  );
}
export function saveRelationship(user: User, raw: unknown) {
  const r = relationshipSchema.parse(raw);
  assertClient(user, r.clientId, r.professionalId);
  return transaction(() => {
    db()
      .prepare(
        "INSERT INTO client_relationships VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(client_id,professional_id) DO UPDATE SET occupation=excluded.occupation,preferences=excluded.preferences,tags=excluded.tags,return_days=excluded.return_days,referral_source=excluded.referral_source,communication=excluded.communication,updated_at=excluded.updated_at",
      )
      .run(
        r.clientId,
        r.professionalId,
        r.occupation,
        r.preferences,
        r.tags,
        r.returnDays,
        r.referralSource,
        r.communication,
        new Date().toISOString(),
      );
    auditBusiness(user, "client", r.clientId, "relationship_updated");
  });
}
export function saveServiceNote(user: User, id: string, raw: unknown) {
  const n = z
    .object({
      body: z.string().trim().min(1).max(4000),
      products: z.string().max(1000),
      returnDays: z.number().int().min(1).max(365).nullable(),
    })
    .parse(raw);
  const a = appointment(user, id);
  if (a.professional_id !== "pro-a")
    throw new Error("Use encrypted Session Mode for massage treatment notes.");
  return transaction(() => {
    db()
      .prepare("INSERT INTO service_notes VALUES(?,?,?,?,?,?,?)")
      .run(
        randomUUID(),
        id,
        user.id,
        n.body,
        n.products,
        n.returnDays,
        new Date().toISOString(),
      );
    if (n.returnDays)
      db()
        .prepare(
          "INSERT INTO client_relationships(client_id,professional_id,return_days,updated_at) VALUES(?,?,?,?) ON CONFLICT(client_id,professional_id) DO UPDATE SET return_days=excluded.return_days,updated_at=excluded.updated_at",
        )
        .run(
          a.client_id,
          a.professional_id,
          n.returnDays,
          new Date().toISOString(),
        );
    auditBusiness(user, "appointment", id, "service_note_added");
  });
}
