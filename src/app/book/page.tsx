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
  }>;
}) {
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
      (user.role === "client" && appointment.client_id !== user.id)
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
      <BookingFlow
        key={appointment?.id ?? "new"}
        user={user}
        demo={demoEnabled()}
        initialService={appointment?.service_id ?? q.service}
        initialProfessional={appointment?.professional_id ?? q.professional}
        appointment={appointment ? { ...appointment } : undefined}
        client={client ? { ...client } : undefined}
      />
    </main>
  );
}
