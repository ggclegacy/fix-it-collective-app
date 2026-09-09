import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { metrics } from "@/lib/business/intelligence";
import { scopes } from "@/lib/business/access";
import { GoalForm } from "@/components/business/settings";
import { money } from "@/lib/catalog";
export const metadata = { title: "Business · Revenue & performance" };
export default async function Business({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; context?: string }>;
}) {
  const user = await requireUser(true),
    q = await searchParams,
    days = [7, 30, 90].includes(Number(q.days)) ? Number(q.days) : 30,
    m = metrics(user, days, q.context),
    peak = Math.max(1, ...m.trend.map((d) => Math.abs(d.collected)));
  return (
    <>
      <header className="os-hero">
        <div>
          <p className="eyebrow">BUSINESS INTELLIGENCE</p>
          <h1>Know how you’re doing.</h1>
          <p>
            {m.start} through {m.end} · Stored business records · Central Time
          </p>
        </div>
        <nav className="os-session-steps" aria-label="Reporting period">
          {[7, 30, 90].map((d) => (
            <Link
              key={d}
              href={`/studio/business?days=${d}&context=${q.context ?? "collective"}`}
              aria-current={days === d ? "page" : undefined}
            >
              {d} days
            </Link>
          ))}
        </nav>
      </header>
      <div className="os-stats">
        {[
          ["Net collected receipts", money(m.collected)],
          ["Service sales", money(m.serviceSales)],
          ["Retail sales", money(m.retailSales)],
          ["Tips on settled orders", money(m.tips)],
          ["Refunds", money(m.refunds)],
          ["Fees", m.fees === null ? "Unavailable" : money(m.fees)],
          [
            "Average ticket",
            m.averageTicket === null ? "—" : money(m.averageTicket),
          ],
          ["Future booked value", money(m.futureBooked)],
        ].map(([label, value]) => (
          <div className="os-stat" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <section className="os-panel">
        <div className="os-section-head">
          <h2>Collection trend.</h2>
          <span className="os-muted">{days} days</span>
        </div>
        <div
          className="os-trend"
          role="img"
          aria-label={`Daily net receipts; ${money(m.collected)} in this period. Expand the daily table for exact values.`}
        >
          {m.trend.map((d) => (
            <div
              key={d.date}
              title={`${d.date}: ${money(d.collected)}`}
              style={{
                height: `${Math.max(1, (Math.abs(d.collected) / peak) * 100)}%`,
                background: d.collected < 0 ? "var(--steel-300)" : undefined,
              }}
            />
          ))}
        </div>
        {m.trend.every((d) => d.collected === 0) && (
          <p className="os-empty">
            No recorded receipts in this period. Completed appointments alone do
            not create collected revenue.
          </p>
        )}
        <details>
          <summary>Daily receipts table</summary>
          <div className="os-table-wrap">
            <table className="os-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Net receipts</th>
                </tr>
              </thead>
              <tbody>
                {m.trend.map((d) => (
                  <tr key={d.date}>
                    <td>{d.date}</td>
                    <td>{money(d.collected)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>
      <div className="os-grid">
        <section className="os-panel">
          <h2>Clients & capacity.</h2>
          <table className="os-table">
            <tbody>
              {[
                [
                  "Utilization",
                  m.utilization === null ? "—" : `${m.utilization}%`,
                ],
                ["Open working minutes", String(Math.round(m.open))],
                [
                  "New / returning clients",
                  `${m.newClients} / ${m.returningClients}`,
                ],
                [
                  "Currently rebooked",
                  m.rebooking === null ? "—" : `${m.rebooking}%`,
                ],
                [
                  "Second-visit retention",
                  m.retention === null
                    ? "Not enough mature history"
                    : `${m.retention}% of ${m.retentionCohort} clients`,
                ],
                ["Cancellations", String(m.cancellations)],
                ["No-shows", String(m.noShows)],
                ["Outstanding balances", money(m.outstanding)],
              ].map(([label, value]) => (
                <tr key={label}>
                  <td>{label}</td>
                  <td>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="os-panel">
          <h2>Sales by provider.</h2>
          {m.byProvider.map(([p, value]) => (
            <p key={p}>
              {p === "pro-a" ? "Katie" : "Kamilla"} · {money(value)}
            </p>
          ))}
          {!m.byProvider.length && (
            <p className="os-empty">No settled orders in this period.</p>
          )}
          <h3>Services & product performance</h3>
          {m.byItem.map(([name, value]) => (
            <p key={name}>
              {name} · {money(value)}
            </p>
          ))}
        </section>
      </div>
      <section className="os-panel" id="acquisition">
        <h2>Booking sources.</h2>
        <p className="os-muted">
          Recorded appointment count by source. Unknown remains unknown; no
          acquisition cost or ROI is inferred.
        </p>
        {m.sources.map(([name, n]) => (
          <p key={name}>
            {name} · {n} appointments
          </p>
        ))}
        {!m.sources.length && (
          <p className="os-empty">
            No bookings in this period. Record a source from each visit’s
            workspace.
          </p>
        )}
      </section>
      <section className="os-panel" id="goal">
        <h2>A goal to work toward.</h2>
        <GoalForm
          providers={scopes(user, q.context).map((id) => ({
            id,
            name: id === "pro-a" ? "Katie" : "Kamilla",
          }))}
        />
      </section>
      <details className="os-panel">
        <summary>How these numbers are calculated</summary>
        <p className="os-muted">
          Collected receipts use payment event dates and include tips and tax,
          less refunds. Service and retail sales use settled orders created in
          the selected period, after proportional discounts and before tax/tips.
          Average ticket excludes tax/tips. Utilization includes service buffers
          and removes the union of time blocks. New clients have no completed
          visit before this period in the selected workspace. Rebooking is the
          share of clients who completed a visit in this period and currently
          have a future confirmed visit; it is not historical checkout
          prebooking. Second-visit retention uses first visits 30–60 days ago
          and checks for another completed visit within 30 days. No profit is
          calculated without expense data.
        </p>
      </details>
    </>
  );
}
