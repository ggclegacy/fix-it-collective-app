"use client";
import { areas as bodyAreas } from "@/lib/recovery/model";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BusinessForm, text, optionalNumber } from "./forms";
import { api, message } from "@/lib/client";
import type { Relationship, Soap } from "@/lib/business/records";
export function RelationshipForm({
  clientId,
  professionalId,
  initial,
}: {
  clientId: string;
  professionalId: string;
  initial: Relationship;
}) {
  return (
    <BusinessForm
      action="relationship"
      build={(d) => ({
        clientId,
        professionalId,
        occupation: text(d, "occupation"),
        preferences: text(d, "preferences"),
        tags: text(d, "tags"),
        returnDays: optionalNumber(d, "days"),
        referralSource: text(d, "source"),
        communication: text(d, "communication"),
      })}
    >
      <p className="os-muted">
        Relationship details only. Keep health information in the protected
        intake and SOAP workflow.
      </p>
      <label>
        Service preferences
        <textarea
          name="preferences"
          defaultValue={initial.preferences}
          maxLength={2000}
        />
      </label>
      <div className="os-fields">
        <label>
          Occupation (if provided)
          <input
            name="occupation"
            defaultValue={initial.occupation}
            maxLength={160}
          />
        </label>
        <label>
          Tags
          <input name="tags" defaultValue={initial.tags} maxLength={500} />
        </label>
        <label>
          Normal return interval (days)
          <input
            name="days"
            type="number"
            min="1"
            max="365"
            defaultValue={initial.return_days ?? ""}
          />
        </label>
        <label>
          Referral source
          <input
            name="source"
            defaultValue={initial.referral_source}
            maxLength={120}
          />
        </label>
      </div>
      <label>
        Communication preference
        <input
          name="communication"
          defaultValue={initial.communication}
          maxLength={120}
        />
      </label>
    </BusinessForm>
  );
}
export function ServiceNoteForm({ id }: { id: string }) {
  return (
    <BusinessForm
      action="service_note"
      label="Save service record"
      build={(d) => ({
        id,
        note: {
          body: text(d, "body"),
          products: text(d, "products"),
          returnDays: optionalNumber(d, "days"),
        },
      })}
    >
      <label>
        Cut, beard, style & service notes
        <textarea name="body" required maxLength={4000} rows={5} />
      </label>
      <label>
        Products used / recommended
        <input name="products" maxLength={1000} />
      </label>
      <label>
        Recommended return interval (days)
        <input name="days" type="number" min="1" max="365" />
      </label>
      <p className="os-muted">
        Each save adds a service record to this visit’s history.
      </p>
    </BusinessForm>
  );
}
const areas = [
  "Neck",
  "Shoulders",
  "Upper back",
  "Lower back",
  "Arms",
  "Hands",
  "Hips",
  "Legs",
  "Feet",
];
export function SoapForm({
  id,
  revision,
  initial,
}: {
  id: string;
  revision: number;
  initial?: Soap;
}) {
  return (
    <BusinessForm
      action="soap"
      label={`Save SOAP revision ${revision + 1}`}
      success="Encrypted SOAP revision saved. Previous versions retained."
      build={(d) => ({
        id,
        revision,
        note: {
          subjective: text(d, "subjective"),
          objective: text(d, "objective"),
          assessment: text(d, "assessment"),
          plan: text(d, "plan"),
          areas: d.getAll("areas").map(String),
          techniques: text(d, "techniques"),
          pressure: text(d, "pressure"),
          response: text(d, "response"),
          followUpDays: optionalNumber(d, "days"),
        },
      })}
    >
      <div className="os-fields">
        {(["subjective", "objective", "assessment", "plan"] as const).map(
          (k, i) => (
            <label key={k}>
              {
                [
                  "Subjective · Client report & session goals",
                  "Objective · Findings & observations",
                  "Assessment · Treatment response",
                  "Plan · Next steps & follow-up",
                ][i]
              }
              <textarea
                name={k}
                required
                maxLength={6000}
                rows={5}
                defaultValue={initial?.[k] ?? ""}
              />
            </label>
          ),
        )}
      </div>
      <fieldset>
        <legend>Areas treated</legend>
        <div className="os-checks">
          {Array.from(
            new Set([
              ...bodyAreas,
              ...areas.filter((a) => initial?.areas.includes(a)),
            ]),
          ).map((a) => (
            <label key={a}>
              <input
                type="checkbox"
                name="areas"
                value={a}
                defaultChecked={initial?.areas.includes(a)}
              />
              {a}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="os-fields">
        <label>
          Techniques
          <input
            name="techniques"
            maxLength={1000}
            defaultValue={initial?.techniques ?? ""}
          />
        </label>
        <label>
          Pressure
          <input
            name="pressure"
            maxLength={100}
            defaultValue={initial?.pressure ?? ""}
          />
        </label>
        <label>
          Response
          <textarea
            name="response"
            maxLength={2000}
            defaultValue={initial?.response ?? ""}
          />
        </label>
        <label>
          Recommended follow-up (days)
          <input
            name="days"
            type="number"
            min="1"
            max="365"
            defaultValue={initial?.followUpDays ?? ""}
          />
        </label>
      </div>
    </BusinessForm>
  );
}
export function Lifecycle({
  id,
  stage,
  started,
}: {
  id: string;
  stage: string;
  started: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const router = useRouter();
  const next: Record<string, [string, string][]> = {
    requested: [["confirmed", "Confirm request"]],
    booked: [["confirmed", "Confirm"]],
    confirmed: [["checked_in", "Check in"]],
    checked_in: [["in_service", "Start service"]],
    in_service: [["completed", "Complete service"]],
    completed: [["checked_out", "Finish checkout"]],
  };
  return (
    <div>
      <div className="os-session-steps">
        {(next[stage] ?? []).map(([status, label]) => (
          <button
            className="button navy"
            key={status}
            disabled={busy || (!started && !["confirmed"].includes(status))}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await api(`/api/appointments/${id}`, { status }, "PATCH");
                router.refresh();
              } catch (e) {
                setError(message(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Saving…" : label}
          </button>
        ))}
      </div>
      {!started && (
        <p className="os-muted">
          Service actions become available at the appointment start time.
        </p>
      )}
      {stage === "completed" && (
        <p className="os-muted">
          Create and settle the checkout before finishing the visit.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
export function MessageDraft({
  clientId,
  professionalId,
}: {
  clientId: string;
  professionalId: string;
}) {
  return (
    <BusinessForm
      action="message_draft"
      label="Save message draft"
      success="Draft saved. No message has been sent."
      build={(d) => ({
        clientId,
        professionalId,
        channel: text(d, "channel"),
        body: text(d, "body"),
      })}
    >
      <label>
        Channel
        <select name="channel">
          <option value="email">Email</option>
          <option value="sms">Text message</option>
        </select>
      </label>
      <label>
        Message
        <textarea name="body" required maxLength={3000} />
      </label>
      <p className="os-muted">
        Draft only. Delivery integration and consent checks are required before
        sending.
      </p>
    </BusinessForm>
  );
}
export function SourceForm({ id, initial }: { id: string; initial: string }) {
  return (
    <BusinessForm
      action="source"
      label="Save booking source"
      build={(d) => ({ id, source: text(d, "source") })}
    >
      <label>
        Booking source
        <input name="source" defaultValue={initial} maxLength={100} required />
      </label>
    </BusinessForm>
  );
}
