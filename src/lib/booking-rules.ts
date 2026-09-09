import { z } from "zod";
import { db } from "./db";
import { policy, quote, serviceById } from "./catalog";
import type { User } from "./types";
export const rulesSchema = z
  .object({
    service_id: z.string(),
    duration: z.number().int().min(5).max(480),
    buffer: z.number().int().min(0).max(120),
    price: z.number().int().min(0).max(1000000).nullable(),
    deposit: z.number().int().min(0),
    card_required: z.number().int().min(0).max(1),
    lead_minutes: z.number().int().min(0).max(43200),
    horizon_days: z.number().int().min(1).max(365),
    cancellation_hours: z.number().int().min(0).max(168),
    enabled: z.number().int().min(0).max(1),
  })
  .refine(
    (r) => !r.enabled || (r.price !== null && r.deposit <= r.price),
    "Set a price and a deposit no greater than the price before enabling.",
  );
export type ServiceRules = z.infer<typeof rulesSchema>;
export function rules(id: string): ServiceRules {
  const s = serviceById(id);
  const row = db()
    .prepare("SELECT * FROM service_rules WHERE service_id=?")
    .get(id);
  return row
    ? rulesSchema.parse(row)
    : {
        service_id: id,
        duration: s.duration,
        buffer: s.buffer,
        price: null,
        deposit: 0,
        card_required: 0,
        lead_minutes: policy.minimumNoticeMinutes,
        horizon_days: policy.horizonDays,
        cancellation_hours: policy.cancellationHours,
        enabled: 0,
      };
}
export function bookingQuote(
  service: string,
  professional: string,
  addons: string[],
) {
  const base = quote(service, professional, addons),
    r = rules(service),
    s = serviceById(service);
  const preview =
    process.env.NODE_ENV === "development" || process.env.SEED_DEMO === "true";
  if (
    !r.enabled &&
    !(
      preview &&
      service !== "massage" &&
      !db()
        .prepare("SELECT 1 FROM service_rules WHERE service_id=?")
        .get(service)
    )
  )
    throw new Error("Appointments for this service are not yet open.");
  return {
    ...base,
    duration: r.duration + base.duration - s.duration,
    buffer: r.buffer,
    price:
      r.price === null
        ? base.price
        : r.price + base.price - quote(service, professional, []).price,
    rules: r,
  };
}
export function canManage(user: User, professional: string) {
  const role = db()
    .prepare("SELECT role FROM team_roles WHERE user_id=?")
    .get(user.id) as { role: string } | undefined;
  return (
    user.role === "owner" ||
    (user.role === "staff" && role?.role === "admin") ||
    (user.role === "staff" &&
      Boolean(
        db()
          .prepare(
            "SELECT 1 FROM staff_assignments WHERE user_id=? AND professional_id=?",
          )
          .get(user.id, professional),
      ))
  );
}
export function assertManage(user: User, professional: string) {
  if (!canManage(user, professional))
    throw new Error(
      "This calendar is restricted to its assigned professional.",
    );
}
export function settings() {
  return Object.fromEntries(
    (
      db().prepare("SELECT id,value FROM business_settings").all() as {
        id: string;
        value: string;
      }[]
    ).map((r) => [r.id, r.value]),
  );
}
