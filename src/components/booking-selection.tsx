"use client";
import { useState, type Dispatch, type SetStateAction } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { services, professionals, addons, money } from "@/lib/catalog";
import type { Slot } from "@/lib/types";
export function BookingSelection({
  step,
  service,
  serviceId,
  professionalId,
  addonIds,
  setService,
  setAddons,
  setSlot,
  setProfessional,
}: {
  step: number;
  service: (typeof services)[number] | undefined;
  serviceId: string;
  professionalId: string;
  addonIds: string[];
  setService: Dispatch<SetStateAction<string>>;
  setProfessional: Dispatch<SetStateAction<string>>;
  setAddons: Dispatch<SetStateAction<string[]>>;
  setSlot: Dispatch<SetStateAction<Slot | null>>;
}) {
  const [category, setCategory] = useState("All");
  const visible = services.filter(
    (s) =>
      category === "All" ||
      (category === "Beauty"
        ? s.category === "Color"
        : category === "Grooming" && s.category !== "Color"),
  );
  return (
    <>
      {" "}
      {step === 0 && (
        <>
          <div className="experience-tabs" aria-label="Filter booking services">
            {["All", "Grooming", "Beauty", "Recovery", "Wellness"].map((c) => (
              <button
                key={c}
                aria-pressed={category === c}
                onClick={() => {
                  setCategory(c);
                  setService("");
                  setAddons([]);
                  setSlot(null);
                  setProfessional("any");
                }}
              >
                {c}
              </button>
            ))}
          </div>
          {!visible.length && (
            <div className="partner-pending">
              <p className="eyebrow">RECOVERY ROOM BY MILLA</p>
              <h3>Appointments are not yet open.</h3>
              <p>
                The menu and practitioner availability are awaiting approval.
              </p>
              <Link className="text-link" href="/recovery">
                Explore Recovery Room ↗
              </Link>
            </div>
          )}
          <div className="selection-list">
            {visible.map((s) => (
              <button
                key={s.id}
                aria-pressed={serviceId === s.id}
                className={`selection ${serviceId === s.id ? "selected" : ""}`}
                onClick={() => {
                  setService(s.id);
                  setAddons([]);
                  setSlot(null);
                  if (
                    !professionals
                      .find((p) => p.id === professionalId)
                      ?.services.includes(s.id)
                  )
                    setProfessional("any");
                }}
              >
                <div>
                  <span className="eyebrow">{s.category}</span>
                  <h3>{s.name}</h3>
                  <p>
                    {s.duration} min · from {money(s.price)}
                  </p>
                </div>
                <span className="radio-dot">
                  {serviceId === s.id && <Check size={14} />}
                </span>
              </button>
            ))}
          </div>
          {service &&
            addons
              .filter((a) => a.services.includes(serviceId))
              .map((a) => (
                <label className="check-row addon" key={a.id}>
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
                  <span>
                    <strong>{a.name}</strong>
                    <small>
                      Optional · +{a.duration} min · +{money(a.price)}
                    </small>
                  </span>
                </label>
              ))}
        </>
      )}
      {step === 1 && (
        <div className="selection-list">
          {[
            {
              id: "any",
              name: "Best available",
              description: "The earliest opening with the right professional.",
              initials: "↗",
            },
            ...professionals.filter((p) => p.services.includes(serviceId)),
          ].map((p) => (
            <button
              className={`selection ${professionalId === p.id ? "selected" : ""}`}
              key={p.id}
              onClick={() => {
                setProfessional(p.id);
                setSlot(null);
              }}
            >
              <span className="avatar">{p.initials}</span>
              <div>
                <h3>{p.name}</h3>
                <p>{p.description}</p>
              </div>
              <span className="radio-dot">
                {professionalId === p.id && <Check size={14} />}
              </span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
