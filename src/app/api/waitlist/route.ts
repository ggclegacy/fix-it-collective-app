import { z } from "zod";
import { DateTime } from "luxon";
import { randomUUID } from "node:crypto";
import { requireUser } from "@/lib/auth";
import { endpoint, sameOrigin } from "@/lib/http";
import { db } from "@/lib/db";
import { professionals, studio } from "@/lib/catalog";
import { canManage, assertManage } from "@/lib/booking-rules";
export async function GET() {
  return endpoint(async () => {
    const u = await requireUser();
    const rows = db()
      .prepare(
        "SELECT w.*,u.name AS client_name FROM waitlist w JOIN users u ON u.id=w.client_id ORDER BY w.date",
      )
      .all() as { client_id: string; professional_id: string }[];
    return {
      entries: rows.filter((r) =>
        u.role === "client"
          ? r.client_id === u.id
          : canManage(u, r.professional_id),
      ),
    };
  });
}
export async function POST(request: Request) {
  return endpoint(async () => {
    sameOrigin(request);
    const u = await requireUser();
    const v = z
      .object({
        professionalId: z.enum(["pro-a", "pro-b"]),
        serviceId: z.string(),
        date: z.iso.date(),
      })
      .parse(await request.json());
    if (
      !professionals
        .find((p) => p.id === v.professionalId)
        ?.services.includes(v.serviceId)
    )
      throw new Error("Choose a service from this professional.");
    if (v.date < DateTime.now().setZone(studio.timezone).toISODate()!)
      throw new Error("Choose a future date.");
    db()
      .prepare(
        "INSERT INTO waitlist VALUES(?,?,?,?,?,'waiting',?) ON CONFLICT(client_id,professional_id,service_id,date) DO UPDATE SET status='waiting'",
      )
      .run(
        randomUUID(),
        u.id,
        v.professionalId,
        v.serviceId,
        v.date,
        new Date().toISOString(),
      );
    return { ok: true };
  });
}
export async function PATCH(request: Request) {
  return endpoint(async () => {
    sameOrigin(request);
    const u = await requireUser();
    const v = z
      .object({
        id: z.string(),
        status: z.enum(["removed", "offered", "booked"]),
      })
      .parse(await request.json());
    const row = db().prepare("SELECT * FROM waitlist WHERE id=?").get(v.id) as
      { client_id: string; professional_id: string } | undefined;
    if (!row) throw new Error("Entry not found.");
    if (u.role === "client") {
      if (row.client_id !== u.id || v.status !== "removed")
        throw new Error("Access denied.");
    } else assertManage(u, row.professional_id);
    db().prepare("UPDATE waitlist SET status=? WHERE id=?").run(v.status, v.id);
    return { ok: true };
  });
}
