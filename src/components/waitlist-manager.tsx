"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, message } from "@/lib/client";
export type WaitlistEntry = {
  id: string;
  client_name: string;
  professional_id: string;
  service_id: string;
  date: string;
  status: string;
};
export function WaitlistManager({ entries }: { entries: WaitlistEntry[] }) {
  const router = useRouter(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function update(id: string, status: string) {
    setBusy(true);
    try {
      await api("/api/waitlist", { id, status }, "PATCH");
      router.refresh();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel">
      <h2>Waitlist</h2>
      <p>
        Opening alerts are queued for your messaging adapter. Offering a place
        does not reserve a time.
      </p>
      {entries.length ? (
        entries.map((e) => (
          <div className="performance-row" key={e.id}>
            <div>
              <strong>{e.client_name}</strong>
              <p>
                {e.date} · {e.professional_id === "pro-a" ? "Katie" : "Kamilla"}{" "}
                · {e.status}
              </p>
            </div>
            <div>
              {e.status === "waiting" && (
                <button
                  className="text-link"
                  disabled={busy}
                  onClick={() => void update(e.id, "offered")}
                >
                  Mark offered
                </button>
              )}
              <button
                className="text-link"
                disabled={busy}
                onClick={() => void update(e.id, "removed")}
              >
                Remove
              </button>
            </div>
          </div>
        ))
      ) : (
        <p>No clients are waiting yet.</p>
      )}
      <p role="alert">{error}</p>
    </section>
  );
}
