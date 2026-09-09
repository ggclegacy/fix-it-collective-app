import { randomUUID } from "node:crypto";
import { DateTime } from "luxon";
import { db, transaction } from "./db";
import { studio } from "./catalog";
/** Implement these interfaces in a server-only provider module. Never accept settlement from the browser. */
export interface DepositAdapter {
  create(input: {
    appointmentId: string;
    amount: number;
    currency: "USD";
    idempotencyKey: string;
  }): Promise<{ providerId: string; checkoutUrl: string }>;
  verifyWebhook(
    rawBody: string,
    signature: string,
  ): Promise<{
    eventId: string;
    appointmentId: string;
    amount: number;
    currency: "USD";
    status: "paid" | "refunded";
  }>;
}
export interface MessageAdapter {
  send(input: {
    idempotencyKey: string;
    recipient: string;
    subject: string;
    body: string;
  }): Promise<{ providerId: string }>;
}
export function recordSettlement(event: {
  eventId: string;
  appointmentId: string;
  amount: number;
  currency: "USD";
  status: "paid" | "refunded";
}) {
  if (
    event.currency !== "USD" ||
    !Number.isSafeInteger(event.amount) ||
    event.amount < 0
  )
    throw new Error("Invalid settlement.");
  return transaction(() => {
    if (
      db()
        .prepare("SELECT 1 FROM payment_events WHERE provider_event_id=?")
        .get(event.eventId)
    )
      return;
    const a = db()
      .prepare(
        "SELECT a.price,d.paid FROM appointments a JOIN booking_details d ON d.appointment_id=a.id WHERE a.id=?",
      )
      .get(event.appointmentId) as { price: number; paid: number } | undefined;
    if (!a) throw new Error("Appointment not found.");
    const delta = event.status === "paid" ? event.amount : -event.amount,
      paid = a.paid + delta;
    if (paid < 0 || paid > a.price)
      throw new Error("Settlement exceeds appointment balance.");
    db()
      .prepare("INSERT INTO payment_events VALUES(?,?,?,?)")
      .run(event.eventId, event.appointmentId, delta, new Date().toISOString());
    db()
      .prepare(
        "UPDATE booking_details SET paid=?,payment_status=? WHERE appointment_id=?",
      )
      .run(
        paid,
        event.status === "refunded"
          ? "refunded"
          : paid === a.price
            ? "paid"
            : "partially_paid",
        event.appointmentId,
      );
    db()
      .prepare("INSERT INTO audit VALUES(?,?,?,?,?)")
      .run(
        randomUUID(),
        "payment-provider",
        event.appointmentId,
        "payment:" + event.status,
        new Date().toISOString(),
      );
  });
}
/** Called by a server worker only after an adapter is installed. Stable IDs make retries safe. */
export async function dispatchAppointmentMessage(
  job: { id: string; appointment_id: string; event: string },
  adapter: MessageAdapter,
) {
  const a = db()
    .prepare(
      "SELECT a.*,u.email FROM appointments a JOIN users u ON u.id=a.client_id WHERE a.id=?",
    )
    .get(job.appointment_id) as
    { start_at: string; status: string; email: string } | undefined;
  if (!a) return { skipped: true };
  if (a.status === "cancelled" && job.event !== "cancellation")
    return { skipped: true };
  const time = DateTime.fromISO(a.start_at)
    .setZone(studio.timezone)
    .toFormat("cccc, LLLL d, h:mm a");
  return adapter.send({
    idempotencyKey: job.id,
    recipient: a.email,
    subject: `Fix It Collective · ${job.event.replaceAll("_", " ")}`,
    body: `Your Fix It Collective visit: ${time} Central Time. Sign in to your account to review your visit, intake, or change your plans.`,
  });
}
