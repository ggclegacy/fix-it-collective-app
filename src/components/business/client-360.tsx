import Link from "next/link";
import { db } from "@/lib/db";
import { scopes } from "@/lib/business/access";
import { relationship } from "@/lib/business/records";
import { orders } from "@/lib/business/commerce";
import { clientTimeline } from "@/lib/business/intelligence";
import { money } from "@/lib/catalog";
import type { User } from "@/lib/types";
import { RelationshipForm, MessageDraft } from "./client-records";
export function Client360({ user, id }: { user: User; id: string }) {
  const paid = orders(user).filter(
      (o) => o.client_id === id && o.status === "paid",
    ),
    net = paid.reduce((n, o) => n + o.subtotal - o.discount, 0);
  return (
    <>
      <section className="os-panel">
        <p className="eyebrow">CLIENT 360 · PURCHASES & RELATIONSHIP</p>
        <div className="os-stats">
          <div className="os-stat">
            <span>Recorded net purchases</span>
            <strong>{money(net)}</strong>
            <small>Settled orders, before tax and tips</small>
          </div>
          <div className="os-stat">
            <span>Average purchase</span>
            <strong>
              {paid.length ? money(Math.round(net / paid.length)) : "—"}
            </strong>
            <small>{paid.length} settled orders</small>
          </div>
        </div>
        {scopes(user).map((p) => (
          <details key={p}>
            <summary>
              {p === "pro-a" ? "Katie" : "Kamilla"} · Relationship details
            </summary>
            <RelationshipForm
              clientId={id}
              professionalId={p}
              initial={{ ...relationship(user, id, p) }}
            />
            <h3>Communication draft</h3>
            <MessageDraft clientId={id} professionalId={p} />
          </details>
        ))}
      </section>
      <section className="os-panel">
        <h2>One relationship. Every interaction.</h2>
        <div className="os-history">
          {clientTimeline(user, id).map((e) => (
            <Link href={e.href} key={e.id}>
              <small>{e.date.slice(0, 10)}</small>
              <strong>{e.title}</strong>
              <small>{e.detail} ↗</small>
            </Link>
          ))}
        </div>
      </section>
      <section className="os-panel">
        <h2>Communication drafts.</h2>
        {(
          db()
            .prepare(
              "SELECT * FROM messages WHERE client_id=? ORDER BY created_at DESC",
            )
            .all(id) as {
            id: string;
            professional_id: string;
            body: string;
            channel: string;
            status: string;
          }[]
        )
          .filter((m) => scopes(user).includes(m.professional_id))
          .map((m) => (
            <details key={m.id}>
              <summary>
                {m.channel} · {m.status}
              </summary>
              <p style={{ whiteSpace: "pre-wrap" }}>{m.body}</p>
              <p className="os-muted">Saved draft; not sent.</p>
            </details>
          ))}
      </section>
      <section className="os-panel">
        <h2>Products purchased.</h2>
        {paid.map((o) => (
          <div className="os-attention" key={o.id}>
            <Link href={`/studio/operations?order=${o.id}`}>
              {o.created_at.slice(0, 10)} · {money(o.total)} ↗
            </Link>
            <p>
              {(
                db()
                  .prepare(
                    "SELECT label,quantity FROM order_items WHERE order_id=? AND product_id IS NOT NULL",
                  )
                  .all(o.id) as { label: string; quantity: number }[]
              )
                .map((i) => `${i.quantity} × ${i.label}`)
                .join(" · ") || "Service-only checkout"}
            </p>
          </div>
        ))}
        {!paid.length && (
          <p className="os-empty">No settled purchases recorded yet.</p>
        )}
      </section>
    </>
  );
}
