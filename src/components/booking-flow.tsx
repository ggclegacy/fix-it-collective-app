"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { DateTime } from "luxon";
import { ArrowLeft, ArrowRight, Check, CalendarDays } from "lucide-react";
import {
  consultationSummary,
  type ProviderProfile,
} from "@/lib/provider-profiles";
import {
  services,
  professionals,
  policy,
  studio,
  type Service,
} from "@/lib/catalog";
import type { Appointment, Slot, User } from "@/lib/types";
import { api, message } from "@/lib/client";
import { BookingSummary } from "./booking-summary";
import { BookingConfirmation } from "./booking-confirmation";
import { BookingSelection } from "./booking-selection";
import { ReferencePhotos } from "./reference-photos";
import { SigninForm } from "./signin-form";
export function BookingFlow({
  user,
  demo,
  initialService,
  initialProfessional,
  appointment,
  client,
  catalog = services,
  business = {},
  usual,
  serviceRules = {},
}: {
  serviceRules?: Record<
    string,
    {
      cancellation_hours: number;
      deposit: number;
      card_required: number;
      horizon_days: number;
      lead_minutes: number;
      enabled: number;
    }
  >;
  catalog?: Service[];
  business?: Record<string, string>;
  usual?: Appointment;
  user: User | null;
  demo: boolean;
  initialService?: string;
  initialProfessional?: string;
  appointment?: Appointment;
  client?: Pick<User, "id" | "name">;
}) {
  const [serviceId, setService] = useState(
    catalog.some((s) => s.id === initialService) ? initialService! : "",
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
  const [requestKey] = useState(() => crypto.randomUUID());
  const [hasIntake, setHasIntake] = useState(false),
    [healthUnchanged, setHealthUnchanged] = useState(false),
    [waitlisted, setWaitlisted] = useState(false);
  useEffect(() => {
    if (!user) return;
    fetch(
      `/api/intake${client ? `?client=${encodeURIComponent(client.id)}` : ""}`,
    )
      .then((r) => r.json())
      .then((d) => setHasIntake(Boolean(d.hasIntake)))
      .catch(() => {});
  }, [user, client]);
  const service = catalog.find((s) => s.id === serviceId);
  const currentRules = serviceRules[serviceId];
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
      const r = await fetch(
        `/api/provider-profile?provider=${professionalId === "pro-b" ? "camilla" : "katie"}`,
        {
          cache: "no-store",
        },
      );
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      if (!data.saved)
        throw new Error("Save your preferences in your provider’s room first.");
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
    if (!slot || busy) return;
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
        requestKey,
        healthUnchanged,
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
        business={business}
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
      <div
        className={`booking-heading ${professionalId === "pro-b" ? "massage-booking" : "grooming-booking"}`}
      >
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
      {usual && !appointment && (
        <button
          className="button outline"
          onClick={() => {
            setProfessional(usual.professional_id);
            setService(usual.service_id);
            setStep(2);
          }}
        >
          Book my usual · same as last visit
        </button>
      )}
      {professionalId === "pro-b" && (
        <div className="notice">
          {business.therapist_license
            ? `${business.therapist_name} · Louisiana license ${business.therapist_license} · ${business.establishment_name} ${business.establishment_license}`
            : "Massage appointments await approved services, availability and license information."}
        </div>
      )}
      <ol className="steps">
        {[
          "Your professional",
          "Your goal & service",
          "Your time",
          "The details",
        ].map((s, i) => (
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
        ))}
      </ol>
      <div className="booking-layout">
        <section className="booking-main">
          <div className="step-heading">
            <h2>
              {
                [
                  "Find your person.",
                  "What brings you in?",
                  "Make it your time.",
                  "Make it yours.",
                ][step]
              }
            </h2>
            <span>0{step + 1} / 04</span>
          </div>
          {step < 2 && (
            <BookingSelection
              catalog={catalog}
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
                    .plus({
                      days: currentRules?.horizon_days ?? policy.horizonDays,
                    })
                    .toISODate()!}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setWaitlisted(false);
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
                  {user && professionalId !== "any" && (
                    <button
                      className="button outline"
                      disabled={busy || waitlisted}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          await api("/api/waitlist", {
                            professionalId,
                            serviceId,
                            date,
                          });
                          setWaitlisted(true);
                        } catch (e) {
                          setError(message(e));
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      {waitlisted
                        ? "Added to waitlist · messaging connection pending"
                        : "Join the waitlist for this day"}
                    </button>
                  )}
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
                {professionalId === "pro-b" ? (
                  <div className="policy-card">
                    <h3>Prepare your session</h3>
                    <p>
                      {hasIntake
                        ? "Your signed intake is saved. Confirm it is still current, or update only what has changed."
                        : "Complete your confidential intake once. Your body map, preferences and health information stay together in Recovery Room."}
                    </p>
                    <Link
                      className="button outline"
                      href="/recovery/prepare"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {hasIntake
                        ? "Review / update intake"
                        : "Prepare Your Session"}{" "}
                      ↗
                    </Link>
                    <p>
                      After saving your intake, return here to keep your
                      selected time.
                    </p>
                    <button
                      className="text-link"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          const response = await fetch(
                            `/api/intake${client ? `?client=${encodeURIComponent(client.id)}` : ""}`,
                          );
                          const data = await response.json();
                          if (!response.ok) throw new Error(data.error);
                          setHasIntake(data.hasIntake);
                          if (!data.hasIntake)
                            setError(
                              "Finish and sign your intake, then check again.",
                            );
                          else setError("");
                        } catch (e) {
                          setError(message(e));
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Check saved intake
                    </button>
                    {hasIntake && (
                      <label className="check-row">
                        <input
                          type="checkbox"
                          checked={healthUnchanged}
                          onChange={(e) => setHealthUnchanged(e.target.checked)}
                        />
                        My health information is current and unchanged since my
                        last saved intake.
                      </label>
                    )}
                  </div>
                ) : (
                  <>
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
                      <button
                        className="text-link"
                        disabled={busy}
                        onClick={useStyleBrief}
                      >
                        Use my saved grooming brief
                      </button>
                    )}
                    {user.role === "client" && !client && (
                      <ReferencePhotos editable />
                    )}
                  </>
                )}
                <div className="policy-card">
                  <h3>A note before you book</h3>
                  <p>
                    {currentRules
                      ? `Online changes close ${currentRules.cancellation_hours} hours before your visit. Minimum notice: ${currentRules.lead_minutes} minutes. Deposit: $${(currentRules.deposit / 100).toFixed(2)}. ${currentRules.card_required ? "A card is required." : ""}`
                      : policy.text}
                  </p>
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
                    I acknowledge the service’s booking and cancellation policy.
                  </span>
                </label>
                <div className="notice">
                  {currentRules &&
                  (currentRules.deposit > 0 || currentRules.card_required)
                    ? "Online payments are not connected. Contact the studio to arrange this visit; no charge has been made."
                    : "Pay at your visit. No online charge will be made."}
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
                disabled={
                  (step === 0 && professionalId === "any") ||
                  (step === 1 && !serviceId) ||
                  (step === 2 && (!slot || loading))
                }
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
                  disabled={
                    busy ||
                    !ack ||
                    !slot ||
                    (professionalId === "pro-b" &&
                      !appointment &&
                      (!hasIntake || !healthUnchanged)) ||
                    Boolean(
                      currentRules &&
                      !appointment &&
                      (currentRules.deposit > 0 || currentRules.card_required),
                    )
                  }
                  onClick={() => void confirm()}
                >
                  {busy
                    ? "Saving your visit…"
                    : appointment
                      ? "Confirm new time"
                      : "Confirm visit"}{" "}
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
