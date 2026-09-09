"use client";
import { useState } from "react";
import { api, message } from "@/lib/client";
import type { ServiceRules } from "@/lib/booking-rules";
export function BookingSettings({
  initial,
  business,
  owner,
}: {
  initial: (ServiceRules & { name: string })[];
  business: Record<string, string>;
  owner: boolean;
}) {
  const [rows, setRows] = useState(initial),
    [config, setConfig] = useState(business),
    [busy, setBusy] = useState(false),
    [feedback, setFeedback] = useState("");
  async function save(body: unknown) {
    setBusy(true);
    setFeedback("");
    try {
      await api("/api/booking-config", body);
      setFeedback("Saved. These settings now drive booking availability.");
    } catch (e) {
      setFeedback(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="details-form">
      <h2>Service rules</h2>
      <p>
        Prices are in cents. Disabled services do not accept bookings. A deposit
        or card requirement keeps online booking closed until a payment provider
        is connected.
      </p>
      {rows.map((r, i) => (
        <details key={r.service_id} className="policy-card">
          <summary>
            {r.name} · {r.enabled ? "Open" : "Awaiting approval"}
          </summary>
          <div className="details-form">
            {(
              [
                "duration",
                "buffer",
                "price",
                "deposit",
                "lead_minutes",
                "horizon_days",
                "cancellation_hours",
              ] as const
            ).map((k) => (
              <label key={k}>
                {
                  {
                    duration: "Session minutes",
                    buffer: "Cleanup / reset minutes",
                    price: "Price (cents)",
                    deposit: "Deposit (cents)",
                    lead_minutes: "Minimum notice (minutes)",
                    horizon_days: "Booking horizon (days)",
                    cancellation_hours:
                      "Cancellation / reschedule window (hours)",
                  }[k]
                }
                <input
                  type="number"
                  min="0"
                  value={r[k] ?? ""}
                  onChange={(e) =>
                    setRows(
                      rows.map((x, j) =>
                        j === i
                          ? {
                              ...x,
                              [k]:
                                e.target.value === "" && k === "price"
                                  ? null
                                  : Number(e.target.value),
                            }
                          : x,
                      ),
                    )
                  }
                />
              </label>
            ))}
            {(["enabled", "card_required"] as const).map((k) => (
              <label className="check-row" key={k}>
                <input
                  type="checkbox"
                  checked={Boolean(r[k])}
                  onChange={(e) =>
                    setRows(
                      rows.map((x, j) =>
                        j === i ? { ...x, [k]: Number(e.target.checked) } : x,
                      ),
                    )
                  }
                />
                {k === "enabled" ? "Approved for booking" : "Require a card"}
              </label>
            ))}
            <button
              className="button navy"
              disabled={busy}
              onClick={() => {
                const { name: _, ...rules } = r;
                void _;
                void save({ action: "service", rules });
              }}
            >
              Save service
            </button>
          </div>
        </details>
      ))}
      {owner && (
        <details className="policy-card">
          <summary>Registered massage credentials & directions</summary>
          {[
            "therapist_name",
            "therapist_license",
            "establishment_name",
            "establishment_license",
            "address",
          ].map((k) => (
            <label className="date-label" key={k}>
              {k.replaceAll("_", " ")}
              <input
                value={config[k] ?? ""}
                onChange={(e) => setConfig({ ...config, [k]: e.target.value })}
              />
            </label>
          ))}
          <button
            className="button navy"
            disabled={busy}
            onClick={() =>
              void save({
                action: "business",
                therapist_name: config.therapist_name ?? "",
                therapist_license: config.therapist_license ?? "",
                establishment_name: config.establishment_name ?? "",
                establishment_license: config.establishment_license ?? "",
                address: config.address ?? "",
              })
            }
          >
            Save business details
          </button>
        </details>
      )}
      <p role="status">{feedback}</p>
    </section>
  );
}
