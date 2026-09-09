import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { clients } from "@/lib/staff";
import { scopes } from "@/lib/business/access";
import { products, orders } from "@/lib/business/commerce";
import { scopedAppointments } from "@/lib/business/intelligence";
import {
  ProductForm,
  StockForm,
  CheckoutForm,
  CollectCash,
  VoidOrder,
} from "@/components/business/operations";
import { money } from "@/lib/catalog";
export const metadata = { title: "Operations · Checkout & inventory" };
export default async function Operations({
  searchParams,
}: {
  searchParams: Promise<{
    order?: string;
    appointment?: string;
    context?: string;
  }>;
}) {
  const user = await requireUser(true),
    q = await searchParams,
    p = products(user),
    os = orders(user, q.context),
    order = q.order ? os.find((o) => o.id === q.order) : undefined,
    appointment = q.appointment
      ? scopedAppointments(user, q.context).find((a) => a.id === q.appointment)
      : undefined;
  if ((q.order && !order) || (q.appointment && !appointment)) notFound();
  const pending = scopedAppointments(user, q.context).filter(
    (a) =>
      a.status === "completed" &&
      !os.some((o) => o.appointment_id === a.id && o.status !== "void"),
  );
  const items = order
    ? (db()
        .prepare("SELECT * FROM order_items WHERE order_id=?")
        .all(order.id) as {
        id: string;
        label: string;
        quantity: number;
        unit_price: number;
        discount: number;
        tax: number;
      }[])
    : [];
  return (
    <>
      <header className="os-hero">
        <div>
          <p className="eyebrow">OPERATIONS</p>
          <h1>From service to sale.</h1>
          <p>One checkout. Clear payment records. Stock you can account for.</p>
        </div>
      </header>
      {order ? (
        <section className="os-panel">
          <div className="os-section-head">
            <h2>{order.client_name}</h2>
            <span className="os-tag">{order.status}</span>
          </div>
          <div className="os-table-wrap">
            <table className="os-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id}>
                    <td>{i.label}</td>
                    <td>{i.quantity}</td>
                    <td>
                      {money(i.quantity * i.unit_price - i.discount + i.tax)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Subtotal {money(order.subtotal)} · Discount {money(order.discount)}{" "}
            · Tax {money(order.tax)} · Tip {money(order.tip)}
          </p>
          <h2>Total {money(order.total)}</h2>
          <p>
            Prior appointment payments {money(order.deposit)} · Checkout
            receipts {money(order.paid)} · Remaining{" "}
            {money(Math.max(0, order.total - order.deposit - order.paid))}
          </p>
          {order.status === "open" ? (
            <>
              <CollectCash key={order.id} order={order} />
              <VoidOrder id={order.id} />
            </>
          ) : (
            <>
              <p>
                Inventory movements and receipts are available in the ledger
                below and business reports.
              </p>
              {order.appointment_id && (
                <Link
                  className="button navy"
                  href={`/studio/workspace/${order.appointment_id}`}
                >
                  Finish visit & rebook ↗
                </Link>
              )}
            </>
          )}
          <p>
            <Link className="text-link" href="/studio/operations">
              All operations ↗
            </Link>
          </p>
        </section>
      ) : (
        <section className="os-panel" id="checkout">
          <h2>{appointment ? "Service checkout" : "Retail checkout"}</h2>
          <CheckoutForm
            key={appointment?.id ?? "retail"}
            products={p}
            clients={clients(user)}
            providers={scopes(user, q.context).map((id) => ({
              id,
              name: id === "pro-a" ? "Katie" : "Kamilla",
            }))}
            appointment={appointment}
          />
        </section>
      )}
      <div className="os-grid">
        <section className="os-panel">
          <h2>Ready for checkout.</h2>
          {pending.map((a) => (
            <Link
              key={a.id}
              className="os-attention"
              href={`/studio/operations?appointment=${a.id}`}
            >
              <strong>{a.client_name}</strong>
              <p>Completed service · {money(a.price)} ↗</p>
            </Link>
          ))}
          {!pending.length && (
            <p className="os-empty">
              No completed visits waiting for a checkout.
            </p>
          )}
          <h3>Recent orders</h3>
          {os.slice(0, 20).map((o) => (
            <Link
              key={o.id}
              className="os-attention"
              href={`/studio/operations?order=${o.id}`}
            >
              <strong>
                {o.client_name} · {money(o.total)}
              </strong>
              <p>
                {o.status} · {o.created_at.slice(0, 10)}
              </p>
            </Link>
          ))}
        </section>
        <section className="os-panel" id="inventory">
          <h2>Products & inventory.</h2>
          <p className="os-muted">
            Shared Collective stock. Quantity is calculated from the movement
            ledger.
          </p>
          {p.map((product) => (
            <div className="os-attention" key={product.id}>
              <strong>
                {product.name} · {product.stock} on hand
              </strong>
              <p>
                {product.brand} · {money(product.price)}
                {product.stock <= product.low_stock ? " · LOW STOCK" : ""}
              </p>
            </div>
          ))}
          {!p.length && (
            <p className="os-empty">
              Add your actual products, including Groomed Gent, then record
              received stock.
            </p>
          )}
          {user.role === "owner" && (
            <>
              <details>
                <summary>Add a product</summary>
                <ProductForm />
              </details>
              {p.length > 0 && (
                <details>
                  <summary>Record stock movement</summary>
                  <StockForm products={p} />
                </details>
              )}
            </>
          )}
        </section>
      </div>
      <section className="os-panel">
        <h2>Inventory movement ledger.</h2>
        <div className="os-table-wrap">
          <table className="os-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Product</th>
                <th>Reason</th>
                <th>Change</th>
              </tr>
            </thead>
            <tbody>
              {(
                db()
                  .prepare(
                    "SELECT m.*,p.name FROM inventory_movements m JOIN products p ON p.id=m.product_id ORDER BY m.created_at DESC LIMIT 100",
                  )
                  .all() as {
                  id: string;
                  created_at: string;
                  name: string;
                  reason: string;
                  quantity: number;
                  kind: string;
                }[]
              ).map((m) => (
                <tr key={m.id}>
                  <td>{m.created_at.slice(0, 10)}</td>
                  <td>{m.name}</td>
                  <td>
                    {m.kind}
                    <small>{m.reason}</small>
                  </td>
                  <td>
                    {m.quantity > 0 ? "+" : ""}
                    {m.quantity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
