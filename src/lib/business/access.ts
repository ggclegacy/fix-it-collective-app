import { db } from "../db";
import { canManage } from "../booking-rules";
import { professionals } from "../catalog";
import type { User } from "../types";
import { randomUUID } from "node:crypto";
export type Context = "collective" | "katie" | "kamilla";
export function teamRole(user: User) {
  return db()
    .prepare("SELECT role,clinical FROM team_roles WHERE user_id=?")
    .get(user.id) as { role: string; clinical: number } | undefined;
}
export function assertStaff(user: User) {
  if (!["owner", "staff"].includes(user.role))
    throw new Error("Staff access required.");
}
export function assertOwner(user: User) {
  if (user.role !== "owner") throw new Error("Staff access: owner required.");
}
export function scopes(user: User, context?: string) {
  assertStaff(user);
  if (context && !["collective", "katie", "kamilla"].includes(context))
    throw new Error("Invalid workspace.");
  const allowed = professionals
    .filter((p) => canManage(user, p.id))
    .map((p) => p.id);
  if (!context || context === "collective") return allowed;
  const id = context === "katie" ? "pro-a" : "pro-b";
  if (!allowed.includes(id))
    throw new Error("Staff access to this workspace is restricted.");
  return [id];
}
export function assertClient(user: User, id: string, provider?: string) {
  assertStaff(user);
  const c = db()
    .prepare("SELECT id FROM users WHERE id=? AND role='client'")
    .get(id);
  if (!c || (provider && !canManage(user, provider)))
    throw new Error("Client access denied.");
  if (user.role === "owner") return;
  const ids = scopes(user);
  if (
    !db()
      .prepare(
        `SELECT 1 FROM appointments WHERE client_id=? AND professional_id IN (${ids.map(() => "?").join(",") || "''"}) LIMIT 1`,
      )
      .get(id, ...ids)
  )
    throw new Error("Client access denied.");
}
export function auditBusiness(
  user: User | string,
  entity: string,
  id: string,
  event: string,
) {
  db()
    .prepare("INSERT INTO business_audit VALUES(?,?,?,?,?,?)")
    .run(
      randomUUID(),
      typeof user === "string" ? user : user.id,
      entity,
      id,
      event,
      new Date().toISOString(),
    );
}
