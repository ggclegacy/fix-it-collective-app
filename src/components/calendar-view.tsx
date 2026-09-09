"use client";
import { useState, useSyncExternalStore } from "react";
import { DateTime } from "luxon";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Appointment } from "@/lib/types";
import { professionals, services, studio } from "@/lib/catalog";
import { AppointmentCard } from "./appointment-card";
const subscribe = () => () => {};
export function CalendarView({
  appointments,
}: {
  appointments: Appointment[];
}) {
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [date, setDate] = useState(
    DateTime.now().setZone(studio.timezone).toISODate()!,
  );
  const [view, setView] = useState<"day" | "week">("day");
  const [pro, setPro] = useState("all");
  const day = DateTime.fromISO(date, { zone: studio.timezone });
  const list = appointments.filter(
    (a) =>
      (pro === "all" || pro === a.professional_id) &&
      DateTime.fromISO(a.start_at).setZone(studio.timezone).hasSame(day, view),
  );
  return (
    <>
      <div className="calendar-toolbar">
        <div className="calendar-date">
          <button
            className="icon-button"
            aria-label={`Previous ${view}`}
            onClick={() =>
              setDate(day.minus({ days: view === "week" ? 7 : 1 }).toISODate()!)
            }
          >
            <ChevronLeft />
          </button>
          <input
            type="date"
            aria-label="Calendar date"
            disabled={!hydrated}
            value={date}
            onChange={(e) => {
              if (e.target.value) setDate(e.target.value);
            }}
          />
          <button
            className="icon-button"
            aria-label={`Next ${view}`}
            onClick={() =>
              setDate(day.plus({ days: view === "week" ? 7 : 1 }).toISODate()!)
            }
          >
            <ChevronRight />
          </button>
          <button
            className="text-link"
            onClick={() =>
              setDate(DateTime.now().setZone(studio.timezone).toISODate()!)
            }
          >
            Today
          </button>
        </div>
        <select
          aria-label="Filter professional"
          value={pro}
          onChange={(e) => setPro(e.target.value)}
        >
          <option value="all">All professionals</option>
          {professionals.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <div className="segmented">
          <button aria-pressed={view === "day"} onClick={() => setView("day")}>
            Day
          </button>
          <button
            aria-pressed={view === "week"}
            onClick={() => setView("week")}
          >
            Week
          </button>
        </div>
      </div>
      {view === "day" ? (
        <div className="day-agenda">
          {list.length ? (
            list.map((a) => (
              <AppointmentCard key={a.id} appointment={a} staff />
            ))
          ) : (
            <div className="empty-state">
              <h3>An open page.</h3>
              <p>No appointments for this day and professional.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="week-calendar">
          {Array.from({ length: 7 }, (_, i) =>
            day.startOf("week").plus({ days: i }),
          ).map((d) => (
            <section className="week-day" key={d.toISODate()}>
              <button
                className="week-day-heading"
                onClick={() => {
                  setDate(d.toISODate()!);
                  setView("day");
                }}
              >
                <span>{d.toFormat("ccc")}</span>
                <strong>{d.day}</strong>
              </button>
              {list
                .filter((a) =>
                  DateTime.fromISO(a.start_at)
                    .setZone(studio.timezone)
                    .hasSame(d, "day"),
                )
                .map((a) => (
                  <button
                    className={`calendar-event ${a.status}`}
                    key={a.id}
                    onClick={() => {
                      setDate(d.toISODate()!);
                      setView("day");
                    }}
                  >
                    <span>
                      {DateTime.fromISO(a.start_at)
                        .setZone(studio.timezone)
                        .toFormat("h:mm a")}
                    </span>
                    <strong>{a.client_name}</strong>
                    <small>
                      {services.find((s) => s.id === a.service_id)?.name}
                    </small>
                    <small>{a.status.replace("_", " ")}</small>
                  </button>
                ))}
            </section>
          ))}
        </div>
      )}
    </>
  );
}
