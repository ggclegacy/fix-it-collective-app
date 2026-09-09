import Link from "next/link";
import { DateTime } from "luxon";
import { ArrowUpRight, Sun } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { appointmentsFor } from "@/lib/scheduling";
import { clients } from "@/lib/staff";
import { money, studio } from "@/lib/catalog";
import { AppointmentCard } from "@/components/appointment-card";
export const metadata = { title: "The studio · Today" };
export default async function Today() {
  const user = await requireUser(true);
  const now = DateTime.now().setZone(studio.timezone);
  const all = appointmentsFor(user);
  const today = all.filter((a) =>
    DateTime.fromISO(a.start_at).setZone(studio.timezone).hasSame(now, "day"),
  );
  const active = today.filter(
    (a) => a.status === "confirmed" || a.status === "completed",
  );
  const rebook = clients().filter((c) => c.visits > 0 && !c.next_visit);
  return (
    <>
      <div className="workspace-heading">
        <div>
          <p className="eyebrow">
            {now.toFormat("cccc, LLLL d").toUpperCase()}{" "}
            <span>· CENTRAL TIME</span>
          </p>
          <h1>Make it a good day.</h1>
          <p>The studio, in focus.</p>
        </div>
        <Link href="/studio/clients" className="button navy">
          Add appointment <ArrowUpRight size={18} />
        </Link>
      </div>
      <div className="metrics">
        <div>
          <span>On the calendar today</span>
          <strong>
            {active.length}
            <small> visits</small>
          </strong>
        </div>
        <div>
          <span>Scheduled service value</span>
          <strong>{money(active.reduce((s, a) => s + a.price, 0))}</strong>
        </div>
        <div>
          <span>Ready to rebook</span>
          <strong>
            {rebook.length}
            <small> clients</small>
          </strong>
        </div>
        <div>
          <span>Completed today</span>
          <strong>
            {today.filter((a) => a.status === "completed").length}
            <small> visits</small>
          </strong>
        </div>
      </div>
      <p className="sample-caption">
        PREVIEW DATA · Service values are not collected payments.
      </p>
      <div className="account-grid">
        <section>
          <div className="list-heading">
            <h2>Today’s rhythm</h2>
            <Link className="text-link" href="/studio/calendar">
              Open calendar ↗
            </Link>
          </div>
          {today.length ? (
            today.map((a) => (
              <AppointmentCard key={a.id} appointment={a} staff />
            ))
          ) : (
            <div className="empty-state">
              <Sun />
              <h3>A little breathing room.</h3>
              <p>No appointments scheduled today.</p>
              <Link href="/studio/calendar" className="text-link">
                See the week ahead ↗
              </Link>
            </div>
          )}
        </section>
        <aside>
          <div className="blue-panel">
            <p className="eyebrow">THE NEXT GOOD VISIT</p>
            <h2>
              Keep the
              <br />
              connection.
            </h2>
            <p>
              Completed visits with no future appointment. A thoughtful moment
              to bring someone back.
            </p>
            {rebook.length ? (
              rebook.map((c) => (
                <Link
                  className="retention-row"
                  key={c.id}
                  href={`/studio/clients/${c.id}`}
                >
                  <span>
                    {c.name}
                    <small>
                      {c.last_visit
                        ? DateTime.fromISO(c.last_visit).toFormat("LLL d")
                        : "No previous visit"}
                    </small>
                  </span>
                  <ArrowUpRight size={18} />
                </Link>
              ))
            ) : (
              <p>Everyone with a completed visit has a future booking.</p>
            )}
          </div>
          <div className="quiet-panel">
            <p className="eyebrow">STUDIO NOTE</p>
            <p>
              Confirmations and reminders are recorded in the message queue, but
              nothing is sent in this preview.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
