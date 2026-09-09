import { randomUUID, createHash } from "node:crypto";
import { z } from "zod";
import { db, transaction } from "../db";
import { assertManage } from "../booking-rules";
import {
  assertClient,
  assertOwner,
  assertStaff,
  auditBusiness,
  scopes,
} from "./access";
import type { User, Appointment } from "../types";
const cents = z.number().int().min(0).max(10000000);
export const productSchema = z.object({
  sku: z.string().trim().min(1).max(60),
  name: z.string().trim().min(1).max(160),
  brand: z.string().trim().max(100),
  price: cents,
  tax_bps: z.number().int().min(0).max(2500),
  low_stock: z.number().int().min(0).max(10000),
  replenish_days: z.number().int().min(1).max(365).nullable(),
});
export type Product = {
  id: string;
  sku: string;
  name: string;
  brand: string;
  price: number;
  tax_bps: number;
  low_stock: number;
  replenish_days: number | null;
  stock: number;
  active: number;
};
export function products(user: User) {
  assertStaff(user);
  return (
    db()
      .prepare(
        "SELECT p.*,COALESCE(SUM(m.quantity),0) AS stock FROM products p LEFT JOIN inventory_movements m ON m.product_id=p.id GROUP BY p.id ORDER BY p.name",
      )
      .all() as Product[]
  ).map((r) => ({ ...r }));
}
export function saveProduct(user: User, input: unknown) {
  assertOwner(user);
  const p = productSchema.parse(input),
    id = randomUUID();
  return transaction(() => {
    db()
      .prepare(
        "INSERT INTO products(id,sku,name,brand,price,tax_bps,low_stock,replenish_days) VALUES(?,?,?,?,?,?,?,?)",
      )
      .run(
        id,
        p.sku,
        p.name,
        p.brand,
        p.price,
        p.tax_bps,
        p.low_stock,
        p.replenish_days,
      );
    auditBusiness(user, "product", id, "created");
    return id;
  });
}
export const movementSchema = z.object({
  productId: z.string(),
  quantity: z
    .number()
    .int()
    .min(-10000)
    .max(10000)
    .refine((x) => x !== 0),
  kind: z.enum(["received", "damage", "adjustment", "return"]),
  reason: z.string().trim().min(3).max(300),
  requestKey: z.string().uuid(),
});
export function moveStock(user: User, input: unknown) {
  assertOwner(user);
  const m = movementSchema.parse(input);
  if (
    ((m.kind === "received" || m.kind === "return") && m.quantity < 0) ||
    (m.kind === "damage" && m.quantity > 0)
  )
    throw new Error("Movement direction does not match its reason.");
  return transaction(() => {
    const old = db()
      .prepare("SELECT * FROM inventory_movements WHERE request_key=?")
      .get(m.requestKey) as
      | {
          product_id: string;
          quantity: number;
          kind: string;
          reason: string;
          id: string;
        }
      | undefined;
    if (old) {
      if (
        old.product_id !== m.productId ||
        old.quantity !== m.quantity ||
        old.kind !== m.kind ||
        old.reason !== m.reason
      )
        throw new Error("Request key already used for another movement.");
      return old.id;
    }
    const id = randomUUID();
    db()
      .prepare("INSERT INTO inventory_movements VALUES(?,?,?,?,?,?,?,?,?)")
      .run(
        id,
        m.productId,
        m.quantity,
        m.kind,
        null,
        m.reason,
        user.id,
        new Date().toISOString(),
        m.requestKey,
      );
    auditBusiness(user, "inventory", id, m.kind);
    return id;
  });
}
export const checkoutSchema = z.object({
  requestKey: z.string().uuid(),
  clientId: z.string(),
  professionalId: z.string(),
  appointmentId: z.string().nullable(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().min(1).max(100),
      }),
    )
    .max(50),
  discount: cents,
  tip: cents,
  serviceTaxBps: z.number().int().min(0).max(2500),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type Order = {
  id: string;
  request_key: string;
  client_id: string;
  professional_id: string;
  appointment_id: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  tip: number;
  total: number;
  status: string;
  created_at: string;
  client_name: string;
  paid: number;
  deposit: number;
};
export function orders(user: User, context?: string) {
  const ids = scopes(user, context);
  return (
    db()
      .prepare(
        `SELECT o.*,u.name client_name,COALESCE((SELECT SUM(amount) FROM order_payments p WHERE p.order_id=o.id),0) AS paid,COALESCE(d.paid,0) AS deposit FROM orders o JOIN users u ON u.id=o.client_id LEFT JOIN booking_details d ON d.appointment_id=o.appointment_id ORDER BY o.created_at DESC`,
      )
      .all() as Order[]
  )
    .filter((o) => ids.includes(o.professional_id))
    .map((o) => ({ ...o }));
}
export function createOrder(user: User, raw: unknown) {
  const input = checkoutSchema.parse(raw);
  assertManage(user, input.professionalId);
  assertClient(user, input.clientId, input.professionalId);
  return transaction(() => {
    const hash = createHash("sha256")
      .update(JSON.stringify(input))
      .digest("hex");
    const prior = db()
      .prepare("SELECT id,request_hash FROM orders WHERE request_key=?")
      .get(input.requestKey) as
      { id: string; request_hash: string } | undefined;
    if (prior) {
      if (prior.request_hash !== hash)
        throw new Error("Checkout key already used for a different order.");
      return prior.id;
    }
    const lines: {
      productId: string | null;
      serviceId: string | null;
      label: string;
      quantity: number;
      price: number;
      taxBps: number;
    }[] = [];
    if (input.appointmentId) {
      const a = db()
        .prepare("SELECT * FROM appointments WHERE id=?")
        .get(input.appointmentId) as Appointment | undefined;
      if (
        !a ||
        a.client_id !== input.clientId ||
        a.professional_id !== input.professionalId
      )
        throw new Error("Appointment does not match this checkout.");
      if (a.status !== "completed")
        throw new Error("Complete the service before checkout.");
      const label = db()
        .prepare("SELECT name FROM service_catalog WHERE id=?")
        .get(a.service_id) as { name: string };
      lines.push({
        productId: null,
        serviceId: a.service_id,
        label: label.name,
        quantity: 1,
        price: a.price,
        taxBps: input.serviceTaxBps,
      });
    }
    const unique = new Set<string>();
    for (const item of input.items) {
      if (unique.has(item.productId))
        throw new Error("Combine quantities for the same product.");
      unique.add(item.productId);
      const p = products(user).find((p) => p.id === item.productId && p.active);
      if (!p) throw new Error("Product unavailable.");
      if (p.stock < item.quantity)
        throw new Error(`Insufficient stock: ${p.name}.`);
      lines.push({
        productId: p.id,
        serviceId: null,
        label: p.name,
        quantity: item.quantity,
        price: p.price,
        taxBps: p.tax_bps,
      });
    }
    if (!lines.length) throw new Error("Add a service or product.");
    const subtotal = lines.reduce((n, l) => n + l.price * l.quantity, 0);
    if (input.discount > subtotal)
      throw new Error("Discount exceeds subtotal.");
    let remainingDiscount = input.discount;
    const calculated = lines.map((l, i) => {
      const gross = l.price * l.quantity,
        discount =
          i === lines.length - 1
            ? remainingDiscount
            : Math.floor(subtotal ? (input.discount * gross) / subtotal : 0);
      remainingDiscount -= discount;
      return {
        ...l,
        discount,
        tax: Math.round(((gross - discount) * l.taxBps) / 10000),
      };
    });
    const tax = calculated.reduce((n, l) => n + l.tax, 0),
      total = subtotal - input.discount + tax + input.tip;
    const deposit = input.appointmentId
      ? ((
          db()
            .prepare("SELECT paid FROM booking_details WHERE appointment_id=?")
            .get(input.appointmentId) as { paid: number } | undefined
        )?.paid ?? 0)
      : 0;
    if (total < deposit)
      throw new Error(
        "Order is below the existing deposit. Resolve the deposit refund first.",
      );
    const id = randomUUID();
    db()
      .prepare(
        "INSERT INTO orders(id,request_key,request_hash,client_id,professional_id,appointment_id,subtotal,discount,tax,tip,total,created_at,actor_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
      )
      .run(
        id,
        input.requestKey,
        hash,
        input.clientId,
        input.professionalId,
        input.appointmentId,
        subtotal,
        input.discount,
        tax,
        input.tip,
        total,
        new Date().toISOString(),
        user.id,
      );
    for (const l of calculated)
      db()
        .prepare("INSERT INTO order_items VALUES(?,?,?,?,?,?,?,?,?)")
        .run(
          randomUUID(),
          id,
          l.productId,
          l.serviceId,
          l.label,
          l.quantity,
          l.price,
          l.discount,
          l.tax,
        );
    auditBusiness(user, "order", id, "created");
    return id;
  });
}
export function collectCash(
  user: User,
  orderId: string,
  eventKey: string,
  amount: number,
) {
  z.string().uuid().parse(eventKey);
  cents.parse(amount);
  return transaction(() => {
    const o = orders(user).find((o) => o.id === orderId);
    if (!o) throw new Error("Order access denied.");
    const prior = db()
      .prepare("SELECT order_id,amount FROM order_payments WHERE event_key=?")
      .get(eventKey) as { order_id: string; amount: number } | undefined;
    if (prior) {
      if (prior.order_id !== orderId || prior.amount !== amount)
        throw new Error("Payment key already used.");
      return;
    }
    if (o.status !== "open") throw new Error("Order is already settled.");
    if (amount !== o.total - o.paid - o.deposit)
      throw new Error(
        "Balance changed. Reload checkout before collecting cash.",
      );
    const lines = db()
      .prepare(
        "SELECT product_id,quantity FROM order_items WHERE order_id=? AND product_id IS NOT NULL",
      )
      .all(orderId) as { product_id: string; quantity: number }[];
    for (const l of lines)
      db()
        .prepare("INSERT INTO inventory_movements VALUES(?,?,?,?,?,?,?,?,?)")
        .run(
          randomUUID(),
          l.product_id,
          -l.quantity,
          "sale",
          orderId,
          "Checkout sale",
          user.id,
          new Date().toISOString(),
          `sale:${orderId}:${l.product_id}`,
        );
    db()
      .prepare("INSERT INTO order_payments VALUES(?,?,?,?,?,?,?,?)")
      .run(
        randomUUID(),
        orderId,
        eventKey,
        "cash",
        amount,
        0,
        new Date().toISOString(),
        user.id,
      );
    db().prepare("UPDATE orders SET status='paid' WHERE id=?").run(orderId);
    auditBusiness(user, "order", orderId, "cash_recorded");
  });
}
export function voidOrder(user: User, id: string) {
  return transaction(() => {
    const o = orders(user).find((o) => o.id === id);
    if (!o || o.status !== "open" || o.paid !== 0)
      throw new Error("Only unpaid open orders can be voided.");
    db()
      .prepare("UPDATE orders SET status='void',appointment_id=NULL WHERE id=?")
      .run(id);
    auditBusiness(user, "order", id, "voided");
  });
}
/** No browser settlement endpoint: a future adapter must verify signatures and currency before applying events. */
export interface CheckoutPaymentAdapter {
  create(input: {
    orderId: string;
    amount: number;
    currency: "USD";
    idempotencyKey: string;
  }): Promise<{ checkoutUrl: string; providerId: string }>;
  verifyWebhook(
    rawBody: string,
    signature: string,
  ): Promise<{
    eventId: string;
    orderId: string;
    amount: number;
    currency: "USD";
    status: "paid" | "refunded";
  }>;
}
