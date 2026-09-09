import { rules, settings, canManage } from "@/lib/booking-rules";
import { services } from "@/lib/catalog";
import { appointmentsFor } from "@/lib/scheduling";
import Link from "next/link";
import { BookingFlow } from "@/components/booking-flow";
import { currentUser, demoEnabled } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Appointment, User } from "@/lib/types";
import { notFound } from "next/navigation";
export const metadata = { title: "Book a visit" };
export const dynamic = "force-dynamic";
export default async function Book({
  searchParams,
}: {
  searchParams: Promise<{
    service?: string;
    professional?: string;
    reschedule?: string;
    client?: string;
    experience?: string;
  }>;
}) {
  if (process.env.VERCEL) {
    return (
      <main id="main" className="booking-page section">
        <p className="eyebrow">YOUR NEXT VISIT</p>
        <h1>
          A little time for <em>you.</em>
        </h1>
        <p className="notice">
          Online booking is not open yet. Explore Katie’s Studio and Kamilla’s
          Recovery Room while we prepare your booking experience.
        </p>
        <div className="provider-entry-links">
          <Link className="button navy" href="/grooming">
            Explore Katie’s Studio
          </Link>
          <Link className="button outline" href="/recovery">
            Explore Kamilla’s Recovery Room
          </Link>
        </div>
      </main>
    );
  }
  const q = await searchParams;
  const user = await currentUser();
  let appointment: Appointment | undefined;
  if (q.reschedule) {
    appointment = db()
      .prepare("SELECT * FROM appointments WHERE id=?")
      .get(q.reschedule) as Appointment | undefined;
    if (
      !appointment ||
      !user ||
      (user.role === "client"
        ? appointment.client_id !== user.id
        : !canManage(user, appointment.professional_id))
    )
      notFound();
  }
  let client: Pick<User, "id" | "name"> | undefined;
  if (q.client) {
    if (!user || user.role === "client") notFound();
    client = db()
      .prepare("SELECT id,name FROM users WHERE id=? AND role='client'")
      .get(q.client) as Pick<User, "id" | "name"> | undefined;
    if (!client) notFound();
  }
  return (
    <main id="main" className="booking-page">
      {q.experience === "katie" && (
        <Link href="/grooming" className="text-link">
          ← Back to Katie’s Studio
        </Link>
      )}
      <BookingFlow
        key={appointment?.id ?? "new"}
        user={user}
        demo={demoEnabled()}
        business={settings()}
        serviceRules={Object.fromEntries(
          services.map((s) => [s.id, rules(s.id)]),
        )}
        catalog={services.map((s) => {
          const r = rules(s.id);
          return {
            ...s,
            duration: r.duration,
            buffer: r.buffer,
            price:
              r.price ?? (demoEnabled() && s.id !== "massage" ? s.price : -1),
          };
        })}
        usual={
          user
            ? appointmentsFor(user)
                .filter(
                  (a) =>
                    a.client_id === (client?.id ?? user.id) &&
                    a.status === "completed" &&
                    (!q.experience ||
                      a.professional_id ===
                        (q.experience === "katie" ? "pro-a" : "pro-b")),
                )
                .at(-1)
            : undefined
        }
        initialService={appointment?.service_id ?? q.service}
        initialProfessional={
          appointment?.professional_id ??
          q.professional ??
          (q.experience === "katie"
            ? "pro-a"
            : q.experience === "camilla" || q.experience === "kamilla"
              ? "pro-b"
              : undefined)
        }
        appointment={appointment ? { ...appointment } : undefined}
        client={client ? { ...client } : undefined}
      />
    </main>
  );
}
