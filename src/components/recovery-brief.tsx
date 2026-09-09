import {
  practitionerAccess,
  getProfile,
  getBodyHistory,
  getRecoveryNote,
} from "@/lib/recovery/store";
import {
  describeRegion,
  focusAreas,
  refreshDue,
  watchFlags,
} from "@/lib/recovery/model";
import type { User } from "@/lib/types";
import { BodyHistory } from "./recovery-body-history";
import { RecoveryNote } from "./recovery-note";
export function RecoveryBrief({
  viewer,
  clientId,
}: {
  viewer: User;
  clientId: string;
}) {
  if (!practitionerAccess(viewer, clientId)) return null;
  const profile = getProfile(viewer, clientId);
  if (!profile)
    return (
      <section className="panel">
        <h2>Recovery Room</h2>
        <p>Session preparation has not been completed.</p>
      </section>
    );
  const d = profile.answers,
    flags = watchFlags(d),
    note = getRecoveryNote(viewer, clientId);
  return (
    <section className="rr-brief" aria-label="Recovery Room therapist brief">
      <p className="eyebrow">KAMILLA’S THERAPIST BRIEF</p>
      <h2>Your Session Brief.</h2>
      <div className="rr-brief-safety">
        <strong>REVIEW BEFORE TOUCH</strong>
        {refreshDue(profile) && <p>Full profile refresh due.</p>}
        <p>
          <b>WATCH</b>{" "}
          {flags.join(" · ") || "No watch flags reported. Confirm verbally."}
        </p>
        <p>
          <b>AVOID</b>{" "}
          {d.body
            .filter((x) => x.tags.includes("Avoid"))
            .map((x) => x.area)
            .join(" · ") || "None marked"}
          {d.avoidNote && ` · ${d.avoidNote}`}
        </p>
        <p>
          <b>ALLERGY</b>{" "}
          {d.allergies === "No"
            ? "None reported"
            : d.allergyNote || "Discuss before products"}
        </p>
      </div>
      <dl className="rr-profile-grid">
        <div>
          <dt>Goal</dt>
          <dd>
            {d.goal}
            {d.goalNote && ` · ${d.goalNote}`}
          </dd>
        </div>
        <div>
          <dt>Focus</dt>
          <dd>{focusAreas(d).join(" · ") || "Whole-body relaxation"}</dd>
        </div>
        <div>
          <dt>Pressure</dt>
          <dd>
            {d.pressure} · discomfort {d.pain}/10
          </dd>
        </div>
        <div>
          <dt>Work / activity</dt>
          <dd>
            {d.work}
            {d.occupation && ` · ${d.occupation}`} · {d.activity}
          </dd>
        </div>
      </dl>
      <div className="rr-body-summary">
        <h3>Client body report</h3>
        {d.noProblemAreas && (
          <p>No pain / problem areas reported. Confirm boundaries below.</p>
        )}
        {d.body.map((b) => (
          <p key={b.area}>
            <strong>{b.area}</strong>
            <span>{describeRegion(b)}</span>
          </p>
        ))}
      </div>
      <BodyHistory history={getBodyHistory(viewer, clientId)} />
      <p>
        <strong>LAST SESSION</strong>{" "}
        {note?.body || "No Recovery Room notes yet."}
      </p>
      {d.extra && (
        <p>
          <strong>CLIENT NOTE</strong> {d.extra}
        </p>
      )}
      <details>
        <summary>Care details & consent</summary>
        <p>First massage: {d.firstMassage}</p>
        {d.body.map((x) => (
          <p key={x.area}>
            {x.area}: {describeRegion(x)}
          </p>
        ))}
        {Object.entries(d.healthNotes).map(([k, v]) => (
          <p key={k}>
            {k}: {v || "Discuss"}
          </p>
        ))}
        <p>
          Signed by {d.signature} ·{" "}
          {new Date(profile.signedAt).toLocaleString("en-US")} ·{" "}
          {profile.consentVersion}
        </p>
      </details>
      <p className="rr-caption">
        Confirmed {new Date(profile.updatedAt).toLocaleDateString("en-US")} ·
        Full review {new Date(profile.refreshedAt).toLocaleDateString("en-US")}
      </p>
      <RecoveryNote clientId={clientId} initial={note?.body ?? ""} />
    </section>
  );
}
