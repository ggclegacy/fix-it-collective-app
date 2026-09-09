"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ShieldCheck } from "lucide-react";
import { BrandEmblem } from "./brand-emblem";
import { SigninForm } from "./signin-form";
import { RecoveryBodyMap } from "./recovery-body-map";
import { api, message } from "@/lib/client";
import {
  answers,
  conditions,
  consentText,
  emptyIntake,
  focusAreas,
  goals,
  intakeSchema,
  pressures,
  refreshDue,
  steps,
  workOptions,
  type Draft,
  type Profile,
  type SessionDetails,
} from "@/lib/recovery/model";
function Choices({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  value: string | string[];
  onChange: (v: string) => void;
}) {
  return (
    <fieldset className="rr-field">
      <legend>{label}</legend>
      <div className="rr-choices">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            aria-pressed={
              Array.isArray(value) ? value.includes(o) : value === o
            }
            onClick={() => onChange(o)}
          >
            {o}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
function Note({
  label,
  value,
  onChange,
  max = 600,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  max?: number;
}) {
  return (
    <label className="rr-field">
      {label}
      <textarea
        rows={2}
        maxLength={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
const changeOptions = [
  "Health",
  "Medications",
  "Injury",
  "Pregnancy",
  "Pain",
  "Preferences",
];
const headings = [
  "A little about your rhythm.",
  "Where do you need care?",
  "Make this time yours.",
  "Care that considers you.",
  "A little context. Better care.",
  "Your session, considered.",
];
const descriptions = [
  "Your daily routine helps Kamilla understand where tension starts.",
  "Tap your body to mark focus, discomfort or places to avoid.",
  "Set the intention. You can change your mind at any time.",
  "A few details help Kamilla adapt your session safely. Select all that apply.",
  "Some medications affect bruising, sensation or pressure. Only share what is relevant to your session.",
  "Review your preferences, then give Kamilla permission to prepare your care.",
];
export function RecoveryIntake({
  initial,
  name,
  appointment,
  guest = false,
}: {
  initial: Profile | null;
  name: string;
  appointment: SessionDetails;
  guest?: boolean;
}) {
  const [saved, setSaved] = useState(initial),
    [draft, setDraft] = useState<Draft>(
      initial ? { ...initial.answers, consent: false } : emptyIntake,
    );
  const [screen, setScreen] = useState<"intro" | "changes" | "flow" | "ready">(
    initial && !refreshDue(initial) ? "changes" : "intro",
  );
  const [step, setStep] = useState(0),
    [changes, setChanges] = useState<string[]>([]),
    [mode, setMode] = useState<"full" | "update">("full"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null),
    pending = useRef(false);
  const dirty = screen === "flow";
  useEffect(() => {
    heading.current?.focus();
  }, [screen, step]);
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  function put<K extends keyof Draft>(k: K, v: Draft[K]) {
    setDraft((d) => ({ ...d, [k]: v }));
    setError("");
  }
  const sequence =
    mode === "full"
      ? [0, 1, 2, 3, 4, 5]
      : [
          ...(changes.some((c) => ["Pain", "Injury", "Preferences"].includes(c))
            ? [1]
            : []),
          ...(changes.includes("Preferences") ? [2] : []),
          ...(changes.some((c) => ["Health", "Injury", "Pregnancy"].includes(c))
            ? [3]
            : []),
          ...(changes.includes("Medications") ? [4] : []),
          5,
        ].sort((a, b) => a - b);
  const position = sequence.indexOf(step);
  function begin(full: boolean) {
    setMode(full ? "full" : "update");
    setStep(
      full
        ? 0
        : changes.includes("Preferences")
          ? 1
          : changes.some((c) => ["Pain", "Injury", "Preferences"].includes(c))
            ? 1
            : changes.some((c) => ["Health", "Pregnancy"].includes(c))
              ? 3
              : 4,
    );
    setScreen("flow");
    setError("");
  }
  function validStep() {
    if (step === 0 && (!draft.work || !draft.activity || !draft.firstMassage))
      return "Choose your work pattern, activity level and massage experience.";
    if (step === 2 && (!draft.goal || !draft.pressure))
      return "Choose your goal and pressure preference.";
    if (step === 3) {
      if (!draft.health.length || !draft.care || !draft.allergies)
        return "Complete the health, medical care and allergy choices.";
      if (
        draft.health.includes("Diabetes") &&
        Object.values(draft.diabetes).some((v) => !v)
      )
        return "Complete the three diabetes choices.";
      if (draft.allergies === "Yes" && !draft.allergyNote.trim())
        return "Add your allergies or choose Not sure / discuss.";
    }
    if (step === 4) {
      if (!draft.medications || !draft.bloodThinner || !draft.bruising)
        return "Complete the three medication and bruising choices.";
      if (draft.medications === "Yes" && !draft.medicationNote.trim())
        return "Add medication names or choose Not sure / discuss.";
    }
    return "";
  }
  async function save(unchanged = false) {
    if (pending.current) return;
    if (guest) {
      setError("Sign in below to save your session profile.");
      return;
    }
    if (!unchanged) {
      const parsed = intakeSchema.safeParse(draft);
      if (!parsed.success) {
        setError(
          parsed.error.issues[0]?.message ?? "Please check your answers.",
        );
        return;
      }
    }
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const profile = await api<Profile>("/api/recovery", {
        revision: saved?.revision ?? initial?.revision ?? 0,
        mode: unchanged ? "unchanged" : mode,
        ...(!unchanged ? { answers: draft } : {}),
      });
      setSaved(profile);
      setDraft({ ...profile.answers, consent: false });
      setScreen("ready");
    } catch (e) {
      setError(message(e));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  const summary = (d: Draft) => (
    <dl className="rr-profile-grid">
      <div>
        <dt>Focus</dt>
        <dd>{focusAreas(d).join(" · ") || "Whole-body relaxation"}</dd>
      </div>
      <div>
        <dt>Pressure</dt>
        <dd>{d.pressure || "To discuss"}</dd>
      </div>
      <div>
        <dt>Intention</dt>
        <dd>
          {d.goal || "To discuss"}
          {d.goalNote && ` · ${d.goalNote}`}
        </dd>
      </div>
      <div>
        <dt>Discomfort</dt>
        <dd>
          {d.pain} <span>/ 10</span>
        </dd>
      </div>
    </dl>
  );
  return (
    <main id="main" className="rr-environment">
      <div className="rr-shell">
        <div className="rr-topline">
          <Link href="/recovery" className="rr-back">
            <ArrowLeft size={16} /> Recovery Room
          </Link>
          <span>PERSONAL CARE · BY MILLA</span>
        </div>
        <div className="rr-masthead">
          <BrandEmblem brand="recovery" size={88} />
          <div>
            <p className="eyebrow">YOUR TIME TO RESET</p>
            <p>Prepared with Kamilla.</p>
          </div>
          <ShieldCheck size={23} aria-hidden="true" />
        </div>
        {screen === "flow" && (
          <nav
            className="rr-progress"
            aria-label="Session preparation progress"
          >
            <div className="rr-progress-line">
              <span
                style={{
                  width: `${((position + 1) / sequence.length) * 100}%`,
                }}
              />
            </div>
            <ol>
              {sequence.map((n, i) => (
                <li key={n} aria-current={n === step ? "step" : undefined}>
                  <span>
                    {i < position ? (
                      <Check size={12} />
                    ) : (
                      String(i + 1).padStart(2, "0")
                    )}
                  </span>
                  {steps[n]}
                </li>
              ))}
            </ol>
            <p>
              Step {position + 1} of {sequence.length} · {steps[step]}
            </p>
          </nav>
        )}
        <section className="rr-stage" key={`${screen}-${step}`}>
          {screen === "intro" && (
            <>
              <p className="eyebrow">
                {saved
                  ? "TIME FOR A FRESH LOOK"
                  : "A SESSION THAT STARTS WITH YOU"}
              </p>
              <h1 ref={heading} tabIndex={-1}>
                Prepare
                <br />
                <em>your session.</em>
              </h1>
              <p className="rr-lede">
                {saved
                  ? "Let’s review your full profile so Kamilla has an up-to-date picture of you."
                  : `${name.split(" ")[0]}, a few thoughtful details help Kamilla tailor your time, from the pressure you prefer to the places that need care.`}
              </p>
              <div className="rr-intro-meta">
                <span>About 2–3 minutes</span>
                <span>Six simple steps</span>
                <span>Your pace</span>
              </div>
              <button className="rr-primary" onClick={() => begin(true)}>
                Let’s prepare <ArrowRight size={18} />
              </button>
              <div className="rr-privacy">
                <ShieldCheck size={20} />
                <p>
                  Share only what helps your care. Answers are saved when you
                  finish and are available to you and authorized Recovery Room
                  practitioners. They are kept separate from general booking
                  notes. You can choose to discuss sensitive details in person.
                </p>
              </div>
              <p className="rr-caption">
                This is the platform preview. Please use sample information.
                Preparing a profile does not book an appointment.
              </p>
            </>
          )}
          {screen === "changes" && (
            <>
              <p className="eyebrow">WELCOME BACK, {name.split(" ")[0]}</p>
              <h1 ref={heading} tabIndex={-1}>
                Same you.
                <br />
                <em>A fresh check-in.</em>
              </h1>
              <p className="rr-lede">Anything changed since your last visit?</p>
              <p>
                Health, medications, injuries, pregnancy, pain or
                preferences—even a small change helps Kamilla prepare.
              </p>
              <button
                className="rr-primary"
                disabled={busy}
                onClick={() => void save(true)}
              >
                {busy ? "Saving…" : "Nothing changed"}
                <Check size={18} />
              </button>
              <Choices
                label="Or, tell us what’s different"
                options={changeOptions}
                value={changes}
                onChange={(v) =>
                  setChanges((c) =>
                    c.includes(v) ? c.filter((x) => x !== v) : [...c, v],
                  )
                }
              />
              <button
                className="rr-secondary"
                disabled={!changes.length || busy}
                onClick={() => begin(false)}
              >
                Update selected details <ArrowRight size={16} />
              </button>
              <button
                className="rr-text-button"
                disabled={busy}
                onClick={() => begin(true)}
              >
                Review my full profile
              </button>
              <p className="rr-caption">
                “Nothing changed” confirms your saved health and preferences are
                still accurate. Last confirmed{" "}
                {saved && new Date(saved.updatedAt).toLocaleDateString("en-US")}
                . A full review is requested annually.
              </p>
            </>
          )}
          {screen === "flow" && (
            <>
              <p className="eyebrow">{steps[step].toUpperCase()}</p>
              <h1 ref={heading} tabIndex={-1}>
                {headings[step]}
              </h1>
              <p className="rr-lede">{descriptions[step]}</p>
              {step === 0 && (
                <>
                  <label className="rr-field">
                    Occupation <span className="rr-caption">optional</span>
                    <input
                      maxLength={100}
                      value={draft.occupation}
                      onChange={(e) => put("occupation", e.target.value)}
                      placeholder="What fills your day?"
                    />
                  </label>
                  <Choices
                    label="Your usual workday"
                    options={workOptions}
                    value={draft.work}
                    onChange={(v) => put("work", v as Draft["work"])}
                  />
                  <Choices
                    label="Activity level"
                    options={["Low", "Moderate", "Very active", "Varies"]}
                    value={draft.activity}
                    onChange={(v) => put("activity", v as Draft["activity"])}
                  />
                  <Choices
                    label="Is this your first professional massage?"
                    options={answers}
                    value={draft.firstMassage}
                    onChange={(v) =>
                      put("firstMassage", v as Draft["firstMassage"])
                    }
                  />
                </>
              )}
              {step === 1 && (
                <>
                  <RecoveryBodyMap
                    body={draft.body}
                    onChange={(v) => put("body", v)}
                  />
                  <label className="rr-field rr-pain">
                    Discomfort today{" "}
                    <strong>
                      {draft.pain}
                      <small> / 10</small>
                    </strong>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="1"
                      value={draft.pain}
                      onChange={(e) => put("pain", Number(e.target.value))}
                      aria-valuetext={`${draft.pain} out of 10`}
                    />
                    <span className="rr-scale">
                      <span>No discomfort</span>
                      <span>Most intense</span>
                    </span>
                  </label>
                  <Note
                    label="Any other areas to avoid? (optional)"
                    value={draft.avoidNote}
                    onChange={(v) => put("avoidNote", v)}
                  />
                </>
              )}
              {step === 2 && (
                <>
                  <Choices
                    label="Your primary intention"
                    options={goals}
                    value={draft.goal}
                    onChange={(v) => put("goal", v as Draft["goal"])}
                  />
                  {draft.goal === "Something else" && (
                    <Note
                      label="Your intention (optional)"
                      value={draft.goalNote}
                      onChange={(v) => put("goalNote", v)}
                    />
                  )}
                  <Choices
                    label="Your preferred pressure"
                    options={pressures}
                    value={draft.pressure}
                    onChange={(v) => put("pressure", v as Draft["pressure"])}
                  />
                  <div className="rr-soft-note">
                    Pressure is a starting preference. Kamilla will adapt it to
                    your comfort and health. You’re always in control.
                  </div>
                </>
              )}
              {step === 3 && (
                <>
                  <Choices
                    label="Do any of these currently apply?"
                    options={conditions}
                    value={draft.health}
                    onChange={(v) => {
                      const c = v as Draft["health"][number];
                      put(
                        "health",
                        c === "None of these"
                          ? [c]
                          : draft.health.includes(c)
                            ? draft.health.filter((x) => x !== c)
                            : [
                                ...draft.health.filter(
                                  (x) => x !== "None of these",
                                ),
                                c,
                              ],
                      );
                    }}
                  />
                  {draft.health
                    .filter(
                      (c) =>
                        c !== "None of these" &&
                        c !== "Prefer to discuss privately",
                    )
                    .map((c) => (
                      <div className="rr-followup" key={c}>
                        <h3>{c}</h3>
                        {c === "Diabetes" ? (
                          <>
                            {(
                              [
                                ["insulin", "Do you use insulin?"],
                                [
                                  "sensation",
                                  "Any numbness, tingling or reduced sensation?",
                                ],
                                ["wounds", "Any wounds or slow-healing areas?"],
                              ] as const
                            ).map(([k, l]) => (
                              <Choices
                                key={k}
                                label={l}
                                options={answers}
                                value={draft.diabetes[k]}
                                onChange={(v) =>
                                  put("diabetes", { ...draft.diabetes, [k]: v })
                                }
                              />
                            ))}
                          </>
                        ) : null}
                        <Note
                          label={
                            c === "Pregnant / possibly pregnant"
                              ? "Weeks along, comfort needs or restrictions (optional)"
                              : "Affected areas, timing or care restrictions (optional)"
                          }
                          value={draft.healthNotes[c] ?? ""}
                          onChange={(v) =>
                            put("healthNotes", { ...draft.healthNotes, [c]: v })
                          }
                        />
                      </div>
                    ))}
                  {draft.health.some((c) =>
                    [
                      "Blood clots / DVT",
                      "Fever / illness / infection",
                      "Open wounds / sores",
                    ].includes(c),
                  ) && (
                    <div className="rr-safety-note">
                      Please discuss this with Kamilla before treatment. Your
                      session may need to be adapted or postponed. Completing
                      this profile is not medical clearance.
                    </div>
                  )}
                  <Choices
                    label="Currently receiving medical care for an injury or condition?"
                    options={answers}
                    value={draft.care}
                    onChange={(v) => put("care", v as Draft["care"])}
                  />
                  {draft.care === "Yes" && (
                    <Note
                      label="Relevant care or restrictions (optional; no provider details needed)"
                      value={draft.careNote}
                      onChange={(v) => put("careNote", v)}
                    />
                  )}
                  <Choices
                    label="Any allergies or sensitivities to oils, lotions, fragrance, latex or adhesives?"
                    options={answers}
                    value={draft.allergies}
                    onChange={(v) => put("allergies", v as Draft["allergies"])}
                  />
                  {draft.allergies === "Yes" && (
                    <Note
                      label="What should we avoid?"
                      value={draft.allergyNote}
                      onChange={(v) => put("allergyNote", v)}
                    />
                  )}
                </>
              )}
              {step === 4 && (
                <>
                  <Choices
                    label="Any prescription medicines, over-the-counter medicines or supplements relevant to your massage?"
                    options={answers}
                    value={draft.medications}
                    onChange={(v) =>
                      put("medications", v as Draft["medications"])
                    }
                  />
                  {draft.medications === "Yes" && (
                    <Note
                      label="Names, what they’re for, and relevant effects (no doses needed)"
                      value={draft.medicationNote}
                      onChange={(v) => put("medicationNote", v)}
                    />
                  )}
                  <Choices
                    label="Do you take blood thinners or medicines that increase bleeding or bruising?"
                    options={answers}
                    value={draft.bloodThinner}
                    onChange={(v) =>
                      put("bloodThinner", v as Draft["bloodThinner"])
                    }
                  />
                  <Choices
                    label="Do you bruise or bleed easily?"
                    options={answers}
                    value={draft.bruising}
                    onChange={(v) => put("bruising", v as Draft["bruising"])}
                  />
                  {[draft.bloodThinner, draft.bruising].some(
                    (x) => x && x !== "No",
                  ) && (
                    <div className="rr-safety-note">
                      Kamilla will review bruising and pressure with you before
                      starting. If you know the medication name, include it
                      above or discuss it in person.
                    </div>
                  )}
                </>
              )}
              {step === 5 && (
                <>
                  {summary(draft)}
                  <div className="rr-review-list">
                    {sequence
                      .filter((n) => n !== 5)
                      .map((n) => (
                        <button
                          type="button"
                          key={n}
                          onClick={() => setStep(n)}
                        >
                          <span>{steps[n]}</span>
                          <span>Review / edit ↗</span>
                        </button>
                      ))}
                  </div>
                  <details className="rr-details">
                    <summary>Review health & safety details</summary>
                    <p>
                      <strong>Health:</strong> {draft.health.join(" · ")}
                    </p>
                    {Object.entries(draft.healthNotes)
                      .filter(([k]) =>
                        draft.health.includes(k as Draft["health"][number]),
                      )
                      .map(([k, v]) => (
                        <p key={k}>
                          {k}: {v || "Discuss in person"}
                        </p>
                      ))}
                    {draft.health.includes("Diabetes") && (
                      <p>
                        Diabetes: insulin {draft.diabetes.insulin}; sensation
                        changes {draft.diabetes.sensation}; wounds{" "}
                        {draft.diabetes.wounds}
                      </p>
                    )}
                    <p>
                      Medical care: {draft.care}
                      {draft.care === "Yes" && ` · ${draft.careNote}`}
                    </p>
                    <p>
                      Allergies: {draft.allergies}
                      {draft.allergies === "Yes" && ` · ${draft.allergyNote}`}
                    </p>
                    <p>
                      Medications: {draft.medications}
                      {draft.medications === "Yes" &&
                        ` · ${draft.medicationNote}`}
                    </p>
                    <p>
                      Blood thinners: {draft.bloodThinner} · Easy bruising:{" "}
                      {draft.bruising}
                    </p>
                    <p>
                      Avoid:{" "}
                      {draft.body
                        .filter((x) => x.tags.includes("Avoid"))
                        .map((x) => x.area)
                        .join(" · ") || "No marked areas"}{" "}
                      {draft.avoidNote}
                    </p>
                    {draft.body.map((x) => (
                      <p key={x.area}>
                        {x.area}: {x.tags.join(" · ")}
                      </p>
                    ))}
                  </details>
                  <Note
                    label="Anything else Kamilla should know? (optional)"
                    value={draft.extra}
                    onChange={(v) => put("extra", v)}
                  />
                  <div className="rr-consent">
                    <p>{consentText}</p>
                    <label>
                      <input
                        type="checkbox"
                        checked={draft.consent}
                        onChange={(e) => put("consent", e.target.checked)}
                      />{" "}
                      I agree and confirm my answers.
                    </label>
                    <label className="rr-field">
                      Your signature
                      <input
                        placeholder="Type your full name"
                        maxLength={100}
                        autoComplete="name"
                        value={draft.signature}
                        onChange={(e) => put("signature", e.target.value)}
                      />
                    </label>
                    <p className="rr-caption">
                      Dated automatically when saved. These preferences do not
                      replace your conversation with Kamilla before treatment.
                    </p>
                  </div>
                </>
              )}
              {step === 5 && guest && (
                <section className="rr-signin">
                  <h2>Save your personal profile.</h2>
                  <p>
                    Sign in here to keep your answers and make them available
                    for your care. Your answers stay on this page while you sign
                    in.
                  </p>
                  <SigninForm inline />
                </section>
              )}
              <div className="rr-actions">
                <button
                  className="rr-secondary"
                  disabled={busy}
                  onClick={() => {
                    setError("");
                    if (position > 0) setStep(sequence[position - 1]);
                    else
                      setScreen(
                        saved && !refreshDue(saved) ? "changes" : "intro",
                      );
                  }}
                >
                  <ArrowLeft size={16} /> Back
                </button>
                <button
                  className="rr-primary"
                  disabled={busy}
                  onClick={() => {
                    const error = validStep();
                    if (error) {
                      setError(error);
                      return;
                    }
                    if (step === 5) void save();
                    else {
                      setStep(sequence[position + 1]);
                      setError("");
                    }
                  }}
                >
                  {busy
                    ? "Saving your profile…"
                    : step === 5
                      ? "Finish preparation"
                      : "Continue"}
                  <ArrowRight size={17} />
                </button>
              </div>
              <p className="rr-caption">
                Your answers stay in this page until you finish. Leaving before
                saving clears unsaved changes.
              </p>
            </>
          )}
          {screen === "ready" && saved && (
            <>
              <div className="rr-ready-check">
                <Check size={28} />
              </div>
              <p className="eyebrow">YOUR SESSION PROFILE</p>
              <h1 ref={heading} tabIndex={-1}>
                You’re <em>ready.</em>
              </h1>
              <p className="rr-lede">
                Your profile is ready for Kamilla to review and personalize your
                session.
              </p>
              {summary(saved.answers)}
              <div className="rr-appointment">
                <p className="eyebrow">
                  {appointment
                    ? "YOUR NEXT APPOINTMENT"
                    : "YOUR NEXT MOMENT OF CALM"}
                </p>
                <h3>
                  {appointment?.label ?? "Your profile is ready when you are."}
                </h3>
                <p>
                  {appointment
                    ? `${appointment.date} · ${appointment.duration} minutes · Kamilla`
                    : "No Recovery Room appointment is booked yet. Services and availability are being prepared."}
                </p>
              </div>
              <p className="rr-caption">
                Saved {new Date(saved.updatedAt).toLocaleString("en-US")}.
                Kamilla will confirm safety, boundaries and pressure with you
                before treatment.
              </p>
              <Link className="rr-primary" href="/account">
                Back to your visits <ArrowRight size={16} />
              </Link>
              <button
                className="rr-text-button"
                onClick={() => {
                  setChanges([]);
                  setScreen("changes");
                }}
              >
                Update my profile
              </button>
            </>
          )}
          {error && (
            <p className="rr-error" role="alert">
              {error}
            </p>
          )}
        </section>
        <div className="rr-footer-note">
          MIND · BODY · BALANCE · A BETTER YOU
        </div>
      </div>
    </main>
  );
}
