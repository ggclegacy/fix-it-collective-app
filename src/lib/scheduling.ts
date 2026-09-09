import {
  bookingQuote as quote,
  rules,
  canManage,
  assertManage,
  settings,
} from "./booking-rules";
import { intakeReference } from "./booking-intake";
import { DateTime } from "luxon";
import { db, transaction } from "./db";
import { policy, professionals, studio } from "./catalog";
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
        .plus({ days: rules(serviceId).horizon_days })
        .endOf("day")
  )
    return [];
  const eligible = professionals.filter(
    (p) =>
      (professionalId === "any" || p.id === professionalId) &&
      p.services.includes(serviceId),
  );
  const slots: Slot[] = [];
  const business = settings();
  if (
    serviceId === "massage" &&
    (!business.therapist_name ||
      !business.therapist_license ||
      !business.establishment_name ||
      !business.establishment_license)
  )
    return slots;
  for (const pro of eligible) {
    let q;
    try {
      q = quote(serviceId, pro.id, addonIds);
    } catch {
      continue;
    }
    if (excludeId) {
      const prior = db()
        .prepare(
          "SELECT * FROM appointments WHERE id=? AND service_id=? AND professional_id=?",
        )
        .get(excludeId, serviceId, pro.id) as Appointment | undefined;
      if (prior)
        q = {
          ...q,
          duration: DateTime.fromISO(prior.end_at).diff(
            DateTime.fromISO(prior.start_at),
            "minutes",
          ).minutes,
          buffer: DateTime.fromISO(prior.busy_until).diff(
            DateTime.fromISO(prior.end_at),
            "minutes",
          ).minutes,
          price: prior.price,
        };
    }
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
    occupied.push(
      ...(db()
        .prepare(
          "SELECT a.start_at,a.busy_until AS end_at FROM appointments a JOIN provider_resources r ON r.professional_id=a.professional_id JOIN provider_resources n ON n.resource_id=r.resource_id WHERE n.professional_id=? AND a.status='confirmed' AND a.id<>? AND a.start_at<? AND a.busy_until>?",
        )
        .all(
          pro.id,
          excludeId ?? "",
          day.endOf("day").toUTC().toISO()!,
          day.startOf("day").toUTC().toISO()!,
        ) as { start_at: string; end_at: string }[]),
    );
    for (
      let minute = hours.opens;
      minute + q.duration + q.buffer <= hours.closes;
      minute += policy.slotInterval
    ) {
      const start = day.startOf("day").plus({ minutes: minute });
      const end = start.plus({ minutes: q.duration });
      const busy = end.plus({ minutes: q.buffer });
      if (start < now.plus({ minutes: q.rules.lead_minutes })) continue;
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
      `SELECT a.*,u.name AS client_name,d.stage,d.deposit,d.paid,d.payment_status,d.intake_id FROM appointments a JOIN users u ON u.id=a.client_id LEFT JOIN booking_details d ON d.appointment_id=a.id ${user.role === "client" ? "WHERE a.client_id=?" : ""} ORDER BY a.start_at`,
    )
    .all(...(user.role === "client" ? [user.id] : [])) as Appointment[];
  return rows
    .filter(
      (row) => user.role === "client" || canManage(user, row.professional_id),
    )
    .map((row) => ({ ...row }));
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
    requestKey?: string;
    healthUnchanged?: boolean;
    intakeRevision?: number;
    healthConsent?: boolean;
  },
  rescheduleId?: string,
  actorId = user.id,
) {
  if (!input.acknowledged)
    throw new Error("Please acknowledge the booking policy.");
  return transaction(() => {
    if (input.requestKey && !rescheduleId) {
      const previous = db()
        .prepare(
          "SELECT a.id,a.client_id FROM booking_details d JOIN appointments a ON a.id=d.appointment_id WHERE request_key=?",
        )
        .get(input.requestKey) as { id: string; client_id: string } | undefined;
      if (previous) {
        if (previous.client_id !== user.id)
          throw new Error("Invalid booking request.");
        return previous.id;
      }
    }
    let old: Appointment | undefined;
    if (rescheduleId) {
      old = db()
        .prepare("SELECT * FROM appointments WHERE id=?")
        .get(rescheduleId) as Appointment | undefined;
      if (!old || (user.role === "client" && old.client_id !== user.id))
        throw new Error("Appointment not found.");
      if (user.role !== "client") assertManage(user, old.professional_id);
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
    if (user.role !== "client") assertManage(user, input.professionalId);
    if (
      old &&
      (old.service_id !== input.serviceId ||
        old.professional_id !== input.professionalId)
    )
      throw new Error(
        "Reschedule the same service and professional. Contact the studio to change the service.",
      );
    if (
      old &&
      JSON.stringify([...input.addonIds].sort()) !==
        JSON.stringify((JSON.parse(old.addons) as string[]).sort())
    )
      throw new Error(
        "Keep the original add-ons when rescheduling. Contact the studio to change your service.",
      );
    let q = quote(input.serviceId, input.professionalId, input.addonIds);
    if (old)
      q = {
        ...q,
        price: old.price,
        duration: DateTime.fromISO(old.end_at).diff(
          DateTime.fromISO(old.start_at),
          "minutes",
        ).minutes,
        buffer: DateTime.fromISO(old.busy_until).diff(
          DateTime.fromISO(old.end_at),
          "minutes",
        ).minutes,
      };
    if (
      input.professionalId === "pro-b" &&
      (!settings().therapist_name ||
        !settings().therapist_license ||
        !settings().establishment_name ||
        !settings().establishment_license)
    )
      throw new Error("Massage booking is awaiting license information.");
    if (!old && (q.rules.deposit > 0 || q.rules.card_required))
      throw new Error(
        "Online payment setup is pending. Contact the studio to arrange this visit. No charge has been made.",
      );
    let intakeId: string | null = null;
    if (input.professionalId === "pro-b" && !old) {
      if (!input.healthUnchanged)
        throw new Error(
          "Confirm your health information is current or update your intake.",
        );
      intakeId = intakeReference(user, input.intakeRevision);
    }
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
    if (!old)
      db()
        .prepare(
          "INSERT INTO booking_details(appointment_id,deposit,cancellation_hours,intake_id,request_key,policy_snapshot) VALUES(?,?,?,?,?,?)",
        )
        .run(
          id,
          q.rules.deposit,
          q.rules.cancellation_hours,
          intakeId,
          input.requestKey ?? null,
          JSON.stringify(q.rules),
        );
    if (input.professionalId !== "pro-b")
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
    if (old)
      db()
        .prepare(
          "UPDATE notification_jobs SET status='superseded' WHERE appointment_id=? AND status='pending'",
        )
        .run(id);
    for (const [event, offset] of [
      ["reminder", 24],
      ["intake_reminder", 48],
    ] as const) {
      const due = DateTime.fromISO(slot.start).minus({ hours: offset });
      if (
        due > DateTime.now() &&
        (event !== "intake_reminder" ||
          (input.professionalId === "pro-b" && !intakeId))
      )
        db()
          .prepare(
            "INSERT INTO notification_jobs(id,appointment_id,event,due_at) VALUES(?,?,?,?)",
          )
          .run(randomUUID(), id, event, due.toUTC().toISO()!);
    }
    if (!old)
      db()
        .prepare("INSERT INTO appointment_sources VALUES(?,?)")
        .run(id, actorId === user.id ? "online" : "staff");
    recordEvent(actorId, id, old ? "reschedule" : "confirmation");
    return id;
  });
}
export function checkCancellation(user: User, a: Appointment) {
  if (
    user.role === "client" &&
    DateTime.fromISO(a.start_at).diffNow("hours").hours <
      ((
        db()
          .prepare(
            "SELECT cancellation_hours FROM booking_details WHERE appointment_id=?",
          )
          .get(a.id) as { cancellation_hours: number } | undefined
      )?.cancellation_hours ?? rules(a.service_id).cancellation_hours)
  )
    throw new Error(
      "The online change window has closed. Please contact the studio.",
    );
}
export function changeStatus(
  user: User,
  id: string,
  status:
    | "requested"
    | "checked_out"
    | "late_cancel"
    | "booked"
    | "confirmed"
    | "checked_in"
    | "in_service"
    | "cancelled"
    | "completed"
    | "no_show",
) {
  transaction(() => {
    const a = db().prepare("SELECT * FROM appointments WHERE id=?").get(id) as
      Appointment | undefined;
    if (!a || (user.role === "client" && a.client_id !== user.id))
      throw new Error("Appointment not found.");
    if (user.role !== "client") assertManage(user, a.professional_id);
    if (user.role === "client" && status !== "cancelled")
      throw new Error("Staff access required.");
    if (
      a.status !== "confirmed" &&
      !(a.status === "completed" && status === "checked_out")
    )
      throw new Error("This appointment is already closed.");
    if (status === "cancelled") checkCancellation(user, a);
    if (
      ![
        "cancelled",
        "late_cancel",
        "requested",
        "booked",
        "confirmed",
      ].includes(status) &&
      DateTime.fromISO(a.start_at) > DateTime.now()
    )
      throw new Error("This appointment has not started yet.");
    const transitions: Record<string, string[]> = {
      requested: ["confirmed", "cancelled", "late_cancel"],
      booked: ["confirmed", "cancelled"],
      completed: ["checked_out"],
      confirmed: [
        "checked_in",
        "cancelled",
        "late_cancel",
        "completed",
        "no_show",
      ],
      checked_in: ["in_service", "cancelled", "late_cancel", "completed"],
      in_service: ["completed", "cancelled", "late_cancel"],
    };
    const detail = db()
      .prepare("SELECT stage FROM booking_details WHERE appointment_id=?")
      .get(id) as { stage: string } | undefined;
    if (!transitions[detail?.stage ?? a.status]?.includes(status))
      throw new Error("Invalid appointment status transition.");
    if (status === "checked_out") {
      const o = db()
        .prepare(
          "SELECT id FROM orders WHERE appointment_id=? AND status='paid'",
        )
        .get(id);
      if (!o)
        throw new Error(
          "Finish checkout and record payment before checking out.",
        );
    }
    db()
      .prepare(
        "INSERT OR IGNORE INTO booking_details(appointment_id,stage,cancellation_hours,policy_snapshot) VALUES(?,?,?,?)",
      )
      .run(id, a.status, rules(a.service_id).cancellation_hours, "{}");
    db()
      .prepare("UPDATE appointments SET status=? WHERE id=?")
      .run(
        [
          "requested",
          "booked",
          "confirmed",
          "checked_in",
          "in_service",
        ].includes(status)
          ? "confirmed"
          : status === "checked_out"
            ? "completed"
            : status === "late_cancel"
              ? "cancelled"
              : status,
        id,
      );
    db()
      .prepare("UPDATE booking_details SET stage=? WHERE appointment_id=?")
      .run(status, id);
    if (status === "cancelled" || status === "late_cancel") {
      db()
        .prepare(
          "UPDATE notification_jobs SET status='superseded' WHERE appointment_id=? AND status='pending'",
        )
        .run(id);
      const waiting = db()
        .prepare(
          "SELECT id FROM waitlist WHERE professional_id=? AND service_id=? AND date=? AND status='waiting'",
        )
        .all(
          a.professional_id,
          a.service_id,
          DateTime.fromISO(a.start_at).setZone(studio.timezone).toISODate()!,
        ) as { id: string }[];
      for (const w of waiting)
        db()
          .prepare(
            "INSERT INTO notification_jobs(id,waitlist_id,event,due_at) VALUES(?,?,'waitlist_opening',?)",
          )
          .run(randomUUID(), w.id, new Date().toISOString());
    }
    recordEvent(user.id, id, status === "cancelled" ? "cancellation" : status);
  });
}
