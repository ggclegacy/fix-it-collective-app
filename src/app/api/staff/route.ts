import { z } from "zod";
import { DateTime } from "luxon";
import { randomUUID } from "node:crypto";
import { requireUser } from "@/lib/auth";
import { endpoint, sameOrigin } from "@/lib/http";
import { db, transaction } from "@/lib/db";
import { professionals, studio } from "@/lib/catalog";
import { book } from "@/lib/scheduling";
import { bookingSchema } from "@/lib/validation";
import type { User } from "@/lib/types";
const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("note"),
    clientId: z.string(),
    body: z.string().trim().min(1).max(3000),
    visibility: z.enum(["internal", "client"]),
  }),
  z.object({
    action: z.literal("block"),
    professionalId: z.string(),
    start: z.iso.datetime(),
    end: z.iso.datetime(),
    reason: z.string().trim().min(1).max(200),
  }),
  z.object({ action: z.literal("unblock"), id: z.string() }),
  z.object({
    action: z.literal("hours"),
    professionalId: z.string(),
    weekday: z.number().int().min(1).max(7),
    opens: z.number().int().min(0).max(1439),
    closes: z.number().int().min(1).max(1440),
    closed: z.boolean(),
  }),
  z.object({
    action: z.literal("book"),
    clientId: z.string(),
    booking: bookingSchema,
  }),
]);
export async function POST(request: Request) {
  return endpoint(async () => {
    sameOrigin(request);
    const user = await requireUser(true);
    const input = schema.parse(await request.json());
    if (
      "professionalId" in input &&
      !professionals.some((p) => p.id === input.professionalId)
    )
      throw new Error("Invalid professional.");
    if (input.action === "book") {
      const client = db()
        .prepare(
          "SELECT id,name,email,phone,role,marketing,preferred_professional FROM users WHERE id=? AND role='client'",
        )
        .get(input.clientId) as User | undefined;
      if (!client) throw new Error("Client not found.");
      return { id: book(client, input.booking, undefined, user.id) };
    }
    if (input.action === "note")
      db()
        .prepare("INSERT INTO notes VALUES(?,?,?,?,?,?)")
        .run(
          randomUUID(),
          input.clientId,
          user.id,
          input.body,
          input.visibility,
          new Date().toISOString(),
        );
    if (input.action === "block") {
      const start = DateTime.fromISO(input.start).toUTC().toISO()!;
      const end = DateTime.fromISO(input.end).toUTC().toISO()!;
      if (start >= end) throw new Error("End time must follow start time.");
      db()
        .prepare("INSERT INTO blocks VALUES(?,?,?,?,?)")
        .run(randomUUID(), input.professionalId, start, end, input.reason);
    }
    if (input.action === "unblock")
      db().prepare("DELETE FROM blocks WHERE id=?").run(input.id);
    if (input.action === "hours") {
      if (!input.closed && input.opens >= input.closes)
        throw new Error("Closing time must follow opening time.");
      transaction(() => {
        const upcoming = db()
          .prepare(
            "SELECT start_at,busy_until FROM appointments WHERE professional_id=? AND status='confirmed' AND start_at>?",
          )
          .all(input.professionalId, new Date().toISOString()) as {
          start_at: string;
          busy_until: string;
        }[];
        if (
          upcoming.some((a) => {
            const s = DateTime.fromISO(a.start_at).setZone(studio.timezone),
              e = DateTime.fromISO(a.busy_until).setZone(studio.timezone);
            return (
              s.weekday === input.weekday &&
              (input.closed ||
                s.hour * 60 + s.minute < input.opens ||
                e.hour * 60 + e.minute > input.closes)
            );
          })
        )
          throw new Error(
            "Move existing appointments before reducing these working hours.",
          );
        db()
          .prepare(
            "DELETE FROM working_hours WHERE professional_id=? AND weekday=?",
          )
          .run(input.professionalId, input.weekday);
        if (!input.closed)
          db()
            .prepare("INSERT INTO working_hours VALUES(?,?,?,?)")
            .run(
              input.professionalId,
              input.weekday,
              input.opens,
              input.closes,
            );
      });
    }
    return { ok: true };
  });
}
