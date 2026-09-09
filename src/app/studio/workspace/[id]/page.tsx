import Link from "next/link";
import { notFound } from "next/navigation";
import { DateTime } from "luxon";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { appointmentsFor } from "@/lib/scheduling";
import { services, studio } from "@/lib/catalog";
import { practitionerAccess } from "@/lib/recovery/store";
import { soapHistory, relationship } from "@/lib/business/records";
import { readProviderProfile } from "@/lib/provider-store";
import { consultationSummary } from "@/lib/provider-profiles";
import { RecoveryBrief } from "@/components/recovery-brief";
import { ReferencePhotos } from "@/components/reference-photos";
import {
  Lifecycle,
  SoapForm,
  ServiceNoteForm,
  SourceForm,
} from "@/components/business/client-records";
import { readIntake } from "@/lib/private-intake";
export default async function Workspace({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser(true),
    { id } = await params,
    all = appointmentsFor(user),
    a = all.find((a) => a.id === id);
  if (!a) notFound();
  const massage = a.professional_id === "pro-b",
    clinical = massage && practitionerAccess(user, a.client_id),
    history = clinical ? soapHistory(user, id) : [],
    priorVisits = all
      .filter(
        (v) =>
          v.client_id === a.client_id &&
          v.professional_id === a.professional_id &&
          v.start_at < a.start_at &&
          v.status === "completed",
      )
      .reverse(),
    profile = !massage ? readProviderProfile(a.client_id, "katie") : null,
    r = relationship(user, a.client_id, a.professional_id),
    stage = a.stage ?? a.status,
    previousClinical = clinical
      ? priorVisits
          .slice(0, 5)
          .map((v) => ({ visit: v, notes: soapHistory(user, v.id) }))
      : [];
  const serviceNotes = !massage
    ? (db()
        .prepare(
          "SELECT n.*,a.start_at FROM service_notes n JOIN appointments a ON a.id=n.appointment_id WHERE a.client_id=? AND a.professional_id=? ORDER BY n.created_at DESC",
        )
        .all(a.client_id, a.professional_id) as {
        id: string;
        body: string;
        products: string;
        return_days: number | null;
        created_at: string;
      }[])
    : [];
  const source =
    (
      db()
        .prepare(
          "SELECT source FROM appointment_sources WHERE appointment_id=?",
        )
        .get(id) as { source: string } | undefined
    )?.source ?? "unknown";
  return (
    <>
      <Link className="text-link" href="/studio">
        ← Today
      </Link>
      <header className="os-hero">
        <div>
          <p className="eyebrow">
            {massage ? "KAMILLA · SESSION MODE" : "KATIE · CHAIR MODE"}
          </p>
          <h1>{a.client_name}</h1>
          <p>
            {services.find((s) => s.id === a.service_id)?.name} ·{" "}
            {DateTime.fromISO(a.start_at)
              .setZone(studio.timezone)
              .toFormat("LLL d, h:mm a")}{" "}
            CT
          </p>
        </div>
        <span className="os-tag">{stage.replaceAll("_", " ")}</span>
      </header>
      <nav className="os-session-steps" aria-label="Visit workflow">
        <a href="#prep">01 · Prepare</a>
        <a href="#work">02 · {massage ? "Session & SOAP" : "Service record"}</a>
        <Link href={`/studio/operations?appointment=${id}`}>03 · Checkout</Link>
        <Link
          href={`/book?client=${a.client_id}&service=${a.service_id}&professional=${a.professional_id}`}
        >
          04 · Rebook
        </Link>
      </nav>
      <Lifecycle
        id={id}
        stage={stage}
        started={DateTime.fromISO(a.start_at) <= DateTime.now()}
      />
      <section className="os-panel" id="prep">
        <div className="os-section-head">
          <h2>Before you begin.</h2>
          <Link href={`/studio/clients/${a.client_id}`}>Client 360 ↗</Link>
        </div>
        <p>
          Last completed visit:{" "}
          {priorVisits[0]
            ? DateTime.fromISO(priorVisits[0].start_at)
                .setZone(studio.timezone)
                .toFormat("LLLL d, yyyy")
            : "First recorded visit"}
        </p>
        <p>
          Typical return interval:{" "}
          {r.return_days ? `${r.return_days} days` : "Not recorded yet"}
        </p>
        {r.preferences && <p>{r.preferences}</p>}
        {profile && (
          <p style={{ whiteSpace: "pre-wrap" }}>
            {consultationSummary(profile.profile)}
          </p>
        )}
        {!massage && serviceNotes[0] && (
          <div className="quiet-panel">
            <p className="eyebrow">LAST SERVICE RECORD</p>
            <p>{serviceNotes[0].body}</p>
            <p>Products: {serviceNotes[0].products || "Not recorded"}</p>
          </div>
        )}
        {massage && !clinical && (
          <p>
            Clinical preparation and treatment records are restricted to
            explicitly authorized practitioners.
          </p>
        )}
        {clinical && (
          <>
            <RecoveryBrief viewer={user} clientId={a.client_id} />
            {a.intake_id && (
              <details>
                <summary>Confidential booking intake</summary>
                <p style={{ whiteSpace: "pre-wrap" }}>
                  {readIntake(user, a.intake_id)}
                </p>
              </details>
            )}
          </>
        )}
      </section>
      <section className="os-panel" id="work">
        <h2>
          {massage
            ? "A focused session. A complete record."
            : "Details worth remembering."}
        </h2>
        {massage ? (
          clinical ? (
            <>
              <SoapForm
                key={`${id}:${history[0]?.revision ?? 0}`}
                id={id}
                revision={history[0]?.revision ?? 0}
                initial={history[0]?.note}
              />
              <h3>SOAP revision history</h3>
              {history.map((h) => (
                <details key={h.id}>
                  <summary>
                    Revision {h.revision} ·{" "}
                    {h.createdAt.slice(0, 16).replace("T", " ")} UTC
                  </summary>
                  <dl className="os-soap-note">
                    {Object.entries(h.note).map(([k, v]) => (
                      <div key={k}>
                        <dt>{k}</dt>
                        <dd>
                          {Array.isArray(v)
                            ? v.join(", ")
                            : String(v ?? "Not recorded")}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </details>
              ))}
              {previousClinical.map((p) => (
                <details key={p.visit.id}>
                  <summary>
                    Prior session · {p.visit.start_at.slice(0, 10)}
                  </summary>
                  {p.notes[0] ? (
                    <dl className="os-soap-note">
                      {Object.entries(p.notes[0].note).map(([k, v]) => (
                        <div key={k}>
                          <dt>{k}</dt>
                          <dd>
                            {Array.isArray(v)
                              ? v.join(", ")
                              : String(v ?? "Not recorded")}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p>No structured SOAP record for this visit.</p>
                  )}
                </details>
              ))}
            </>
          ) : (
            <p className="os-muted">
              Clinical permission is required to view or write SOAP notes.
            </p>
          )
        ) : (
          <>
            <ServiceNoteForm id={id} />
            <ReferencePhotos clientId={a.client_id} />
            <h3>Style & product history</h3>
            <div className="os-history">
              {serviceNotes.map((n) => (
                <div key={n.id}>
                  <small>{n.created_at.slice(0, 10)}</small>
                  <p>{n.body}</p>
                  <p>
                    Products: {n.products || "Not recorded"} · Return:{" "}
                    {n.return_days ?? "Not recorded"} days
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
      <details className="os-panel">
        <summary>Booking source</summary>
        <SourceForm id={id} initial={source} />
      </details>
    </>
  );
}
