"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Check, ShieldCheck, Trash2 } from "lucide-react";
import { useClientReady } from "@/lib/use-client-ready";
import { api, message } from "@/lib/client";
import {
  bodyAreas,
  recoveryGoals,
  emptyProfile,
  consultationSummary,
  type ProviderId,
  type ProviderProfile,
} from "@/lib/provider-profiles";
const points = [
  [50, 23],
  [50, 32],
  [50, 41],
  [50, 55],
  [20, 49],
  [50, 75],
  [50, 94],
];
export function ProviderProfileForm({
  provider,
  persistence,
  signedIn,
}: {
  provider: ProviderId;
  persistence: boolean;
  signedIn: boolean;
}) {
  const ready = useClientReady();
  const recovery = provider === "camilla";
  const [profile, setProfile] = useState(() => emptyProfile(provider));
  const [state, setState] = useState<"loading" | "guest" | "ready" | "error">(
    persistence && signedIn ? "loading" : "guest",
  );
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [consent, setConsent] = useState(false);
  const [saved, setSaved] = useState(false);
  const [photo, setPhoto] = useState("");
  const photoRef = useRef("");
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!persistence || !signedIn) return;
    const controller = new AbortController();
    fetch(`/api/provider-profile?provider=${provider}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (r) => {
        if (r.status === 401) {
          setState("guest");
          return;
        }
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        if (data.saved) {
          setProfile(data.saved.profile);
          setSaved(true);
        }
        setState("ready");
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setState("error");
          setStatus(message(e));
        }
      });
    return () => controller.abort();
  }, [provider, persistence, signedIn]);
  useEffect(
    () => () => {
      if (photoRef.current) URL.revokeObjectURL(photoRef.current);
    },
    [],
  );
  function update<K extends keyof ProviderProfile>(
    key: K,
    value: ProviderProfile[K],
  ) {
    setProfile((p) => ({ ...p, [key]: value }));
    setStatus("Unsaved changes");
  }
  async function save() {
    setBusy(true);
    setStatus("");
    try {
      await api("/api/provider-profile", { ...profile, consent }, "PUT");
      setSaved(true);
      setConsent(false);
      setStatus("Preferences saved to your account.");
    } catch (e) {
      setStatus(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    try {
      await api("/api/provider-profile", { provider }, "DELETE");
      setProfile(emptyProfile(provider));
      setSaved(false);
      setConsent(false);
      setStatus("Saved preferences deleted.");
    } catch (e) {
      setStatus(message(e));
    } finally {
      setBusy(false);
    }
  }
  function removePhoto() {
    if (photoRef.current) URL.revokeObjectURL(photoRef.current);
    photoRef.current = "";
    setPhoto("");
    if (fileRef.current) fileRef.current.value = "";
  }
  return (
    <div
      className="provider-profile"
      aria-busy={!ready || busy || state === "loading"}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <fieldset
          disabled={!ready || busy || state === "loading"}
          className="provider-fields"
        >
          <legend className="sr-only">
            {recovery ? "Session preferences" : "Grooming DNA"}
          </legend>
          {recovery ? (
            <>
              <fieldset className="provider-choices">
                <legend>What does your body need today?</legend>
                <div className="goal-options">
                  {recoveryGoals.map((g, i) => (
                    <button
                      type="button"
                      key={g}
                      aria-pressed={profile.goal === g}
                      onClick={() => update("goal", g)}
                    >
                      <span>0{i + 1}</span>
                      {g}
                      {profile.goal === g && <Check size={16} />}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="body-consultation">
                <div className="body-map" aria-label="Body area selector">
                  <svg
                    viewBox="0 0 200 390"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <defs>
                      <linearGradient id="body-metal" x2="1" y2="1">
                        <stop stopColor="var(--gold-500)" stopOpacity=".25" />
                        <stop
                          offset="1"
                          stopColor="var(--blue-700)"
                          stopOpacity=".12"
                        />
                      </linearGradient>
                    </defs>
                    <circle cx="100" cy="42" r="25" />
                    <path d="M87 67 L87 84 Q58 87 48 109 L27 204 Q26 218 37 220 Q46 221 50 207 L66 143 L68 218 L63 265 L68 355 Q67 367 83 367 L91 277 L100 248 L109 277 L117 367 Q133 367 132 355 L137 265 L132 218 L134 143 L150 207 Q154 222 165 218 Q174 215 172 204 L152 109 Q143 87 113 84 L113 67" />
                    <path
                      d="M100 96V223 M75 151 Q100 164 125 151 M78 200 Q100 210 122 200"
                      className="body-lines"
                    />
                  </svg>
                  {bodyAreas.map((area, i) => (
                    <button
                      className="body-point"
                      key={area}
                      type="button"
                      style={{
                        left: `${points[i][0]}%`,
                        top: `${points[i][1]}%`,
                      }}
                      aria-label={area}
                      aria-pressed={profile.areas.includes(area)}
                      onClick={() =>
                        update(
                          "areas",
                          profile.areas.includes(area)
                            ? profile.areas.filter((a) => a !== area)
                            : [...profile.areas, area],
                        )
                      }
                    >
                      <span>{i + 1}</span>
                    </button>
                  ))}
                  <span className="body-map-caption">YOUR COMFORT, MAPPED</span>
                </div>
                <div>
                  <p className="provider-small">
                    Select areas you’d like to discuss. A conversation starter,
                    not an assessment.
                  </p>
                  <fieldset className="provider-choices">
                    <legend>Areas to focus on</legend>
                    <div className="area-options">
                      {bodyAreas.map((area) => (
                        <label key={area}>
                          <input
                            type="checkbox"
                            checked={profile.areas.includes(area)}
                            onChange={() =>
                              update(
                                "areas",
                                profile.areas.includes(area)
                                  ? profile.areas.filter((a) => a !== area)
                                  : [...profile.areas, area],
                              )
                            }
                          />
                          {area}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <label>
                    Pressure preference
                    <select
                      value={profile.pressure}
                      onChange={(e) =>
                        update(
                          "pressure",
                          e.target.value as ProviderProfile["pressure"],
                        )
                      }
                    >
                      {["Discuss together", "Light", "Medium", "Firm"].map(
                        (x) => (
                          <option key={x}>{x}</option>
                        ),
                      )}
                    </select>
                  </label>
                  <label className="provider-check">
                    <input
                      type="checkbox"
                      checked={profile.quiet}
                      onChange={(e) => update("quiet", e.target.checked)}
                    />
                    I prefer a quiet session
                  </label>
                </div>
              </div>
            </>
          ) : (
            <>
              <label>
                Your cut, in your words
                <input
                  value={profile.style}
                  maxLength={160}
                  placeholder="Texture on top, clean around the ears…"
                  onChange={(e) => update("style", e.target.value)}
                />
              </label>
              <div className="provider-field-grid">
                <label>
                  Fade preference
                  <select
                    value={profile.fade}
                    onChange={(e) =>
                      update("fade", e.target.value as ProviderProfile["fade"])
                    }
                  >
                    {["Discuss together", "Low", "Mid", "High", "No fade"].map(
                      (x) => (
                        <option key={x}>{x}</option>
                      ),
                    )}
                  </select>
                </label>
                <label>
                  Beard preference
                  <select
                    value={profile.beard}
                    onChange={(e) =>
                      update(
                        "beard",
                        e.target.value as ProviderProfile["beard"],
                      )
                    }
                  >
                    {[
                      "Discuss together",
                      "Clean shave",
                      "Stubble",
                      "Short beard",
                      "Full beard",
                    ].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Product finish
                  <select
                    value={profile.finish}
                    onChange={(e) =>
                      update(
                        "finish",
                        e.target.value as ProviderProfile["finish"],
                      )
                    }
                  >
                    {["Discuss together", "Matte", "Natural", "Shine"].map(
                      (x) => (
                        <option key={x}>{x}</option>
                      ),
                    )}
                  </select>
                </label>
                <label>
                  Time for your daily routine
                  <select
                    value={profile.routineMinutes}
                    onChange={(e) =>
                      update(
                        "routineMinutes",
                        e.target.value as ProviderProfile["routineMinutes"],
                      )
                    }
                  >
                    {["5", "10", "20"].map((x) => (
                      <option key={x} value={x}>
                        {x} minutes
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="reference-photo">
                <label>
                  Bring a style reference
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      if (
                        !["image/jpeg", "image/png", "image/webp"].includes(
                          f.type,
                        ) ||
                        f.size > 5 * 1024 * 1024
                      ) {
                        setStatus("Choose a JPG, PNG or WebP under 5 MB.");
                        return;
                      }
                      removePhoto();
                      const url = URL.createObjectURL(f);
                      photoRef.current = url;
                      setPhoto(url);
                    }}
                  />
                </label>
                {photo && (
                  <div className="reference-preview">
                    <Image
                      unoptimized
                      src={photo}
                      width={180}
                      height={180}
                      alt="Your temporary haircut reference"
                    />
                    <button
                      className="provider-link"
                      type="button"
                      onClick={removePhoto}
                    >
                      Remove reference
                    </button>
                  </div>
                )}
                <p className="provider-small">
                  Private preview on this screen only. Photos are not uploaded
                  or saved; bring your reference to the consultation.
                </p>
              </div>
            </>
          )}
          <label>
            {recovery
              ? "Comfort preferences or questions"
              : "Products, scalp concerns or consultation questions"}
            <textarea
              rows={3}
              maxLength={1200}
              value={profile.notes}
              placeholder={
                recovery
                  ? "Areas to avoid, comfort requests, anything to discuss…"
                  : "What works for you? What would you like to change?"
              }
              onChange={(e) => update("notes", e.target.value)}
            />
          </label>
          <p className="provider-small">
            Keep this to preferences. Discuss medical history, injuries or
            sensitive information directly with your practitioner.
          </p>
          {state === "ready" && (
            <label className="provider-check">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              Save these preferences privately in my Collective account. They
              are not sent to a practitioner.
            </label>
          )}
          <div className="provider-actions">
            {state === "ready" ? (
              <>
                <button className="provider-button" disabled={!consent || busy}>
                  {busy ? "Saving…" : "Save preferences"}
                  <Check size={16} />
                </button>
                {saved && (
                  <button
                    className="provider-link"
                    type="button"
                    onClick={remove}
                  >
                    <Trash2 size={16} />
                    Delete saved preferences
                  </button>
                )}
              </>
            ) : persistence && state === "guest" ? (
              <Link
                className="provider-button"
                href={`/signin?next=/${recovery ? "recovery" : "grooming"}`}
              >
                Sign in to save <ArrowUpRight size={16} />
              </Link>
            ) : null}
          </div>
        </fieldset>
        <p role="status" className="provider-status">
          {state === "loading" ? "Loading your preferences…" : status}
        </p>
      </form>
      <aside className="consultation-brief">
        <div className="provider-kicker">
          <ShieldCheck size={16} />
          {recovery ? "YOUR SESSION BRIEF" : "YOUR CONSULTATION BRIEF"}
        </div>
        <h3>
          {recovery ? "A session on your terms." : "Less explaining. More you."}
        </h3>
        <p className="brief-text">{consultationSummary(profile)}</p>
        {!recovery && (
          <div className="routine-note">
            <h4>Your {profile.routineMinutes}-minute routine brief</h4>
            <p>
              {profile.routineMinutes === "5"
                ? "Ask for a low-maintenance shape and one easy finishing step."
                : profile.routineMinutes === "10"
                  ? "Ask for a repeatable shape, styling technique and a simple finishing product."
                  : "Ask for a full styling walkthrough, tool guidance and a finish you can recreate."}{" "}
              {profile.finish !== "Discuss together" &&
                `Explore a ${profile.finish.toLowerCase()} finish with Katie.`}
            </p>
          </div>
        )}
        <p className="provider-small">
          {persistence
            ? "Changes stay on this screen until you choose to save. Signing in reloads this page; download your brief first."
            : "Account saving is not yet available on the hosted preview. Your choices stay on this screen only."}
        </p>
        <button
          className="provider-link"
          type="button"
          onClick={() => {
            const blob = new Blob([consultationSummary(profile)], {
              type: "text/plain",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${provider}-consultation.txt`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }}
        >
          Download your brief <ArrowUpRight size={16} />
        </button>
        {recovery && (
          <p className="provider-small">
            Camilla’s menu and session lengths are awaiting approval. This brief
            does not reserve a treatment or time.
          </p>
        )}
      </aside>
    </div>
  );
}
