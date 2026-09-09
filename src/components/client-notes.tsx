"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, message } from "@/lib/client";
export function ClientNotes({
  clientId,
  notes,
}: {
  clientId: string;
  notes: { id: string; body: string; visibility: string; created_at: string }[];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState("internal");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="panel notes-panel">
      <h3>The details worth keeping</h3>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await api("/api/staff", {
              action: "note",
              clientId,
              body,
              visibility,
            });
            setBody("");
            router.refresh();
          } catch (e) {
            setError(message(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Service note
          <textarea
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            maxLength={3000}
            placeholder="Preferences, technique, formulas, or aftercare…"
          />
        </label>
        <label>
          Who can see this?
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
          >
            <option value="internal">Studio team only</option>
            <option value="client">Share with client</option>
          </select>
        </label>
        <button className="button navy full" disabled={busy}>
          {busy ? "Saving…" : "Save note"}
        </button>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </form>
      <div className="notes-list">
        {notes.map((n) => (
          <article key={n.id}>
            <span className="status">
              {n.visibility === "internal"
                ? "Internal only"
                : "Shared with client"}
            </span>
            <p>{n.body}</p>
            <small>{new Date(n.created_at).toLocaleDateString("en-US")}</small>
          </article>
        ))}
      </div>
    </div>
  );
}
