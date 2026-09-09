"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Compass, ShieldCheck } from "lucide-react";
import {
  journeys,
  matchResources,
  menNeeds,
  womenNeeds,
  type Network,
} from "@/lib/networks";
import { ResourceCard } from "./resource-card";
export function NetworkNavigator({ network }: { network: Network }) {
  const women = network === "women";
  const needs = women ? womenNeeds : menNeeds;
  const [group, setGroup] = useState<string | null>(null);
  const [needId, setNeedId] = useState<string | null>(null);
  const [browse, setBrowse] = useState(false);
  const [parish, setParish] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const interacted = useRef(false);
  const need = needs.find((n) => n.id === needId);
  const results = need
    ? matchResources({ network, needId: need.id, parish: parish || undefined })
    : [];
  useEffect(() => {
    if (interacted.current) heading.current?.focus();
  }, [group, needId, browse]);
  useEffect(() => {
    // Returning via the browser back/forward cache must not restore sensitive choices.
    const reset = () => {
      setGroup(null);
      setNeedId(null);
      setBrowse(false);
      setParish("");
    };
    window.addEventListener("pagehide", reset);
    window.addEventListener("pageshow", reset);
    return () => {
      window.removeEventListener("pagehide", reset);
      window.removeEventListener("pageshow", reset);
    };
  }, []);
  function reset() {
    interacted.current = true;
    setNeedId(null);
    setGroup(null);
    setBrowse(false);
    setParish("");
  }
  function choose(id: string) {
    interacted.current = true;
    setNeedId(id);
  }
  return (
    <section
      className={`network-navigator ${women ? "gentle-navigator" : ""}`}
      aria-labelledby="navigator-title"
    >
      <div className="navigator-topline">
        <span>
          <Compass size={16} />{" "}
          {women ? "A LITTLE DIRECTION, IF YOU WANT IT" : "YOUR NEXT MOVE"}
        </span>
        <span>
          {need
            ? "YOUR OPTIONS"
            : group || browse
              ? "02 / YOUR NEED"
              : "01 / START HERE"}
        </span>
      </div>
      {need ? (
        <>
          <button
            className="text-link navigator-back"
            onClick={() => {
              interacted.current = true;
              setNeedId(null);
            }}
          >
            <ArrowLeft size={16} />
            {women ? "Choose something else" : "Back to needs"}
          </button>
          <h2 ref={heading} tabIndex={-1} id="navigator-title">
            {need.label}
          </h2>
          <p className="next-step">{need.nextStep}</p>
          <div className="resource-context">
            <ShieldCheck size={20} />
            <p>
              {women
                ? "You can contact these organizations directly. No account or personal story is needed here."
                : "These are public starting points. Fix It’s provider partnerships are being developed; no medical partner is presented as vetted."}{" "}
              Listings do not confirm openings, eligibility or a match.
            </p>
          </div>
          {women && (
            <label className="parish-filter">
              Optional: narrow known service areas
              <select
                value={parish}
                onChange={(e) => setParish(e.target.value)}
              >
                <option value="">Keep all options / skip</option>
                {[
                  "Lafayette",
                  "Acadia",
                  "St. Landry",
                  "Evangeline",
                  "Vermilion",
                  "Rapides",
                  "Avoyelles",
                  "Iberia",
                  "St. Martin",
                  "St. Mary",
                  "Other Louisiana parish",
                ].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
              <span>
                Only explicitly listed parish coverage is filtered. Other
                organizations can confirm whether they serve you.
              </span>
            </label>
          )}
          <div className="resource-results" aria-live="polite">
            <p className="results-count">
              {results.length} {results.length === 1 ? "place" : "places"} to
              start
            </p>
            {results.length ? (
              results.map((r) => <ResourceCard key={r.id} resource={r} />)
            ) : (
              <p>
                No reviewed listing matches this selection yet. Call 211 for
                Louisiana resource routing.
              </p>
            )}
          </div>
          {need.id === "grooming" && (
            <Link className="button outline" href="/services">
              Explore grooming experiences <ArrowRight size={16} />
            </Link>
          )}
          <button className="text-link reset-navigator" onClick={reset}>
            Clear choices & start again <ArrowRight size={16} />
          </button>
        </>
      ) : (
        <>
          {(group || browse) && (
            <button className="text-link navigator-back" onClick={reset}>
              <ArrowLeft size={16} />
              Back to the beginning
            </button>
          )}
          <h2 ref={heading} tabIndex={-1} id="navigator-title">
            {women
              ? group
                ? "What would help right now?"
                : browse
                  ? "Choose what feels closest."
                  : "What are you dealing with right now?"
              : "What do you want help with?"}
          </h2>
          <p>
            {women
              ? "Choose only what feels useful. You can skip the guide, change direction or leave at any time."
              : "Start with what’s on your mind. You don’t need a diagnosis or the right words."}
          </p>
          {women && !group && !browse ? (
            <>
              <div className="journey-choices">
                {journeys.map((j, index) => (
                  <button
                    className="journey-choice"
                    key={j.id}
                    onClick={() => {
                      interacted.current = true;
                      setGroup(j.id);
                    }}
                  >
                    <span className="journey-number">0{index + 1}</span>
                    <span>
                      <span className="journey-label">{j.label}</span>
                      <strong>{j.title}</strong>
                      <span>{j.description}</span>
                    </span>
                    <ArrowRight size={20} />
                  </button>
                ))}
              </div>
              <div className="navigator-alternatives">
                <button className="text-link" onClick={() => choose("unsure")}>
                  I’m not sure what I need <ArrowRight size={16} />
                </button>
                <button
                  className="text-link"
                  onClick={() => {
                    interacted.current = true;
                    setBrowse(true);
                  }}
                >
                  Skip the guide · browse needs
                </button>
              </div>
            </>
          ) : (
            <>
              {!women && (
                <button
                  className="unsure-choice"
                  onClick={() => choose("unsure")}
                >
                  <span>
                    I just don’t feel like myself
                    <small>You can start here, too.</small>
                  </span>
                  <ArrowRight size={20} />
                </button>
              )}
              <div className="need-groups">
                {[
                  ...new Set(
                    needs
                      .filter((n) =>
                        women ? browse || n.group === group : n.id !== "unsure",
                      )
                      .map((n) => n.group),
                  ),
                ].map((g) => (
                  <div key={g}>
                    <h3>
                      {women
                        ? (journeys.find((j) => j.id === g)?.label ??
                          "Wherever you are")
                        : g}
                    </h3>
                    <div className="need-grid">
                      {needs
                        .filter(
                          (n) => n.group === g && (women || n.id !== "unsure"),
                        )
                        .map((n) => (
                          <button
                            className="need-choice"
                            key={n.id}
                            onClick={() => choose(n.id)}
                          >
                            {n.label}
                            <ArrowRight size={16} />
                          </button>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
      <p className="navigator-privacy">
        Your selections stay in this page’s memory. We don’t save them to your
        account or send them as a referral. Browsers and devices may still
        record your visit.
      </p>
      <noscript>
        <p>
          The optional guide needs JavaScript. You can use the direct resource
          links elsewhere on this page without it.
        </p>
      </noscript>
    </section>
  );
}
