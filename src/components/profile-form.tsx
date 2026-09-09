"use client";
import { useState } from "react";
import { api, message } from "@/lib/client";
import type { User } from "@/lib/types";
import { professionals } from "@/lib/catalog";
export function ProfileForm({ user }: { user: User }) {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  return (
    <form
      className="profile-form panel"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setFeedback("");
        const f = new FormData(e.currentTarget);
        try {
          await api(
            "/api/profile",
            {
              name: f.get("name"),
              phone: f.get("phone"),
              marketing: f.get("marketing") === "on",
              preferredProfessional: f.get("professional") || null,
            },
            "PATCH",
          );
          setFeedback("Your preferences are saved.");
        } catch (e) {
          setFeedback(message(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>The essentials</h2>
      <div className="form-grid">
        <label>
          Name
          <input
            name="name"
            defaultValue={user.name}
            required
            minLength={2}
            maxLength={100}
            autoComplete="name"
          />
        </label>
        <label>
          Email
          <input value={user.email} readOnly type="email" />
          <small>Email changes will require verification after launch.</small>
        </label>
        <label>
          Phone
          <input
            name="phone"
            type="tel"
            defaultValue={user.phone}
            maxLength={30}
            autoComplete="tel"
          />
        </label>
        <label>
          Preferred professional
          <select
            name="professional"
            defaultValue={user.preferred_professional ?? ""}
          >
            <option value="">No preference</option>
            {professionals.map((p) => (
              <option value={p.id} key={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <h3>Stay in the loop</h3>
      <label className="check-row">
        <input
          type="checkbox"
          name="marketing"
          defaultChecked={Boolean(user.marketing)}
        />
        <span>I’d like updates and rebooking suggestions by email.</span>
      </label>
      <p className="muted">
        Your preference is saved. Email, SMS, and push delivery are not
        connected.
      </p>
      <button disabled={busy} className="button navy">
        {busy ? "Saving…" : "Save preferences"}
      </button>
      {feedback && <p role="status">{feedback}</p>}
    </form>
  );
}
