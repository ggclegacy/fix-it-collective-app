import Link from "next/link";
import { DateTime } from "luxon";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { money, studio, services } from "@/lib/catalog";
import {
  metrics,
  scopedAppointments,
  opportunities,
} from "@/lib/business/intelligence";
import { orders, products } from "@/lib/business/commerce";
import { scopes } from "@/lib/business/access";
export const metadata = { title: "Business OS · Command Center" };
export default async function Command({
  searchParams,
}: {
  searchParams: Promise<{ context?: string }>;
}) {
  const user = await requireUser(true),
    { context } = await searchParams,
    ids = scopes(user, context),
    now = DateTime.now().setZone(studio.timezone),
    m = metrics(user, 1, context),
    month = metrics(user, now.day, context),
    all = scopedAppointments(user, context),
    today = all.filter((a) =>
      DateTime.fromISO(a.start_at).setZone(studio.timezone).hasSame(now, "day"),
    ),
    openOrders = orders(user, context).filter((o) => o.status === "open"),
    low = products(user).filter((p) => p.active && p.stock <= p.low_stock),
    growth = opportunities(user, context),
    goal = (
      db().prepare("SELECT * FROM business_goals").all() as {
        professional_id: string;
        monthly_revenue: number;
      }[]
    )
      .filter((g) => ids.includes(g.professional_id))
      .reduce((n, g) => n + g.monthly_revenue, 0),
    tasks = (
      db()
        .prepare(
          "SELECT * FROM business_tasks WHERE status='open' ORDER BY due_date",
        )
        .all() as {
        id: string;
        professional_id: string;
        title: string;
        due_date: string | null;
      }[]
    ).filter((t) => ids.includes(t.professional_id));
  const unbilled = today.filter(
    (a) =>
      a.status === "completed" &&
      !orders(user, context).some(
        (o) => o.appointment_id === a.id && o.status !== "void",
      ),
  );
  const attention =
    openOrders.length + low.length + unbilled.length + tasks.length;
  return (
    <>
      <header className="os-hero">
        <div>
          <p className="eyebrow">
            COMMAND CENTER ·{" "}
            {context === "katie"
              ? "KATIE"
              : context === "kamilla"
                ? "KAMILLA"
                : user.role === "owner"
                  ? "COLLECTIVE"
                  : "YOUR WORKSPACE"}
          </p>
          <h1>
            {now.hour < 12
              ? "Good morning"
              : now.hour < 18
                ? "Good afternoon"
                : "Good evening"}
            , {user.id === "demo-staff" ? "Katie" : user.name.split(" ")[0]}.
          </h1>
          <p>
            {now.toFormat("cccc, LLLL d")} · {today.length} appointments ·{" "}
            {attention} items need attention
          </p>
        </div>
        <Link className="button navy" href="/studio/clients">
          Book a client ↗
        </Link>
      </header>
      {(process.env.NODE_ENV === "development" ||
        process.env.SEED_DEMO === "true") && (
        <span className="os-tag">
          DEVELOPMENT PREVIEW · Includes sample client records
        </span>
      )}
      <div className="os-stats">
        {[
          ["Booked today", money(m.booked), "Scheduled service value"],
          [
            "Collected today",
            money(m.collected),
            "Net receipts, including tax and tips",
          ],
          [
            "Schedule utilization",
            m.utilization === null ? "—" : `${m.utilization}%`,
            `${Math.round(m.open)} open working minutes`,
          ],
          ["Needs attention", String(attention), "Checkout, stock and tasks"],
        ].map(([label, value, detail]) => (
          <div className="os-stat" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{detail}</small>
          </div>
        ))}
      </div>
      <div className="os-surfaces">
        {[
          ["Money", "/studio/business", "Revenue & performance"],
          ["Schedule", "/studio/calendar", "Appointments & openings"],
          ["Clients", "/studio/clients", "People & relationships"],
          ["Retail", "/studio/operations", "Checkout & inventory"],
          ["Growth", "/studio/growth", "Your next opportunities"],
        ].map(([name, href, detail]) => (
          <Link href={`${href}?context=${context ?? "collective"}`} key={name}>
            {name} ↗<span>{detail}</span>
          </Link>
        ))}
      </div>
      <div className="os-grid">
        <section className="os-panel">
          <div className="os-section-head">
            <h2>Today’s rhythm.</h2>
            <Link href="/studio/calendar">Full calendar ↗</Link>
          </div>
          <p className="os-muted">
            Central Time · Select a visit to prepare, work, and check out.
          </p>
          <div className="os-timeline">
            {today.map((a) => (
              <article key={a.id} className="os-visit">
                <time>
                  {DateTime.fromISO(a.start_at)
                    .setZone(studio.timezone)
                    .toFormat("h:mm a")}
                </time>
                <Link href={`/studio/workspace/${a.id}`}>
                  <strong>{a.client_name} ↗</strong>
                  <small>
                    {services.find((s) => s.id === a.service_id)?.name} ·{" "}
                    {money(a.price)}
                  </small>
                </Link>
                <span className="os-tag">
                  {(a.stage ?? a.status).replaceAll("_", " ")}
                </span>
                <details>
                  <summary>Quick client view</summary>
                  <p>
                    {
                      all.filter(
                        (v) =>
                          v.client_id === a.client_id &&
                          v.status === "completed",
                      ).length
                    }{" "}
                    completed visits ·{" "}
                    {a.professional_id === "pro-a"
                      ? "Katie’s chair"
                      : "Kamilla’s session"}
                  </p>
                  <Link
                    className="text-link"
                    href={`/studio/clients/${a.client_id}`}
                  >
                    Open Client 360 ↗
                  </Link>
                </details>
              </article>
            ))}
          </div>
          {!today.length && (
            <div className="os-empty">
              A clear calendar. Add an appointment or review your availability
              to plan the day.
            </div>
          )}
        </section>
        <aside>
          <section className="os-panel">
            <div className="os-section-head">
              <h2>Needs attention.</h2>
              <span className="os-tag">{attention}</span>
            </div>
            {unbilled.map((a) => (
              <Link
                className="os-attention"
                key={a.id}
                href={`/studio/operations?appointment=${a.id}`}
              >
                <strong>Finish checkout · {a.client_name}</strong>
                <p>Service completed; no checkout created.</p>
                <small>Create checkout ↗</small>
              </Link>
            ))}
            {openOrders.slice(0, 4).map((o) => (
              <Link
                className="os-attention"
                key={o.id}
                href={`/studio/operations?order=${o.id}`}
              >
                <strong>
                  {money(o.total - o.paid - o.deposit)} awaiting payment
                </strong>
                <p>{o.client_name} · open checkout</p>
              </Link>
            ))}
            {low.slice(0, 3).map((p) => (
              <Link
                className="os-attention"
                key={p.id}
                href="/studio/operations#inventory"
              >
                <strong>Low stock · {p.name}</strong>
                <p>
                  {p.stock} on hand · reorder threshold {p.low_stock}
                </p>
              </Link>
            ))}
            {tasks.slice(0, 3).map((t) => (
              <Link
                className="os-attention"
                key={t.id}
                href="/studio/more#tasks"
              >
                <strong>{t.title}</strong>
                <p>{t.due_date ?? "No due date"}</p>
              </Link>
            ))}
            {!attention && (
              <p className="os-empty">
                Nothing outstanding in checkout, inventory, or tasks.
              </p>
            )}
          </section>
          <section className="os-panel">
            <p className="eyebrow">THIS MONTH</p>
            <h2>{money(month.collected)} collected.</h2>
            {goal ? (
              <>
                <progress
                  className="os-meter"
                  value={Math.max(0, month.collected)}
                  max={goal}
                />
                <p className="os-muted">
                  {Math.round((month.collected / goal) * 100)}% of {money(goal)}{" "}
                  receipts goal
                </p>
              </>
            ) : (
              <Link className="text-link" href="/studio/business#goal">
                Set your monthly goal ↗
              </Link>
            )}
            <p className="os-muted">
              {money(m.futureBooked)} future booked service value
            </p>
          </section>
        </aside>
      </div>
      <div className="os-stats">
        {[
          ["Retail sales", money(m.retailSales)],
          ["Tips", money(m.tips)],
          ["Outstanding", money(m.outstanding)],
          [
            "New / returning clients",
            `${m.newClients} / ${m.returningClients}`,
          ],
          ["Cancellations", String(m.cancellations)],
          ["No-shows", String(m.noShows)],
          ["Rebooked clients", m.rebooking === null ? "—" : `${m.rebooking}%`],
          ["Growth opportunities", String(growth.length)],
        ].map(([label, value]) => (
          <Link
            className="os-stat"
            href={
              label === "Growth opportunities"
                ? "/studio/growth"
                : "/studio/business"
            }
            key={label}
          >
            <span>{label}</span>
            <strong>{value}</strong>
          </Link>
        ))}
      </div>
      <p className="os-muted">
        Booked value is a forecast. Collected is recorded cash plus verified
        provider settlements. Outstanding includes open orders and completed
        unbilled visits. No financial history is invented.
      </p>
    </>
  );
}
