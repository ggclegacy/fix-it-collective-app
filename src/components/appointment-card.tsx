"use client";
import { BrandEmblem } from "./brand-emblem";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { DateTime } from "luxon";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import { services, professionals, studio, money } from "@/lib/catalog";
import { brandForService } from "@/lib/brands";
import type { Appointment } from "@/lib/types";
import { api, message } from "@/lib/client";
export function AppointmentCard({
  appointment: a,
  staff = false,
}: {
  appointment: Appointment;
  staff?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [intake, setIntake] = useState("");
  const [cancel, setCancel] = useState(false);
  const date = DateTime.fromISO(a.start_at).setZone(studio.timezone);
  async function change(status: string) {
    setBusy(true);
    setError("");
    try {
      await api(`/api/appointments/${a.id}`, { status }, "PATCH");
      setCancel(false);
      router.refresh();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <article
      className={`appointment-card ${a.status !== "confirmed" ? "past" : ""}`}
    >
      <div className="appointment-date">
        <span>{date.toFormat("LLL")}</span>
        <strong>{date.toFormat("dd")}</strong>
        <span>{date.toFormat("ccc")}</span>
      </div>
      <div className="appointment-content">
        <p className="brand-label appointment-brand">
          <BrandEmblem
            brand={services.find((s) => s.id === a.service_id)?.brand}
            size={36}
            decorative
          />
          {brandForService(services.find((s) => s.id === a.service_id)).name}
        </p>
        <div className="appointment-top">
          <p className="eyebrow">{date.toFormat("h:mm a")} · CENTRAL TIME</p>
          <span className={`status ${a.status}`}>
            {(a.stage ?? a.status).replaceAll("_", " ")}
          </span>
        </div>
        <h3>
          {services.find((s) => s.id === a.service_id)?.name ?? a.service_id}
        </h3>
        <p>
          {staff ? (
            <Link href={`/studio/clients/${a.client_id}`}>{a.client_name}</Link>
          ) : (
            professionals.find((p) => p.id === a.professional_id)?.name
          )}{" "}
          <span>·</span>{" "}
          {Math.round(DateTime.fromISO(a.end_at).diff(date, "minutes").minutes)}{" "}
          min <span>·</span> {money(a.price)}
        </p>
        {staff && (
          <small>
            {professionals.find((p) => p.id === a.professional_id)?.name}
          </small>
        )}
        <p>
          Payment: {a.payment_status?.replaceAll("_", " ") ?? "not recorded"} ·
          Deposit {money(a.deposit ?? 0)} · Remaining{" "}
          {money(a.price - (a.paid ?? 0))}
        </p>
        {a.professional_id === "pro-b" && (
          <p>
            Intake: {a.intake_id ? "Complete" : "Awaiting intake"}{" "}
            {a.intake_id && (
              <button
                className="text-link"
                onClick={async () => {
                  setBusy(true);
                  try {
                    const r = await fetch(`/api/intake?id=${a.intake_id}`);
                    const d = await r.json();
                    if (!r.ok) throw new Error(d.error);
                    setIntake(d.answers);
                  } catch (e) {
                    setError(message(e));
                  } finally {
                    setBusy(false);
                  }
                }}
                disabled={busy}
              >
                Review confidential intake
              </button>
            )}
          </p>
        )}
        {intake && (
          <details open className="policy-card">
            <summary>Confidential intake</summary>
            <p style={{ whiteSpace: "pre-wrap" }}>{intake}</p>
            <button onClick={() => setIntake("")}>Close intake</button>
          </details>
        )}
        <div className="appointment-actions">
          {staff && <Link className="text-link" href={`/studio/workspace/${a.id}`}>{a.professional_id === "pro-b" ? "Session Mode" : "Chair Mode"} ↗</Link>}
          {!staff &&
            a.professional_id === "pro-b" &&
            a.status === "confirmed" && (
              <Link href="/recovery/prepare" className="text-link">
                Prepare your session ↗
              </Link>
            )}
          {a.status === "confirmed" ? (
            <>
              <Link href={`/book?reschedule=${a.id}`} className="text-link">
                <CalendarDays size={15} /> Move visit
              </Link>
              <button
                className="text-link"
                disabled={busy}
                onClick={() => setCancel(!cancel)}
              >
                Cancel
              </button>
              {staff && (
                <>
                  {["confirmed", "checked_in"].includes(
                    a.stage ?? a.status,
                  ) && (
                    <button
                      className="text-link"
                      disabled={busy || date > DateTime.now()}
                      onClick={() =>
                        void change(
                          (a.stage ?? a.status) === "checked_in"
                            ? "in_service"
                            : "checked_in",
                        )
                      }
                    >
                      {(a.stage ?? a.status) === "checked_in"
                        ? "Start service"
                        : "Check in"}
                    </button>
                  )}
                  <button
                    disabled={busy || date > DateTime.now()}
                    className="text-link"
                    onClick={() => void change("completed")}
                  >
                    Complete
                  </button>
                  <button
                    disabled={busy || date > DateTime.now()}
                    className="text-link"
                    onClick={() => void change("no_show")}
                  >
                    No-show
                  </button>
                </>
              )}
            </>
          ) : (
            <Link
              className="text-link"
              href={`/book?service=${a.service_id}&professional=${a.professional_id}${staff ? `&client=${a.client_id}` : ""}`}
            >
              Book again <ArrowUpRight size={16} />
            </Link>
          )}
        </div>
        {cancel && (
          <div className="cancel-confirm">
            <p>
              Cancel this appointment? The time will become available again.
            </p>
            <button
              className="button danger small"
              disabled={busy}
              onClick={() => void change("cancelled")}
            >
              {busy ? "Cancelling…" : "Yes, cancel visit"}
            </button>
            <button className="text-link" onClick={() => setCancel(false)}>
              Keep visit
            </button>
          </div>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </div>
    </article>
  );
}
