"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { DateTime } from "luxon";
import { ArrowLeft, ArrowRight, Check, CalendarDays } from "lucide-react";
import {
  consultationSummary,
  type ProviderProfile,
} from "@/lib/provider-profiles";
import { services, professionals, policy, studio } from "@/lib/catalog";
import type { Appointment, Slot, User } from "@/lib/types";
import { api, message } from "@/lib/client";
import { BookingSummary } from "./booking-summary";
import { BookingConfirmation } from "./booking-confirmation";
import { BookingSelection } from "./booking-selection";
import { SigninForm } from "./signin-form";
export function BookingFlow({
  user,
  demo,
  initialService,
  initialProfessional,
  appointment,
  client,
}: {
  user: User | null;
  demo: boolean;
  initialService?: string;
  initialProfessional?: string;
  appointment?: Appointment;
  client?: Pick<User, "id" | "name">;
}) {
  const [serviceId, setService] = useState(
    services.some((s) => s.id === initialService) ? initialService! : "",
  );
  const [professionalId, setProfessional] = useState(
    professionals.some((p) => p.id === initialProfessional)
      ? initialProfessional!
      : "any",
  );
  const [step, setStep] = useState(appointment ? 2 : 0);
  const [addonIds, setAddons] = useState<string[]>(
    appointment ? JSON.parse(appointment.addons) : [],
  );
  const [date, setDate] = useState(
    DateTime.now().setZone(studio.timezone).plus({ days: 1 }).toISODate()!,
  );
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState("");
  const [ack, setAck] = useState(false);
  const [intake, setIntake] = useState("");
  const service = services.find((s) => s.id === serviceId);
  const professional = professionals.find(
    (p) => p.id === (slot?.professionalId ?? professionalId),
  );
  useEffect(() => {
    if (step !== 2 || !serviceId) return;
    const abort = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setSlot(null);
      setError("");
      const q = new URLSearchParams({
        service: serviceId,
        professional: professionalId,
        date,
        addons: addonIds.join(","),
      });
      if (appointment) q.set("exclude", appointment.id);
      fetch(`/api/availability?${q}`, { signal: abort.signal })
        .then(async (r) => {
          const data = await r.json();
          if (!r.ok) throw new Error(data.error);
          setSlots(data.slots);
        })
        .catch((e) => {
          if (!abort.signal.aborted) setError(message(e));
        })
        .finally(() => {
          if (!abort.signal.aborted) setLoading(false);
        });
    }, 0);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [step, serviceId, professionalId, date, addonIds, appointment]);
  const displayed =
    professionalId === "any"
      ? slots.filter((s, i, a) => a.findIndex((x) => x.start === s.start) === i)
      : slots;
  async function useStyleBrief() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/provider-profile?provider=katie", {
        cache: "no-store",
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      if (!data.saved)
        throw new Error("Save your Grooming DNA in Katie’s Studio first.");
      setIntake(
        consultationSummary(data.saved.profile as ProviderProfile).slice(
          0,
          2000,
        ),
      );
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function confirm() {
    if (!slot) return;
    setBusy(true);
    setError("");
    try {
      const booking = {
        serviceId,
        professionalId: slot.professionalId,
        start: slot.start,
        addonIds,
        acknowledged: ack,
        intake,
      };
      const result = await api<{ id: string }>(
        appointment
          ? `/api/appointments/${appointment.id}`
          : client
            ? "/api/staff"
            : "/api/appointments",
        appointment
          ? { ...booking, action: "reschedule" }
          : client
            ? { action: "book", clientId: client.id, booking }
            : booking,
        appointment ? "PATCH" : "POST",
      );
      setConfirmed(result.id);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  if (confirmed && slot)
    return (
      <BookingConfirmation
        service={service}
        professional={professional}
        slot={slot}
        confirmed={confirmed}
        appointment={appointment}
        client={client}
        user={user}
      />
    );
  return (
    <>
      <div className="booking-heading">
        <p className="eyebrow">
          {appointment
            ? "A CHANGE OF PLANS"
            : client
              ? `A VISIT FOR ${client.name.toUpperCase()}`
              : "MAKE TIME FOR YOURSELF"}
        </p>
        <h1>{appointment ? "Find a new time." : "Your next good day."}</h1>
        <p>A few simple choices. A visit that feels like you.</p>
      </div>
      <ol className="steps">
        {["Your service", "Your professional", "Your time", "The details"].map(
          (s, i) => (
            <li
              key={s}
              className={step === i ? "active" : step > i ? "done" : ""}
            >
              <button
                disabled={i > step || busy}
                onClick={() => {
                  setStep(i);
                  setError("");
                }}
                aria-current={step === i ? "step" : undefined}
              >
                <span>{step > i ? <Check size={14} /> : i + 1}</span>
                {s}
              </button>
            </li>
          ),
        )}
      </ol>
      <div className="booking-layout">
        <section className="booking-main">
          <div className="step-heading">
            <h2>
              {
                [
                  "What brings you in?",
                  "Find your person.",
                  "Make it your time.",
                  "Make it yours.",
                ][step]
              }
            </h2>
            <span>0{step + 1} / 04</span>
          </div>
          {step < 2 && (
            <BookingSelection
              step={step}
              service={service}
              serviceId={serviceId}
              professionalId={professionalId}
              addonIds={addonIds}
              setService={setService}
              setAddons={setAddons}
              setSlot={setSlot}
              setProfessional={setProfessional}
            />
          )}
          {step === 2 && (
            <>
              <label className="date-label">
                Choose a day
                <input
                  aria-label="Appointment date"
                  type="date"
                  value={date}
                  min={DateTime.now().setZone(studio.timezone).toISODate()!}
                  max={DateTime.now()
                    .setZone(studio.timezone)
                    .plus({ days: policy.horizonDays })
                    .toISODate()!}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setSlot(null);
                    setSlots([]);
                  }}
                />
              </label>
              <p className="muted">
                All times in Central Time · {studio.timezone}
              </p>
              <div className="time-heading">
                <h3>{DateTime.fromISO(date).toFormat("cccc, LLLL d")}</h3>
                <span>
                  {loading ? "Checking…" : `${displayed.length} openings`}
                </span>
              </div>
              {loading ? (
                <p role="status" className="empty-state">
                  Finding your next opening…
                </p>
              ) : displayed.length ? (
                <div className="slots">
                  {displayed.map((s) => (
                    <button
                      key={s.start}
                      aria-pressed={slot?.start === s.start}
                      className={slot?.start === s.start ? "selected" : ""}
                      onClick={() => setSlot(s)}
                    >
                      {DateTime.fromISO(s.start)
                        .setZone(studio.timezone)
                        .toFormat("h:mm a")}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <CalendarDays />
                  <h3>A full day. A fresh possibility.</h3>
                  <p>
                    No openings on this date. Try another day or choose best
                    available.
                  </p>
                  <button
                    className="button outline"
                    onClick={() => {
                      setDate(
                        DateTime.fromISO(date).plus({ days: 1 }).toISODate()!,
                      );
                      setSlots([]);
                    }}
                  >
                    Try the next day <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
          {step === 3 &&
            (!user ? (
              <>
                <p>Sign in or create your space to save this visit.</p>
                <SigninForm
                  inline
                  demo={demo}
                  next={`/book?service=${serviceId}&professional=${professionalId}`}
                />
              </>
            ) : (
              <div className="details-form">
                <div className="identity-card">
                  <span className="avatar">
                    {(client?.name ?? user.name).charAt(0)}
                  </span>
                  <div>
                    <h3>{client?.name ?? user.name}</h3>
                    <p>
                      {client ? "Booking on behalf of this client" : user.email}
                    </p>
                  </div>
                  {!client && <Link href="/account/profile">Edit profile</Link>}
                </div>
                <label>
                  Anything you’d like us to know?{" "}
                  <span className="muted">(optional)</span>
                  <textarea
                    value={intake}
                    onChange={(e) => setIntake(e.target.value)}
                    maxLength={2000}
                    placeholder="Your style goals, preferences, or questions."
                    rows={4}
                  />
                </label>
                {!client && (
                  <div className="notice">
                    <button
                      type="button"
                      className="text-link"
                      disabled={busy}
                      onClick={useStyleBrief}
                    >
                      Use my saved grooming brief
                    </button>
                    <p>
                      This replaces the notes above. Review before confirming:
                      booking shares these notes with studio staff.
                    </p>
                  </div>
                )}
                <div className="policy-card">
                  <h3>A note before you book</h3>
                  <p>{policy.text}</p>
                  <Link href="/policies" className="text-link">
                    Read visit policies ↗
                  </Link>
                </div>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={ack}
                    onChange={(e) => setAck(e.target.checked)}
                  />
                  <span>
                    I acknowledge the preview booking policy and understand this
                    is a sample appointment.
                  </span>
                </label>
                <div className="notice">
                  No payment is due. Card details are never requested in this
                  preview.
                </div>
              </div>
            ))}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <div className="booking-controls">
            {step > 0 ? (
              <button
                className="text-link"
                disabled={busy}
                onClick={() => {
                  setStep(step - 1);
                  setError("");
                }}
              >
                <ArrowLeft size={17} /> Back
              </button>
            ) : (
              <span />
            )}
            {step < 3 ? (
              <button
                className="button navy"
                disabled={!serviceId || (step === 2 && (!slot || loading))}
                onClick={() => {
                  setStep(step + 1);
                  setError("");
                }}
              >
                Continue <ArrowRight size={18} />
              </button>
            ) : (
              user && (
                <button
                  className="button navy"
                  disabled={busy || !ack || !slot}
                  onClick={() => void confirm()}
                >
                  {busy
                    ? "Saving your visit…"
                    : appointment
                      ? "Confirm new time"
                      : "Confirm preview visit"}{" "}
                  <ArrowRight size={18} />
                </button>
              )
            )}
          </div>
        </section>
        <BookingSummary
          service={service}
          professional={professional}
          slot={slot}
          addonIds={addonIds}
        />
      </div>
    </>
  );
}
