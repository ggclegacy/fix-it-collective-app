import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { endpoint, sameOrigin } from "@/lib/http";
import { db, transaction } from "@/lib/db";
import { services, serviceById } from "@/lib/catalog";
import {
  rules,
  rulesSchema,
  settings,
  assertManage,
} from "@/lib/booking-rules";
export async function GET() {
  return endpoint(async () => ({
    services: services.map((s) => ({ ...s, ...rules(s.id) })),
    settings: settings(),
  }));
}
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("service"), rules: rulesSchema }),
  z.object({
    action: z.literal("business"),
    therapist_name: z.string().trim().max(150),
    therapist_license: z.string().trim().max(60),
    establishment_name: z.string().trim().max(150),
    establishment_license: z.string().trim().max(60),
    address: z.string().trim().max(300),
  }),
  z.object({
    action: z.literal("assign"),
    userId: z.string(),
    professionalId: z.enum(["pro-a", "pro-b"]),
  }),
]);
export async function POST(request: Request) {
  return endpoint(async () => {
    sameOrigin(request);
    const u = await requireUser(true),
      v = schema.parse(await request.json());
    if (v.action === "service") {
      serviceById(v.rules.service_id);
      assertManage(u, v.rules.service_id === "massage" ? "pro-b" : "pro-a");
      const r = v.rules;
      db()
        .prepare(
          "INSERT INTO service_rules VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(service_id) DO UPDATE SET duration=excluded.duration,buffer=excluded.buffer,price=excluded.price,deposit=excluded.deposit,card_required=excluded.card_required,lead_minutes=excluded.lead_minutes,horizon_days=excluded.horizon_days,cancellation_hours=excluded.cancellation_hours,enabled=excluded.enabled",
        )
        .run(
          r.service_id,
          r.duration,
          r.buffer,
          r.price,
          r.deposit,
          r.card_required,
          r.lead_minutes,
          r.horizon_days,
          r.cancellation_hours,
          r.enabled,
        );
    } else {
      if (u.role !== "owner") throw new Error("Owner access required.");
      if (v.action === "assign") {
        if (
          !db()
            .prepare("SELECT 1 FROM users WHERE id=? AND role='staff'")
            .get(v.userId)
        )
          throw new Error("Choose a staff account.");
        db()
          .prepare(
            "INSERT INTO staff_assignments VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET professional_id=excluded.professional_id",
          )
          .run(v.userId, v.professionalId);
      } else
        transaction(() => {
          for (const [k, value] of Object.entries(v))
            if (k !== "action")
              db()
                .prepare(
                  "INSERT INTO business_settings VALUES(?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value",
                )
                .run(k, value);
        });
    }
    return { ok: true };
  });
}
