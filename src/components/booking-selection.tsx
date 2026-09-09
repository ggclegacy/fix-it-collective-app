"use client";
import { useState, type Dispatch, type SetStateAction } from "react";
import {
  services,
  professionals,
  money,
  addons,
  type Service,
} from "@/lib/catalog";
import type { Slot } from "@/lib/types";
export function BookingSelection({
  step,
  serviceId,
  professionalId,
  setService,
  setAddons,
  setSlot,
  setProfessional,
  addonIds,
  catalog = services,
}: {
  step: number;
  service: Service | undefined;
  serviceId: string;
  professionalId: string;
  addonIds: string[];
  setService: Dispatch<SetStateAction<string>>;
  setProfessional: Dispatch<SetStateAction<string>>;
  setAddons: Dispatch<SetStateAction<string[]>>;
  setSlot: Dispatch<SetStateAction<Slot | null>>;
  catalog?: Service[];
}) {
  const [goal, setGoal] = useState("");
  const massage = professionalId === "pro-b";
  const goals = massage
    ? [
        "Relaxation",
        "Soreness / recovery",
        "Deeper work",
        "Specific problem area",
        "First massage",
      ]
    : ["Haircut", "Beard", "Grooming reset", "Not sure what I need"];
  const recommended =
    goal === "Haircut"
      ? ["signature-cut"]
      : goal === "Beard"
        ? ["beard"]
        : goal === "Grooming reset"
          ? ["cut-beard"]
          : null;
  return step === 0 ? (
    <div className="selection-list">
      {professionals.map((p) => (
        <button
          aria-pressed={professionalId === p.id}
          className={`selection ${professionalId === p.id ? "selected" : ""}`}
          key={p.id}
          onClick={() => {
            setProfessional(p.id);
            setService("");
            setGoal("");
            setAddons([]);
            setSlot(null);
          }}
        >
          <span className="avatar">{p.initials}</span>
          <div>
            <h3>{p.name}</h3>
            <p>{p.description}</p>
          </div>
        </button>
      ))}
    </div>
  ) : (
    <>
      <p>
        {massage
          ? "How would you like to feel?"
          : "What would make this visit yours?"}
      </p>
      <div className="experience-tabs">
        {goals.map((g) => (
          <button
            key={g}
            aria-pressed={goal === g}
            onClick={() => {
              setGoal(g);
              setService("");
              setSlot(null);
            }}
          >
            {g}
          </button>
        ))}
      </div>
      {goal && (
        <div className="selection-list">
          {catalog
            .filter(
              (s) =>
                professionals
                  .find((p) => p.id === professionalId)
                  ?.services.includes(s.id) &&
                (!recommended || recommended.includes(s.id)),
            )
            .map((s) => (
              <button
                key={s.id}
                aria-pressed={serviceId === s.id}
                className={`selection ${serviceId === s.id ? "selected" : ""}`}
                onClick={() => {
                  setService(s.id);
                  setAddons([]);
                  setSlot(null);
                }}
              >
                <div>
                  <span className="eyebrow">{goal}</span>
                  <h3>{s.name}</h3>
                  <p>{s.description}</p>
                  <p>
                    {s.duration} min ·{" "}
                    {s.price < 0 ? "Pricing awaiting approval" : money(s.price)}
                  </p>
                </div>
              </button>
            ))}
        </div>
      )}
      {serviceId &&
        addons
          .filter((a) => a.services.includes(serviceId))
          .map((a) => (
            <label className="check-row" key={a.id}>
              <input
                type="checkbox"
                checked={addonIds.includes(a.id)}
                onChange={(e) => {
                  setAddons(
                    e.target.checked
                      ? [...addonIds, a.id]
                      : addonIds.filter((id) => id !== a.id),
                  );
                  setSlot(null);
                }}
              />
              {a.name} · +{a.duration} min · {money(a.price)} (preview add-on)
            </label>
          ))}
    </>
  );
}
