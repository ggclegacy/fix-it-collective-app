import { DateTime } from "luxon";
import { db, transaction } from "./db";
import { policy, professionals, quote, studio } from "./catalog";
import { randomUUID } from "node:crypto";
import type { Appointment, Slot, User } from "./types";
export function availableSlots(
  serviceId: string,
  professionalId: string,
  date: string,
  addonIds: string[] = [],
  excludeId?: string,
  now: DateTime = DateTime.now(),
): Slot[] {
  const day = DateTime.fromISO(date, { zone: studio.timezone });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !day.isValid)
    throw new Error("Choose a valid date.");
  if (
    day.startOf("day") < now.setZone(studio.timezone).startOf("day") ||
    day >
      now
        .setZone(studio.timezone)
        .plus({ days: policy.horizonDays })
        .endOf("day")
  )
    return [];
  const eligible = professionals.filter(
    (p) =>
      (professionalId === "any" || p.id === professionalId) &&
      p.services.includes(serviceId),
  );
  const slots: Slot[] = [];
  for (const pro of eligible) {
    const q = quote(serviceId, pro.id, addonIds);
    const hours = db()
      .prepare(
        "SELECT opens,closes FROM working_hours WHERE professional_id=? AND weekday=?",
      )
      .get(pro.id, day.weekday) as
      { opens: number; closes: number } | undefined;
    if (!hours) continue;
    const occupied = db()
      .prepare(
        "SELECT start_at,busy_until AS end_at FROM appointments WHERE professional_id=? AND status='confirmed' AND id<>? AND start_at<? AND busy_until>? UNION ALL SELECT start_at,end_at FROM blocks WHERE professional_id=? AND start_at<? AND end_at>?",
      )
      .all(
        pro.id,
        excludeId ?? "",
        day.endOf("day").toUTC().toISO()!,
        day.startOf("day").toUTC().toISO()!,
        pro.id,
        day.endOf("day").toUTC().toISO()!,
        day.startOf("day").toUTC().toISO()!,
      ) as { start_at: string; end_at: string }[];
    for (
      let minute = hours.opens;
      minute + q.duration + q.buffer <= hours.closes;
      minute += policy.slotInterval
    ) {
      const start = day.startOf("day").plus({ minutes: minute });
      const end = start.plus({ minutes: q.duration });
      const busy = end.plus({ minutes: q.buffer });
      if (start < now.plus({ minutes: policy.minimumNoticeMinutes })) continue;
      if (
        occupied.some(
          (o) =>
            DateTime.fromISO(o.start_at) < busy &&
            DateTime.fromISO(o.end_at) > start,
        )
      )
        continue;
      slots.push({
        start: start.toUTC().toISO()!,
        end: end.toUTC().toISO()!,
        professionalId: pro.id,
        price: q.price,
        duration: q.duration,
      });
    }
  }
  return slots.sort(
    (a, b) => a.start.localeCompare(b.start) || a.price - b.price,
  );
}
export function appointmentsFor(user: User) {
  const rows = db()
    .prepare(
      `SELECT a.*,u.name AS client_name FROM appointments a JOIN users u ON u.id=a.client_id ${user.role === "client" ? "WHERE a.client_id=?" : ""} ORDER BY a.start_at`,
    )
    .all(...(user.role === "client" ? [user.id] : [])) as Appointment[];
  return rows.map((row) => ({ ...row }));
}
export function recordEvent(actor: string, id: string, event: string) {
  const now = new Date().toISOString();
  db()
    .prepare("INSERT INTO audit VALUES(?,?,?,?,?)")
    .run(randomUUID(), actor, id, event, now);
  db()
    .prepare("INSERT INTO outbox VALUES(?,?,?,?,?,?)")
    .run(
      randomUUID(),
      id,
      event,
      JSON.stringify({ appointmentId: id }),
      "pending",
      now,
    );
}
export function book(
  user: User,
  input: {
    serviceId: string;
    professionalId: string;
    start: string;
    addonIds: string[];
    acknowledged: boolean;
    intake: string;
  },
  rescheduleId?: string,
  actorId = user.id,
) {
  if (!input.acknowledged)
    throw new Error("Please acknowledge the booking policy.");
  return transaction(() => {
    let old: Appointment | undefined;
    if (rescheduleId) {
      old = db()
        .prepare("SELECT * FROM appointments WHERE id=?")
        .get(rescheduleId) as Appointment | undefined;
      if (!old || (user.role === "client" && old.client_id !== user.id))
        throw new Error("Appointment not found.");
      if (old.status !== "confirmed")
        throw new Error("Only confirmed appointments can be moved.");
      checkCancellation(user, old);
    }
    const date = DateTime.fromISO(input.start)
      .setZone(studio.timezone)
      .toISODate();
    if (!date) throw new Error("Invalid time.");
    const slot = availableSlots(
      input.serviceId,
      input.professionalId,
      date,
      input.addonIds,
      rescheduleId,
    ).find(
      (s) =>
        s.start === input.start && s.professionalId === input.professionalId,
    );
    if (!slot)
      throw new Error(
        "That time is no longer available. Please choose another.",
      );
    const q = quote(input.serviceId, input.professionalId, input.addonIds);
    const id = rescheduleId ?? randomUUID();
    const now = new Date().toISOString();
    const busy = DateTime.fromISO(slot.end)
      .plus({ minutes: q.buffer })
      .toUTC()
      .toISO()!;
    if (old)
      db()
        .prepare(
          "UPDATE appointments SET professional_id=?,service_id=?,start_at=?,end_at=?,busy_until=?,price=?,addons=? WHERE id=?",
        )
        .run(
          input.professionalId,
          input.serviceId,
          slot.start,
          slot.end,
          busy,
          q.price,
          JSON.stringify(input.addonIds),
          id,
        );
    else
      db()
        .prepare("INSERT INTO appointments VALUES(?,?,?,?,?,?,?,?,?,?,?)")
        .run(
          id,
          user.id,
          input.professionalId,
          input.serviceId,
          slot.start,
          slot.end,
          busy,
          q.price,
          "confirmed",
          JSON.stringify(input.addonIds),
          now,
        );
    db()
      .prepare("INSERT INTO form_responses VALUES(?,?,?,?,?,?,?)")
      .run(
        randomUUID(),
        id,
        old?.client_id ?? user.id,
        "booking-intake",
        policy.version,
        JSON.stringify({ acknowledged: true, intake: input.intake }),
        now,
      );
    recordEvent(actorId, id, old ? "reschedule" : "confirmation");
    return id;
  });
}
export function checkCancellation(user: User, a: Appointment) {
  if (
    user.role === "client" &&
    DateTime.fromISO(a.start_at).diffNow("hours").hours <
      policy.cancellationHours
  )
    throw new Error(
      "Online changes close 24 hours before your visit. Please contact the studio.",
    );
}
export function changeStatus(
  user: User,
  id: string,
  status: "cancelled" | "completed" | "no_show",
) {
  transaction(() => {
    const a = db().prepare("SELECT * FROM appointments WHERE id=?").get(id) as
      Appointment | undefined;
    if (!a || (user.role === "client" && a.client_id !== user.id))
      throw new Error("Appointment not found.");
    if (user.role === "client" && status !== "cancelled")
      throw new Error("Staff access required.");
    if (a.status !== "confirmed")
      throw new Error("This appointment is already closed.");
    if (status === "cancelled") checkCancellation(user, a);
    if (status !== "cancelled" && DateTime.fromISO(a.start_at) > DateTime.now())
      throw new Error("This appointment has not started yet.");
    db().prepare("UPDATE appointments SET status=? WHERE id=?").run(status, id);
    recordEvent(user.id, id, status === "cancelled" ? "cancellation" : status);
  });
}
