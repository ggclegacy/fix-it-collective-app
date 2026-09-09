import Link from "next/link";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { appointmentsFor } from "@/lib/scheduling";
import { AppointmentCard } from "@/components/appointment-card";
import { db } from "@/lib/db";
export const metadata = { title: "My visits" };
export default async function Account() {
  const user = await requireUser();
  const appointments = appointmentsFor({ ...user, role: "client" });
  const upcoming = appointments.filter((a) => a.status === "confirmed");
  const history = appointments
    .filter((a) => a.status !== "confirmed")
    .reverse();
  const notes = db()
    .prepare(
      "SELECT body,created_at FROM notes WHERE client_id=? AND visibility='client' ORDER BY created_at DESC",
    )
    .all(user.id) as { body: string; created_at: string }[];
  return (
    <>
      <div className="workspace-heading">
        <div>
          <p className="eyebrow">YOUR SPACE AT FIX IT</p>
          <h1>Hey, {user.name.split(" ")[0]}.</h1>
          <p>Make a little room for feeling good.</p>
        </div>
        <Link className="button navy" href="/book">
          Book a visit <ArrowUpRight size={18} />
        </Link>
      </div>
      <div className="account-grid">
        <section>
          <div className="list-heading">
            <h2>On your calendar</h2>
            <span>{upcoming.length} visits</span>
          </div>
          {upcoming.length ? (
            upcoming.map((a) => <AppointmentCard key={a.id} appointment={a} />)
          ) : (
            <div className="empty-state">
              <CalendarDays />
              <h3>Your next good day is open.</h3>
              <p>Find a service and make some time for yourself.</p>
              <Link className="button navy" href="/book">
                Find a visit ↗
              </Link>
            </div>
          )}
          <div className="list-heading">
            <h2>Where we left off</h2>
            <span>Your history</span>
          </div>
          {history.length ? (
            history.map((a) => <AppointmentCard key={a.id} appointment={a} />)
          ) : (
            <p className="empty-state">
              Your past visits will live here. Rebooking will be one step
              closer.
            </p>
          )}
        </section>
        <aside>
          <div className="blue-panel">
            <p className="eyebrow">KEEP YOUR RHYTHM</p>
            <h2>
              A good thing,
              <br />
              worth repeating.
            </h2>
            <p>
              Your familiar service. Your preferred professional. Let’s pick up
              where you left off.
            </p>
            <Link
              className="button gold full"
              href={
                history[0]
                  ? `/book?service=${history[0].service_id}&professional=${history[0].professional_id}`
                  : "/book"
              }
            >
              Find your next time <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="quiet-panel">
            <p className="eyebrow">FROM YOUR PROFESSIONAL</p>
            {notes.length ? (
              notes.map((n) => <p key={n.created_at}>{n.body}</p>)
            ) : (
              <p>
                Personal care notes shared by your professional will appear
                here.
              </p>
            )}
          </div>
          <div className="quiet-panel">
            <p className="eyebrow">PAYMENTS & RECEIPTS</p>
            <p>
              No payments have been collected. Receipts will appear here once
              payments are connected.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
