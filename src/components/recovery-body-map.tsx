"use client";
import { useRef, useState } from "react";
import { areas, sensations, type Draft } from "@/lib/recovery/model";
export function RecoveryBodyMap({
  body,
  onChange,
}: {
  body: Draft["body"];
  onChange: (body: Draft["body"]) => void;
}) {
  const [side, setSide] = useState<"Front" | "Back">("Back");
  const [active, setActive] = useState<(typeof areas)[number]>("Upper back");
  const sheet = useRef<HTMLDialogElement>(null);
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
  const tags = body.find((x) => x.area === active)?.tags ?? [];
  function toggle(tag: (typeof sensations)[number]) {
    let next = tags.includes(tag)
      ? tags.filter((t) => t !== tag)
      : [...tags, tag];
    if (tag === "Avoid" && !tags.includes(tag))
      next = next.filter((t) => t !== "Focus");
    if (tag === "Focus" && !tags.includes(tag))
      next = next.filter((t) => t !== "Avoid");
    onChange([
      ...body.filter((x) => x.area !== active),
      ...(next.length ? [{ area: active, tags: next }] : []),
    ]);
  }
  return (
    <div className="rr-body-layout">
      <dialog
        ref={sheet}
        className="rr-map-sheet"
        aria-labelledby="rr-sheet-title"
        aria-modal="true"
      >
        <p className="eyebrow">YOUR BODY · YOUR BOUNDARIES</p>
        <h3 id="rr-sheet-title">{active}</h3>
        <p>What should Kamilla know?</p>
        <div className="rr-choices">
          {sensations.map((t) => (
            <button
              type="button"
              key={t}
              aria-pressed={tags.includes(t)}
              onClick={() => toggle(t)}
            >
              {t === "Avoid" ? "Avoid this area" : t}
            </button>
          ))}
        </div>
        <p className="rr-caption">
          Tap again to clear. Avoid takes priority over focus.
        </p>
        <button
          type="button"
          className="rr-primary"
          onClick={() => sheet.current?.close()}
        >
          Done with this area
        </button>
      </dialog>
      <div>
        <div className="rr-switch" aria-label="Body view">
          {(["Front", "Back"] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={side === s}
              onClick={() => setSide(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="rr-figure">
          <svg viewBox="0 0 260 490" aria-hidden="true">
            <defs>
              <linearGradient id="rr-body-fill" x2="1" y2="1">
                <stop stopColor="#55727c" />
                <stop offset="1" stopColor="#263f4a" />
              </linearGradient>
            </defs>
            <ellipse cx="130" cy="478" rx="84" ry="6" fill="#091c26" />
            <path
              d="M130 12 C100 12 102 38 106 54 L114 70 L113 89 L77 103 Q61 107 55 132 L38 202 L21 260 Q17 281 29 284 Q42 284 45 264 L60 211 L80 155 L83 217 L72 246 Q76 279 80 302 L83 351 L84 421 L78 454 Q73 469 90 469 L113 467 L117 443 L119 379 L130 288 L141 379 L143 443 L147 467 L170 469 Q187 469 182 454 L176 421 L177 351 L180 302 Q184 279 188 246 L177 217 L180 155 L200 211 L215 264 Q218 284 231 284 Q243 281 239 260 L222 202 L205 132 Q199 107 183 103 L147 89 L146 70 L154 54 C158 38 160 12 130 12Z"
              fill="url(#rr-body-fill)"
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
          </svg>
          {points.map(([area, x, y]) => {
            const mark = body.find((b) => b.area === area);
            return (
              <button
                key={area}
                type="button"
                className={`rr-point ${active === area ? "active" : ""} ${mark ? "marked" : ""} ${mark?.tags.includes("Avoid") ? "avoid" : ""}`}
                style={{
                  left: `${(x / 260) * 100}%`,
                  top: `${(y / 490) * 100}%`,
                }}
                aria-label={`${area}${mark ? `: ${mark.tags.join(", ")}` : ""}`}
                aria-pressed={active === area}
                onClick={() => {
                  setActive(area);
                  if (window.matchMedia("(max-width: 650px)").matches)
                    sheet.current?.showModal();
                }}
              >
                <span aria-hidden="true">
                  {mark?.tags.includes("Avoid") ? "−" : mark ? "✓" : "+"}
                </span>
              </button>
            );
          })}
        </div>
        <p className="rr-caption">Left and right refer to your body.</p>
      </div>
      <div className="rr-area-editor">
        <label htmlFor="rr-area">Select an area</label>
        <select
          id="rr-area"
          value={active}
          onChange={(e) => setActive(e.target.value as typeof active)}
        >
          {areas.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
        <h3>{active}</h3>
        <p>What should Kamilla know?</p>
        <div className="rr-choices">
          {sensations.map((t) => (
            <button
              type="button"
              key={t}
              aria-pressed={tags.includes(t)}
              className={t === "Avoid" ? "rr-avoid-choice" : ""}
              onClick={() => toggle(t)}
            >
              {t === "Avoid" ? "Avoid this area" : t}
            </button>
          ))}
        </div>
        <p className="rr-caption">
          Tap again to clear. An avoid instruction always takes priority.
        </p>
        <div className="rr-body-summary" aria-live="polite">
          {body.length ? (
            body.map((x) => (
              <p key={x.area}>
                <strong>{x.area}</strong>
                <span>{x.tags.join(" · ")}</span>
              </p>
            ))
          ) : (
            <p>
              No areas marked. A whole-body relaxation session is welcome, too.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
