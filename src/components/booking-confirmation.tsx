import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { DateTime } from "luxon";
import { services, professionals, studio } from "@/lib/catalog";
import { brandForService } from "@/lib/brands";
import type { Slot, User, Appointment } from "@/lib/types";
export function BookingConfirmation({
  service,
  professional,
  slot,
  confirmed,
  appointment,
  client,
  user,
}: {
  service: (typeof services)[number] | undefined;
  professional: (typeof professionals)[number] | undefined;
  slot: Slot;
  confirmed: string;
  appointment?: Appointment;
  client?: Pick<User, "id" | "name">;
  user: User | null;
}) {
  return (
    <section className="confirmation">
      <span className="success-seal">
        <CheckCircle2 size={38} />
      </span>
      <p className="eyebrow">
        {appointment ? "VISIT UPDATED" : "YOU’RE ON THE CALENDAR"}
      </p>
      <h1>
        A little time.
        <br />
        <em>Just for you.</em>
      </h1>
      <p>Your preview appointment is saved. No charge has been made.</p>
      <div className="confirmation-summary">
        <p className="brand-label">{brandForService(service).name}</p>
        <h3>{service?.name}</h3>
        <p>
          {DateTime.fromISO(slot.start)
            .setZone(studio.timezone)
            .toFormat("cccc, LLLL d · h:mm a")}
        </p>
        <p>
          {professional?.name} · {slot.duration} minutes
        </p>
        <small>
          America/Chicago · Reference {confirmed.slice(0, 8).toUpperCase()}
        </small>
      </div>
      <p className="muted">
        Confirmation messages are not connected yet.
        <br />
        Your appointment is available in your account.
      </p>
      <Link
        className="button navy"
        href={client || user?.role !== "client" ? "/studio" : "/account"}
      >
        View{" "}
        {client || user?.role !== "client" ? "studio calendar" : "your visits"}{" "}
        <ArrowRight size={18} />
      </Link>
    </section>
  );
}
