"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BusinessForm,
  ActionButton,
  text,
  amount,
  optionalNumber,
} from "./forms";
import { money } from "@/lib/catalog";
import type { Product, Order } from "@/lib/business/commerce";
export function ProductForm() {
  return (
    <BusinessForm
      action="product"
      label="Add product"
      build={(d) => ({
        sku: text(d, "sku"),
        name: text(d, "name"),
        brand: text(d, "brand"),
        price: amount(d, "price"),
        tax_bps: Math.round(Number(d.get("tax")) * 100),
        low_stock: Number(d.get("low")),
        replenish_days: optionalNumber(d, "days"),
      })}
    >
      <div className="os-fields">
        <label>
          Product name
          <input name="name" required maxLength={160} />
        </label>
        <label>
          SKU
          <input name="sku" required maxLength={60} />
        </label>
        <label>
          Brand
          <input name="brand" placeholder="Groomed Gent" maxLength={100} />
        </label>
        <label>
          Price ($)
          <input name="price" type="number" min="0" step="0.01" required />
        </label>
        <label>
          Applicable tax rate (%)
          <input
            name="tax"
            type="number"
            min="0"
            max="25"
            step="0.01"
            defaultValue="0"
            required
          />
        </label>
        <label>
          Low-stock threshold
          <input name="low" type="number" min="0" defaultValue="3" required />
        </label>
        <label>
          Replenishment interval (days)
          <input name="days" type="number" min="1" max="365" />
        </label>
      </div>
      <p className="os-muted">
        Use your actual catalog price and applicable tax rate. New products
        start with zero stock; record a receipt below.
      </p>
    </BusinessForm>
  );
}
export function StockForm({ products }: { products: Product[] }) {
  const [key, setKey] = useState<string | null>(null);
  return (
    <BusinessForm
      action="stock"
      label="Record movement"
      onSaved={() => setKey(null)}
      build={(d) => {
        const requestKey = key ?? crypto.randomUUID();
        setKey(requestKey);
        return {
          productId: text(d, "product"),
          quantity: Number(d.get("quantity")),
          kind: text(d, "kind"),
          reason: text(d, "reason"),
          requestKey,
        };
      }}
    >
      <div className="os-fields">
        <label>
          Product
          <select name="product" aria-label="Product" required>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.stock} on hand
              </option>
            ))}
          </select>
        </label>
        <label>
          Movement
          <select name="kind" aria-label="Movement">
            <option value="received">Received stock (+)</option>
            <option value="damage">Damage (−)</option>
            <option value="adjustment">Manual adjustment (+/−)</option>
            <option value="return">Returned to stock (+)</option>
          </select>
        </label>
        <label>
          Quantity change
          <input
            name="quantity"
            type="number"
            min="-10000"
            max="10000"
            step="1"
            required
          />
        </label>
        <label>
          Reason / receipt reference
          <input name="reason" minLength={3} maxLength={300} required />
        </label>
      </div>
    </BusinessForm>
  );
}
export function CheckoutForm({
  products,
  clients,
  providers,
  appointment,
}: {
  products: Product[];
  clients: { id: string; name: string }[];
  providers: { id: string; name: string }[];
  appointment?: {
    id: string;
    client_id: string;
    professional_id: string;
    price: number;
  };
}) {
  const router = useRouter();
  const [key, setKey] = useState<string | null>(null);
  return (
    <BusinessForm
      action="order"
      label="Create checkout"
      success="Checkout created. No payment has been taken."
      onSaved={(r) => {
        setKey(null);
        router.push(`/studio/operations?order=${r.id}`);
      }}
      build={(d) => {
        const requestKey = key ?? crypto.randomUUID();
        setKey(requestKey);
        return {
          requestKey,
          clientId: appointment?.client_id ?? text(d, "client"),
          professionalId: appointment?.professional_id ?? text(d, "provider"),
          appointmentId: appointment?.id ?? null,
          items: products
            .map((p) => ({
              productId: p.id,
              quantity: Number(d.get(`qty:${p.id}`)),
            }))
            .filter((p) => p.quantity > 0),
          discount: amount(d, "discount"),
          tip: amount(d, "tip"),
          serviceTaxBps: Math.round(Number(d.get("serviceTax") ?? 0) * 100),
        };
      }}
    >
      {appointment ? (
        <p>
          Completed service: <strong>{money(appointment.price)}</strong>
        </p>
      ) : (
        <div className="os-fields">
          <label>
            Client
            <select name="client" aria-label="Client" required>
              {clients.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Provider attribution
            <select name="provider" aria-label="Provider attribution" required>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <div className="os-table-wrap">
        <table className="os-table">
          <thead>
            <tr>
              <th>Retail product</th>
              <th>Price</th>
              <th>Quantity</th>
            </tr>
          </thead>
          <tbody>
            {products
              .filter((p) => p.active)
              .map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.name}
                    <small>
                      {p.stock} in stock · {p.tax_bps / 100}% tax
                    </small>
                  </td>
                  <td>{money(p.price)}</td>
                  <td>
                    <input
                      aria-label={`Quantity for ${p.name}`}
                      name={`qty:${p.id}`}
                      type="number"
                      min="0"
                      max={Math.max(0, p.stock)}
                      step="1"
                      defaultValue="0"
                      style={{ maxWidth: 90 }}
                    />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {!products.length && (
        <p className="os-muted">
          No products configured yet. You can still check out a completed
          service.
        </p>
      )}
      <div className="os-fields">
        <label>
          Discount ($)
          <input
            name="discount"
            type="number"
            min="0"
            step="0.01"
            defaultValue="0"
            required
          />
        </label>
        <label>
          Tip ($)
          <input
            name="tip"
            type="number"
            min="0"
            step="0.01"
            defaultValue="0"
            required
          />
        </label>
        {appointment && (
          <label>
            Applicable service tax rate (%)
            <input
              name="serviceTax"
              type="number"
              min="0"
              max="25"
              step="0.01"
              defaultValue="0"
              required
            />
          </label>
        )}
      </div>
      <p className="os-muted">
        Review the saved total before recording payment. Product prices and
        taxes are calculated on the server. Discounts are allocated
        proportionally before tax.
      </p>
    </BusinessForm>
  );
}
export function CollectCash({ order }: { order: Order }) {
  const [key] = useState(() => globalThis.crypto.randomUUID());
  return (
    <BusinessForm
      action="cash"
      label={`Record ${money(order.total - order.paid - order.deposit)} cash received`}
      success="Cash recorded. Inventory and reports updated."
      build={() => ({
        orderId: order.id,
        eventKey: key,
        amount: order.total - order.paid - order.deposit,
      })}
    >
      <label className="os-checks">
        <span>
          <input type="checkbox" required /> I have received the displayed cash
          amount (or the deposit covers this order).
        </span>
      </label>
      <p className="os-muted">
        This records a real cash receipt. Card processing is not connected.
      </p>
    </BusinessForm>
  );
}
export function VoidOrder({ id }: { id: string }) {
  return (
    <ActionButton action="void" data={{ id }} confirm>
      Void unpaid checkout
    </ActionButton>
  );
}
