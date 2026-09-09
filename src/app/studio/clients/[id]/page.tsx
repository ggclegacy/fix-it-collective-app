import { Client360 } from "@/components/business/client-360";
import { ReferencePhotos } from "@/components/reference-photos";
import { canManage } from "@/lib/booking-rules";
import Link from "next/link";
import { RecoveryBrief } from "@/components/recovery-brief";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { clients } from "@/lib/staff";
import { appointmentsFor } from "@/lib/scheduling";
import { AppointmentCard } from "@/components/appointment-card";
import { ClientNotes } from "@/components/client-notes";
import { money, professionals } from "@/lib/catalog";
import type { User } from "@/lib/types";
export default async function ClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const staff = await requireUser(true);
  const { id } = await params;
  const c = clients(staff).find((c) => c.id === id);
  if (!c) notFound();
  const user = db()
    .prepare(
      "SELECT id,name,email,phone,role,marketing,preferred_professional FROM users WHERE id=?",
    )
    .get(id) as User;
  const notes = db()
    .prepare(
      "SELECT id,body,visibility,created_at FROM notes WHERE client_id=? AND author_id=? ORDER BY created_at DESC",
    )
    .all(id, staff.id) as {
    id: string;
    body: string;
    visibility: string;
    created_at: string;
  }[];
  const forms = db()
    .prepare(
      "SELECT f.id,f.form_key,f.version,f.answers,f.created_at FROM form_responses f JOIN appointments a ON a.id=f.appointment_id WHERE f.client_id=? AND (?='owner' OR a.professional_id IN (SELECT professional_id FROM staff_assignments WHERE user_id=?)) ORDER BY f.created_at DESC",
    )
    .all(id, staff.role, staff.id) as {
    id: string;
    form_key: string;
    version: string;
    answers: string;
    created_at: string;
  }[];
  return (
    <>
      <Link className="text-link" href="/studio/clients">
        ← All clients
      </Link>
      <div className="workspace-heading">
        <div>
          <p className="eyebrow">CLIENT PROFILE</p>
          <h1>{c.name}</h1>
          <p>
            {c.email} {c.phone && `· ${c.phone}`}
          </p>
        </div>
        <Link className="button navy" href={`/book?client=${id}`}>
          Book a visit ↗
        </Link>
      </div>
      <div className="metrics">
        <div>
          <span>Completed visits</span>
          <strong>{c.visits}</strong>
        </div>
        <div>
          <span>Completed service value</span>
          <strong>{money(c.value)}</strong>
        </div>
        <div>
          <span>Cancellations</span>
          <strong>{c.cancellations}</strong>
        </div>
        <div>
          <span>No-shows</span>
          <strong>{c.no_shows}</strong>
        </div>
      </div>
      <Client360 user={staff} id={id} />
      {canManage(staff, "pro-a") && <ReferencePhotos clientId={id} />}
      <RecoveryBrief viewer={staff} clientId={id} />
      <div className="account-grid">
        <section>
          <div className="list-heading">
            <h2>Visit timeline</h2>
          </div>
          {appointmentsFor(staff)
            .filter((a) => a.client_id === user.id)
            .reverse()
            .map((a) => (
              <AppointmentCard key={a.id} appointment={a} staff />
            ))}
          <div className="list-heading">
            <h2>Intake & acknowledgments</h2>
          </div>
          {forms.length ? (
            forms.map((f) => {
              const answers = JSON.parse(f.answers) as {
                acknowledged: boolean;
                intake: string;
              };
              return (
                <div key={f.id} className="panel form-response">
                  <span className="eyebrow">
                    {f.form_key} · {f.version}
                  </span>
                  <p>
                    Policy acknowledged: {answers.acknowledged ? "Yes" : "No"}
                  </p>
                  <p>{answers.intake || "No additional intake notes."}</p>
                  <small>
                    {new Date(f.created_at).toLocaleDateString("en-US")}
                  </small>
                </div>
              );
            })
          ) : (
            <p className="empty-state">No intake forms on file.</p>
          )}
        </section>
        <aside>
          <div className="quiet-panel">
            <p className="eyebrow">PREFERENCES</p>
            <p>
              Professional:{" "}
              {professionals.find((p) => p.id === user.preferred_professional)
                ?.name ?? "No preference"}
            </p>
            <p>Email updates: {user.marketing ? "Opted in" : "Not opted in"}</p>
            <p>
              {c.next_visit ? "Future visit booked" : "No future visit booked"}
            </p>
          </div>
          <ClientNotes clientId={id} notes={notes.map((row) => ({ ...row }))} />
        </aside>
      </div>
    </>
  );
}
