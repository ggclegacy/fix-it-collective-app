import { z } from "zod";
import { randomUUID } from "node:crypto";
import { requireUser } from "@/lib/auth";
import { endpoint, sameOrigin } from "@/lib/http";
import { db, transaction } from "@/lib/db";
import { assertManage } from "@/lib/booking-rules";
import {
  assertOwner,
  assertClient,
  auditBusiness,
  scopes,
} from "@/lib/business/access";
import {
  createOrder,
  collectCash,
  voidOrder,
  saveProduct,
  moveStock,
} from "@/lib/business/commerce";
import {
  saveRelationship,
  saveServiceNote,
  saveSoap,
} from "@/lib/business/records";
import { commandSearch, refreshGrowth } from "@/lib/business/intelligence";
export async function GET(request: Request) {
  return endpoint(async () => {
    const user = await requireUser(true),
      url = new URL(request.url);
    return {
      results: commandSearch(
        user,
        url.searchParams.get("q") ?? "",
        url.searchParams.get("context") ?? undefined,
      ),
    };
  });
}
export async function POST(request: Request) {
  return endpoint(async () => {
    sameOrigin(request);
    const user = await requireUser(true);
    const raw = z
      .object({ action: z.string(), data: z.unknown() })
      .parse(await request.json());
    switch (raw.action) {
      case "product":
        return { id: saveProduct(user, raw.data) };
      case "stock":
        return { id: moveStock(user, raw.data) };
      case "order":
        return { id: createOrder(user, raw.data) };
      case "cash": {
        const d = z
          .object({
            orderId: z.string(),
            eventKey: z.string().uuid(),
            amount: z.number().int().min(0),
          })
          .parse(raw.data);
        collectCash(user, d.orderId, d.eventKey, d.amount);
        return { ok: true };
      }
      case "void": {
        const d = z.object({ id: z.string() }).parse(raw.data);
        voidOrder(user, d.id);
        return { ok: true };
      }
      case "relationship":
        saveRelationship(user, raw.data);
        return { ok: true };
      case "service_note": {
        const d = z
          .object({ id: z.string(), note: z.unknown() })
          .parse(raw.data);
        saveServiceNote(user, d.id, d.note);
        return { ok: true };
      }
      case "soap": {
        const d = z
          .object({
            id: z.string(),
            revision: z.number().int(),
            note: z.unknown(),
          })
          .parse(raw.data);
        return { revision: saveSoap(user, d.id, d.revision, d.note) };
      }
      case "growth_refresh": {
        const d = z.object({ context: z.string().optional() }).parse(raw.data);
        return { opportunities: refreshGrowth(user, d.context) };
      }
      case "dismiss": {
        const d = z.object({ id: z.string() }).parse(raw.data);
        const o = db()
          .prepare(
            "SELECT professional_id FROM growth_opportunities WHERE id=?",
          )
          .get(d.id) as { professional_id: string } | undefined;
        if (!o) throw new Error("Opportunity not found.");
        assertManage(user, o.professional_id);
        db()
          .prepare(
            "UPDATE growth_opportunities SET status='dismissed' WHERE id=?",
          )
          .run(d.id);
        auditBusiness(user, "opportunity", d.id, "dismissed");
        return { ok: true };
      }
      case "task": {
        const d = z
          .object({
            professionalId: z.string(),
            title: z.string().trim().min(1).max(240),
            dueDate: z.iso.date().nullable(),
          })
          .parse(raw.data);
        assertManage(user, d.professionalId);
        const id = randomUUID();
        db()
          .prepare(
            "INSERT INTO business_tasks(id,professional_id,title,due_date,actor_id,created_at) VALUES(?,?,?,?,?,?)",
          )
          .run(
            id,
            d.professionalId,
            d.title,
            d.dueDate,
            user.id,
            new Date().toISOString(),
          );
        auditBusiness(user, "task", id, "created");
        return { id };
      }
      case "task_done": {
        const d = z.object({ id: z.string() }).parse(raw.data);
        const t = db()
          .prepare("SELECT professional_id FROM business_tasks WHERE id=?")
          .get(d.id) as { professional_id: string } | undefined;
        if (!t) throw new Error("Task not found.");
        assertManage(user, t.professional_id);
        db()
          .prepare("UPDATE business_tasks SET status='done' WHERE id=?")
          .run(d.id);
        auditBusiness(user, "task", d.id, "completed");
        return { ok: true };
      }
      case "goal": {
        const d = z
          .object({
            professionalId: z.string(),
            amount: z.number().int().min(1).max(100000000),
          })
          .parse(raw.data);
        assertManage(user, d.professionalId);
        db()
          .prepare(
            "INSERT INTO business_goals VALUES(?,?) ON CONFLICT(professional_id) DO UPDATE SET monthly_revenue=excluded.monthly_revenue",
          )
          .run(d.professionalId, d.amount);
        auditBusiness(user, "goal", d.professionalId, "updated");
        return { ok: true };
      }
      case "message_draft": {
        const d = z
          .object({
            clientId: z.string(),
            professionalId: z.string(),
            body: z.string().trim().min(1).max(3000),
            channel: z.enum(["email", "sms"]),
          })
          .parse(raw.data);
        assertClient(user, d.clientId, d.professionalId);
        const id = randomUUID();
        db()
          .prepare(
            "INSERT INTO messages(id,client_id,professional_id,channel,body,created_at) VALUES(?,?,?,?,?,?)",
          )
          .run(
            id,
            d.clientId,
            d.professionalId,
            d.channel,
            d.body,
            new Date().toISOString(),
          );
        auditBusiness(user, "message", id, "draft_saved");
        return { id };
      }
      case "review_draft": {
        const d = z.object({ appointmentId: z.string() }).parse(raw.data);
        const a = db()
          .prepare(
            "SELECT professional_id FROM appointments WHERE id=? AND status='completed'",
          )
          .get(d.appointmentId) as { professional_id: string } | undefined;
        if (!a)
          throw new Error(
            "Complete the visit before preparing a review request.",
          );
        assertManage(user, a.professional_id);
        db()
          .prepare(
            "INSERT OR IGNORE INTO review_requests(id,appointment_id,created_at) VALUES(?,?,?)",
          )
          .run(randomUUID(), d.appointmentId, new Date().toISOString());
        auditBusiness(user, "review", d.appointmentId, "draft_prepared");
        refreshGrowth(user);
        return { ok: true };
      }
      case "source": {
        const d = z
          .object({ id: z.string(), source: z.string().trim().min(1).max(100) })
          .parse(raw.data);
        const a = db()
          .prepare("SELECT professional_id FROM appointments WHERE id=?")
          .get(d.id) as { professional_id: string } | undefined;
        if (!a) throw new Error("Appointment not found.");
        assertManage(user, a.professional_id);
        db()
          .prepare(
            "INSERT INTO appointment_sources VALUES(?,?) ON CONFLICT(appointment_id) DO UPDATE SET source=excluded.source",
          )
          .run(d.id, d.source);
        auditBusiness(user, "appointment", d.id, "source_updated");
        return { ok: true };
      }
      case "team": {
        assertOwner(user);
        const d = z
          .object({
            userId: z.string(),
            role: z.enum(["admin", "provider", "front_desk"]),
            professionalId: z.enum(["pro-a", "pro-b"]),
            clinical: z.boolean(),
          })
          .parse(raw.data);
        if (d.role === "front_desk" && d.clinical)
          throw new Error("Front desk cannot access clinical records.");
        return transaction(() => {
          const member = db()
            .prepare("SELECT id FROM users WHERE id=? AND role='staff'")
            .get(d.userId);
          if (!member) throw new Error("Select an existing staff account.");
          db()
            .prepare(
              "INSERT INTO team_roles VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET role=excluded.role,clinical=excluded.clinical",
            )
            .run(d.userId, d.role, d.clinical ? 1 : 0);
          db()
            .prepare(
              "INSERT INTO staff_assignments VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET professional_id=excluded.professional_id",
            )
            .run(d.userId, d.professionalId);
          auditBusiness(user, "team", d.userId, "permissions_updated");
          return { ok: true };
        });
      }
      case "resource": {
        assertOwner(user);
        const d = z
          .object({
            name: z.string().trim().min(1).max(120),
            providerIds: z
              .array(z.enum(["pro-a", "pro-b"]))
              .min(1)
              .max(2),
          })
          .parse(raw.data);
        return transaction(() => {
          const id = randomUUID();
          db()
            .prepare("INSERT INTO resources VALUES(?,?,?)")
            .run(id, "main", d.name);
          for (const p of new Set(d.providerIds))
            db()
              .prepare("INSERT INTO provider_resources VALUES(?,?)")
              .run(p, id);
          if (
            db()
              .prepare(
                "SELECT 1 FROM appointments a JOIN appointments b ON a.id<>b.id AND a.start_at<b.busy_until AND a.busy_until>b.start_at JOIN provider_resources x ON x.professional_id=a.professional_id JOIN provider_resources y ON y.professional_id=b.professional_id AND x.resource_id=y.resource_id WHERE x.resource_id=? AND a.status='confirmed' AND b.status='confirmed' LIMIT 1",
              )
              .get(id)
          )
            throw new Error(
              "Existing bookings overlap in this shared room. Resolve them before assigning it.",
            );
          auditBusiness(user, "resource", id, "created");
          return { id };
        });
      }
      default:
        scopes(user);
        throw new Error("Unknown business action.");
    }
  });
}
