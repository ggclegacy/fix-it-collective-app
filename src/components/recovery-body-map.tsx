"use client";
import { useEffect, useRef, useState, useId } from "react";
import {
  areas,
  sensations,
  bodyIntents,
  compareBody,
  describeRegion,
  type Draft,
  type BodySnapshot,
} from "@/lib/recovery/model";
import { BodyHistory } from "./recovery-body-history";
type Region = Draft["body"][number];
export function RecoveryBodyMap({
  body,
  onChange,
  noProblemAreas,
  onNoProblemAreas,
  previous,
  history = [],
}: {
  body: Draft["body"];
  onChange: (body: Draft["body"]) => void;
  noProblemAreas: boolean;
  onNoProblemAreas: (v: boolean) => void;
  previous?: Draft["body"];
  history?: BodySnapshot[];
}) {
  const [side, setSide] = useState<"Front" | "Back">("Back");
  const [detail, setDetail] = useState<
    "Whole body" | "Upper body" | "Lower body"
  >("Whole body");
  const [active, setActive] = useState<(typeof areas)[number]>("Upper back");
  const [full, setFull] = useState(false);
  const [clear, setClear] = useState(false);
  const sheet = useRef<HTMLDialogElement>(null),
    immersive = useRef<HTMLDialogElement>(null),
    expand = useRef<HTMLButtonElement>(null);
  const uid = useId();
  useEffect(() => {
    if (!full) return;
    immersive.current?.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = old;
    };
  }, [full]);
  const right = side === "Front" ? 82 : 178,
    left = 260 - right;
  const points: [(typeof areas)[number], number, number][] = [
    ["Neck", 130, 84],
    ["Left shoulder", left, 119],
    ["Right shoulder", right, 119],
    ...((side === "Front"
      ? [
          ["Chest", 130, 139],
          ["Abdomen", 130, 198],
        ]
      : [
          ["Upper back", 130, 145],
          ["Lower back", 130, 201],
        ]) as [(typeof areas)[number], number, number][]),
    ["Left arm", side === "Front" ? 211 : 49, 192],
    ["Right arm", side === "Front" ? 49 : 211, 192],
    ["Left hand", side === "Front" ? 230 : 30, 263],
    ["Right hand", side === "Front" ? 30 : 230, 263],
    ["Left hip / glute", side === "Front" ? 158 : 102, 250],
    ["Right hip / glute", side === "Front" ? 102 : 158, 250],
    ["Left thigh", side === "Front" ? 159 : 101, 303],
    ["Right thigh", side === "Front" ? 101 : 159, 303],
    ["Left knee", side === "Front" ? 159 : 101, 354],
    ["Right knee", side === "Front" ? 101 : 159, 354],
    ["Left lower leg", side === "Front" ? 159 : 101, 402],
    ["Right lower leg", side === "Front" ? 101 : 159, 402],
    ["Left foot", side === "Front" ? 164 : 96, 455],
    ["Right foot", side === "Front" ? 96 : 164, 455],
  ];
  const current = body.find((b) => b.area === active);
  function edit(area: Region["area"]) {
    setActive(area);
    sheet.current?.showModal();
  }
  function update(patch: Partial<Region>) {
    const next: Region = {
      area: active,
      tags: current?.tags ?? [],
      ...current,
      ...patch,
    };
    onChange([
      ...body.filter((b) => b.area !== active),
      ...(next.tags.length || next.intensity !== undefined ? [next] : []),
    ]);
  }
  function toggle(tag: Region["tags"][number]) {
    const tags = current?.tags ?? [];
    const next = tags.includes(tag)
      ? tags.filter((t) => t !== tag)
      : [...tags, tag];
    update({ tags: next });
  }
  function chooseIntent(tag: (typeof bodyIntents)[number]) {
    update({
      tags: [
        ...(current?.tags ?? []).filter(
          (t) => !bodyIntents.includes(t as (typeof bodyIntents)[number]),
        ),
        tag,
      ],
    });
  }
  function relaxed() {
    // Keep consent boundaries; a no-problem answer must never erase an avoid instruction.
    onChange(
      body
        .filter((b) => b.tags.includes("Avoid"))
        .map((b) => ({ area: b.area, tags: ["Avoid"] })),
    );
    onNoProblemAreas(true);
    setClear(false);
  }
  function closeFull() {
    setFull(false);
    requestAnimationFrame(() => expand.current?.focus());
  }
  const canvas = (
    <section className="bim" aria-label="Body Intelligence Map">
      <header className="bim-header">
        <div>
          <p className="eyebrow">BODY INTELLIGENCE · BY MILLA</p>
          <h2>
            A little awareness.
            <br />
            <em>More personal care.</em>
          </h2>
        </div>
        {full ? (
          <button type="button" className="bim-control" onClick={closeFull}>
            Return to intake
          </button>
        ) : (
          <button
            ref={expand}
            type="button"
            className="bim-control"
            onClick={() => setFull(true)}
          >
            Open full-screen map
          </button>
        )}
      </header>
      <p className="bim-intro">
        Explore your body. Tell Kamilla what you feel and how you’d like to be
        cared for.
      </p>
      <div className="bim-workspace">
        <div className="bim-visual">
          <div className="bim-toolbar" role="group" aria-label="Body view">
            {(["Front", "Back"] as const).map((v) => (
              <button
                type="button"
                key={v}
                aria-pressed={side === v}
                onClick={() => setSide(v)}
              >
                {v}
              </button>
            ))}
          </div>
          <div
            className="bim-toolbar bim-detail"
            role="group"
            aria-label="Explore body detail"
          >
            {(["Whole body", "Upper body", "Lower body"] as const).map((v) => (
              <button
                type="button"
                key={v}
                aria-pressed={detail === v}
                onClick={() => setDetail(v)}
              >
                {v}
              </button>
            ))}
          </div>
          <div
            className={`bim-viewport ${detail === "Whole body" ? "" : "bim-zoom"}`}
          >
            <div className="bim-orbit" aria-hidden="true" />
            <div
              className={`bim-anatomy ${detail === "Lower body" ? "bim-lower" : ""}`}
            >
              <svg viewBox="0 0 260 490" aria-hidden="true">
                <defs>
                  <linearGradient id={`${uid}-fill`} x1="0" x2="1">
                    <stop stopColor="#233d49" />
                    <stop offset=".3" stopColor="#6f8585" />
                    <stop offset=".48" stopColor="#3a535e" />
                    <stop offset=".68" stopColor="#829490" />
                    <stop offset="1" stopColor="#243e4a" />
                  </linearGradient>
                  <radialGradient id={`${uid}-halo`}>
                    <stop stopColor="#ccbb9633" />
                    <stop offset="1" stopColor="#ccbb9600" />
                  </radialGradient>
                </defs>
                <ellipse
                  cx="130"
                  cy="240"
                  rx="125"
                  ry="220"
                  fill={`url(#${uid}-halo)`}
                />
                <path
                  d="M130 12 C100 12 102 38 106 54 L114 70 L113 89 L77 103 Q61 107 55 132 L38 202 L21 260 Q17 281 29 284 Q42 284 45 264 L60 211 L80 155 L83 217 L72 246 Q76 279 80 302 L83 351 L84 421 L78 454 Q73 469 90 469 L113 467 L117 443 L119 379 L130 288 L141 379 L143 443 L147 467 L170 469 Q187 469 182 454 L176 421 L177 351 L180 302 Q184 279 188 246 L177 217 L180 155 L200 211 L215 264 Q218 284 231 284 Q243 281 239 260 L222 202 L205 132 Q199 107 183 103 L147 89 L146 70 L154 54 C158 38 160 12 130 12Z"
                  fill={`url(#${uid}-fill)`}
                  stroke="#8fa4aa"
                  strokeWidth="1"
                />
                <path
                  d={
                    side === "Back"
                      ? "M130 99V224 M87 130Q108 141 122 164 M173 130Q152 141 138 164 M88 242Q105 260 126 250 M172 242Q155 260 134 250"
                      : "M130 110V221 M91 136Q110 157 128 145 M169 136Q150 157 132 145"
                  }
                  fill="none"
                  stroke="#a4b8b5"
                  opacity=".35"
                />
                <g stroke="#dce0cc" strokeWidth=".7" fill="none" opacity=".4">
                  <path d="M114 74L103 107L86 119M146 74L157 107L174 119M84 149Q72 175 63 209M176 149Q188 175 197 209M93 273Q98 312 98 342M167 273Q162 312 162 342M98 370Q105 397 99 432M162 370Q155 397 161 432" />
                  {side === "Back" ? (
                    <path d="M90 112Q98 128 123 136L109 174L87 151M170 112Q162 128 137 136L151 174L173 151M117 176L119 214M143 176L141 214M90 226Q107 233 125 228M170 226Q153 233 135 228" />
                  ) : (
                    <path d="M90 118Q108 113 126 123L123 147Q103 152 88 138M170 118Q152 113 134 123L137 147Q157 152 172 138M115 159H145M113 176H147M115 193H145M118 210H142" />
                  )}
                </g>
              </svg>
              {points
                .filter(
                  ([area, , y]) =>
                    detail === "Whole body" ||
                    (detail === "Upper body"
                      ? y < 225 || area.includes("hand")
                      : y >= 225 && !area.includes("hand")),
                )
                .map(([area, x, y]) => {
                  const mark = body.find((b) => b.area === area),
                    avoid = mark?.tags.includes("Avoid");
                  return (
                    <button
                      type="button"
                      className={`bim-point ${mark ? "is-marked" : ""} ${avoid ? "is-avoid" : ""}`}
                      key={area}
                      style={{
                        left: `${(x / 260) * 100}%`,
                        top: `${(y / 490) * 100}%`,
                      }}
                      aria-label={`${area}${mark ? `: ${describeRegion(mark)}` : ""}`}
                      aria-haspopup="dialog"
                      onClick={() => edit(area)}
                    >
                      <span aria-hidden="true">
                        {avoid ? "−" : mark ? "✓" : "+"}
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
          <p className="rr-caption bim-orientation">
            {side} view · Left and right refer to your body.
          </p>
          <div className="bim-legend">
            <span>+ Explore</span>
            <span>✓ Selected</span>
            <span>− Avoid</span>
          </div>
        </div>
        <aside className="bim-report" aria-label="Your body report">
          <p className="eyebrow">YOUR SESSION, TAKING SHAPE</p>
          <h3>
            {body.length
              ? `${body.length} ${body.length === 1 ? "area" : "areas"} of care`
              : "Start wherever you feel it."}
          </h3>
          <label htmlFor={`${uid}-area`}>Choose an area by name</label>
          <select
            id={`${uid}-area`}
            value=""
            onChange={(e) => {
              if (e.target.value) edit(e.target.value as Region["area"]);
            }}
          >
            <option value="">Explore an area…</option>
            {areas.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
          <p className="rr-caption">
            Use the map or the list. You can mark several areas, including
            places to avoid.
          </p>
          <div className="bim-selections" aria-live="polite">
            {body.map((b) => (
              <button type="button" key={b.area} onClick={() => edit(b.area)}>
                <strong>
                  {b.area}
                  <span aria-hidden="true">↗</span>
                </strong>
                <span>{describeRegion(b)}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="bim-control bim-relax"
            aria-pressed={noProblemAreas}
            onClick={() =>
              body.some((b) => !b.tags.every((t) => t === "Avoid"))
                ? setClear(true)
                : relaxed()
            }
          >
            No pain / problem areas
          </button>
          {clear && (
            <div
              className="bim-clear"
              role="group"
              aria-label="Clear reported symptoms"
            >
              <p>
                Clear your symptoms and focus choices? Areas to avoid will stay
                marked.
              </p>
              <button type="button" className="bim-control" onClick={relaxed}>
                Clear symptoms
              </button>{" "}
              <button
                type="button"
                className="bim-control"
                onClick={() => setClear(false)}
              >
                Keep my selections
              </button>
            </div>
          )}
          {noProblemAreas && (
            <p role="status">
              No problem areas reported. You can still add boundaries or
              preferences.
            </p>
          )}
          <p className="rr-caption">
            Selecting an area is a conversation starter. Kamilla will confirm
            consent, draping and pressure before treatment.
          </p>
        </aside>
      </div>
      {previous && (
        <details className="bim-history">
          <summary>What changed from your saved report?</summary>
          {compareBody(body, previous).length ? (
            compareBody(body, previous).map((line) => <p key={line}>{line}</p>)
          ) : (
            <p>No region changes yet.</p>
          )}
        </details>
      )}
      <BodyHistory history={history} />
      <dialog
        ref={sheet}
        onCancel={(event) => event.stopPropagation()}
        className="bim-sheet"
        aria-labelledby={`${uid}-title`}
      >
        <p className="eyebrow">YOUR BODY · YOUR BOUNDARIES</p>
        <h2 id={`${uid}-title`}>{active}</h2>
        <fieldset>
          <legend>What are you feeling?</legend>
          <div className="rr-choices">
            {sensations
              .filter(
                (t) => !bodyIntents.includes(t as (typeof bodyIntents)[number]),
              )
              .map((t) => (
                <button
                  type="button"
                  key={t}
                  aria-pressed={current?.tags.includes(t) ?? false}
                  onClick={() => toggle(t)}
                >
                  {t}
                </button>
              ))}
          </div>
        </fieldset>
        <label className="bim-intensity" htmlFor={`${uid}-intensity`}>
          How noticeable is it?{" "}
          <strong>
            {current?.intensity === undefined
              ? "Not rated"
              : `${current.intensity} / 10`}
          </strong>
        </label>
        <input
          className="bim-slider"
          type="range"
          min={0}
          max={10}
          step={1}
          value={current?.intensity ?? 0}
          aria-label="Adjust region intensity"
          aria-valuetext={
            current?.intensity === undefined
              ? "Not rated; adjust to choose a value"
              : `${current.intensity} out of 10`
          }
          onChange={(event) =>
            update({ intensity: Number(event.target.value) })
          }
        />
        <select
          id={`${uid}-intensity`}
          value={current?.intensity ?? ""}
          onChange={(e) =>
            update({
              intensity:
                e.target.value === "" ? undefined : Number(e.target.value),
            })
          }
        >
          <option value="">Prefer to discuss / not rated</option>
          {Array.from({ length: 11 }, (_, n) => (
            <option key={n} value={n}>
              {n}
              {n === 0
                ? " · not noticeable"
                : n === 10
                  ? " · most noticeable"
                  : ""}
            </option>
          ))}
        </select>
        <fieldset>
          <legend>How would you like this area treated?</legend>
          <div className="rr-choices">
            {bodyIntents.map((t) => (
              <button
                type="button"
                key={t}
                aria-pressed={current?.tags.includes(t) ?? false}
                onClick={() => chooseIntent(t)}
              >
                {t === "Focus"
                  ? "Focus here"
                  : t === "Avoid"
                    ? "Avoid this area"
                    : t}
              </button>
            ))}
          </div>
        </fieldset>
        {current?.tags.includes("Numbness / tingling") && (
          <p className="bim-flag">
            This report will be highlighted for Kamilla to discuss before
            treatment. The map does not identify a cause or recommend treatment.
          </p>
        )}
        <div className="bim-sheet-actions">
          <button
            type="button"
            className="rr-primary"
            onClick={() => sheet.current?.close()}
          >
            Done with this area
          </button>
          <button
            type="button"
            className="bim-control"
            disabled={!current}
            onClick={() => {
              onChange(body.filter((b) => b.area !== active));
              sheet.current?.close();
            }}
          >
            Remove area
          </button>
        </div>
        <p className="rr-caption">
          Changes are included in your draft. Finish the intake to save them.
        </p>
      </dialog>
    </section>
  );
  return full ? (
    <dialog
      ref={immersive}
      className="bim-full"
      aria-label="Full-screen Body Intelligence Map"
      onCancel={closeFull}
    >
      {canvas}
    </dialog>
  ) : (
    canvas
  );
}
