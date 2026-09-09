"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, message } from "@/lib/client";
export function RecoveryNote({
  clientId,
  initial,
}: {
  clientId: string;
  initial: string;
}) {
  const [body, setBody] = useState(initial),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState("");
  const router = useRouter();
  return (
    <details>
      <summary>Update prior-session handoff</summary>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setStatus("");
          try {
            await api("/api/recovery", { clientId, body }, "PATCH");
            setStatus("Recovery note saved.");
            router.refresh();
          } catch (e) {
            setStatus(message(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Brief treatment response and next-session considerations
          <textarea
            maxLength={2000}
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </label>
        <p className="rr-caption">
          Available only to authorized Recovery Room practitioners. Each saved handoff is retained in history. Use Session Mode for structured SOAP records.
        </p>
        <button className="button navy" disabled={busy}>
          {busy ? "Saving…" : "Save Recovery note"}
        </button>
        <p role="status">{status}</p>
      </form>
    </details>
  );
}
