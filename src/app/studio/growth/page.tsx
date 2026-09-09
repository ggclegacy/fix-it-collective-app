import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { opportunities } from "@/lib/business/intelligence";
import { ActionButton } from "@/components/business/forms";
export const metadata = { title: "Growth · Opportunities" };
export default async function Growth({
  searchParams,
}: {
  searchParams: Promise<{ context?: string }>;
}) {
  const user = await requireUser(true),
    { context } = await searchParams,
    items = opportunities(user, context);
  return (
    <>
      <header className="os-hero">
        <div>
          <p className="eyebrow">GROWTH CENTER</p>
          <h1>Your next best actions.</h1>
          <p>
            Explainable opportunities from your appointments, client history,
            and product sales.
          </p>
        </div>
        <ActionButton action="growth_refresh" data={{ context }}>
          Refresh opportunities
        </ActionButton>
      </header>
      <p className="os-muted">
        Refresh checks overdue return intervals, low utilization, live waitlist
        matches, recent review opportunities, and product replenishment.
        Suggestions never send messages or reserve appointments automatically.
      </p>
      <div className="os-grid">
        {items.map((o) => (
          <article className="os-panel" key={o.id}>
            <p className="eyebrow">
              {o.professional_id === "pro-a" ? "KATIE" : "KAMILLA"} · {o.kind}
            </p>
            <h2>{o.title}</h2>
            <p>{o.explanation}</p>
            <p className="os-muted">
              Last checked: {o.observed_at.slice(0, 16).replace("T", " ")} UTC
            </p>
            <div className="os-session-steps">
              <Link href={o.href}>Review & act ↗</Link>
              {o.kind === "review" && (
                <ActionButton
                  action="review_draft"
                  data={{ appointmentId: o.id.slice(7) }}
                >
                  Prepare review request
                </ActionButton>
              )}
              <ActionButton action="dismiss" data={{ id: o.id }} confirm>
                Dismiss opportunity
              </ActionButton>
            </div>
          </article>
        ))}
      </div>
      {!items.length && (
        <section className="os-panel">
          <h2>Ready when the evidence is.</h2>
          <p className="os-empty">
            No open opportunities. Refresh to evaluate current records. Return
            reminders need a recorded interval or at least two completed visits;
            replenishment needs product purchase history. Nothing is invented to
            fill this screen.
          </p>
        </section>
      )}
    </>
  );
}
