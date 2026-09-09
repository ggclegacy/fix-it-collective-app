import { DateTime } from "luxon";
import { requireUser } from "@/lib/auth";
import { appointmentsFor } from "@/lib/scheduling";
import { clients } from "@/lib/staff";
import { money, services, professionals, studio } from "@/lib/catalog";
export const metadata = { title: "Studio insights" };
export default async function Insights() {
  const all = appointmentsFor(await requireUser(true));
  const start = DateTime.now().setZone(studio.timezone).startOf("month");
  const end = start.endOf("month");
  const month = all.filter(
    (a) =>
      DateTime.fromISO(a.start_at) >= start &&
      DateTime.fromISO(a.start_at) <= end,
  );
  const completed = month.filter((a) => a.status === "completed");
  const value = completed.reduce((s, a) => s + a.price, 0);
  const eligible = clients().filter((c) => c.visits > 0);
  const rebooked = eligible.filter((c) => c.next_visit);
  return (
    <>
      <div className="workspace-heading">
        <div>
          <p className="eyebrow">THE BUSINESS, WITH PERSPECTIVE</p>
          <h1>Know what’s working.</h1>
          <p>{start.toFormat("LLLL yyyy")} · Central Time · Preview records</p>
        </div>
      </div>
      <div className="notice">
        All metrics use saved preview appointments. Service value is not payment
        revenue. Rebooking below uses all completed client history.
      </div>
      <div className="metrics">
        <div>
          <span>Scheduled service value</span>
          <strong>
            {money(
              month
                .filter(
                  (a) => a.status === "confirmed" || a.status === "completed",
                )
                .reduce((s, a) => s + a.price, 0),
            )}
          </strong>
        </div>
        <div>
          <span>Completed service value</span>
          <strong>{money(value)}</strong>
        </div>
        <div>
          <span>Average completed ticket</span>
          <strong>
            {completed.length ? money(value / completed.length) : "—"}
          </strong>
        </div>
        <div>
          <span>Clients with a next visit</span>
          <strong>
            {eligible.length
              ? `${Math.round((rebooked.length / eligible.length) * 100)}%`
              : "—"}
          </strong>
          <small>
            {rebooked.length} of {eligible.length} clients with completed visits
          </small>
        </div>
      </div>
      <div className="insights-grid">
        <section className="panel">
          <p className="eyebrow">SERVICE PERFORMANCE</p>
          <h2>The monthly mix.</h2>
          {services.map((s) => {
            const records = month.filter(
              (a) => a.service_id === s.id && a.status === "completed",
            );
            return (
              <div className="performance-row" key={s.id}>
                <div>
                  <strong>{s.name}</strong>
                  <small>{records.length} completed visits</small>
                </div>
                <span>{money(records.reduce((n, a) => n + a.price, 0))}</span>
              </div>
            );
          })}
        </section>
        <section className="panel">
          <p className="eyebrow">PROFESSIONAL PERFORMANCE</p>
          <h2>Each person’s impact.</h2>
          {professionals.map((p) => {
            const records = completed.filter((a) => a.professional_id === p.id);
            return (
              <div className="performance-row" key={p.id}>
                <div>
                  <strong>{p.name}</strong>
                  <small>{records.length} completed visits</small>
                </div>
                <span>{money(records.reduce((n, a) => n + a.price, 0))}</span>
              </div>
            );
          })}
          <div className="performance-row">
            <span>Cancellations</span>
            <strong>
              {month.filter((a) => a.status === "cancelled").length}
            </strong>
          </div>
          <div className="performance-row">
            <span>No-shows</span>
            <strong>
              {month.filter((a) => a.status === "no_show").length}
            </strong>
          </div>
        </section>
      </div>
      <p className="muted">
        Utilization, cohort retention, and collected revenue will be added with
        approved schedules, sufficient visit history, and a connected payment
        provider.
      </p>
    </>
  );
}
