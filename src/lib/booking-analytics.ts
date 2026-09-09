import { DateTime } from "luxon";
import { db } from "./db";
import { appointmentsFor } from "./scheduling";
import { canManage } from "./booking-rules";
import { professionals } from "./catalog";
import type { User } from "./types";
export function bookingAnalytics(user: User, start: DateTime, end: DateTime) {
  const appointments = appointmentsFor(user).filter(
    (a) =>
      DateTime.fromISO(a.start_at) >= start &&
      DateTime.fromISO(a.start_at) <= end,
  );
  let capacity = 0;
  for (let day = start.startOf("day"); day <= end; day = day.plus({ days: 1 }))
    for (const p of professionals.filter((p) => canManage(user, p.id))) {
      const hours = db()
        .prepare(
          "SELECT opens,closes FROM working_hours WHERE professional_id=? AND weekday=?",
        )
        .get(p.id, day.weekday) as
        { opens: number; closes: number } | undefined;
      if (!hours) continue;
      const opening = day.plus({ minutes: hours.opens }).toMillis(),
        closing = day.plus({ minutes: hours.closes }).toMillis();
      const intervals = (
        db()
          .prepare(
            "SELECT start_at,end_at FROM blocks WHERE professional_id=? AND start_at<? AND end_at>? ORDER BY start_at",
          )
          .all(
            p.id,
            new Date(closing).toISOString(),
            new Date(opening).toISOString(),
          ) as { start_at: string; end_at: string }[]
      ).map((b) => [
        Math.max(opening, Date.parse(b.start_at)),
        Math.min(closing, Date.parse(b.end_at)),
      ]);
      let blocked = 0,
        cursor = opening;
      for (const [s, e] of intervals) {
        if (e > cursor) {
          blocked += Math.max(0, e - Math.max(s, cursor));
          cursor = e;
        }
      }
      capacity += (closing - opening - blocked) / 60000;
    }
  const occupied = appointments
    .filter((a) => a.status === "confirmed" || a.status === "completed")
    .reduce(
      (n, a) =>
        n +
        DateTime.fromISO(a.busy_until).diff(
          DateTime.fromISO(a.start_at),
          "minutes",
        ).minutes,
      0,
    );
  const revenue = appointments.reduce((n, a) => n + (a.paid ?? 0), 0);
  return {
    capacity,
    occupied,
    utilization: capacity ? Math.round((occupied / capacity) * 100) : null,
    revenue,
  };
}
