"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { DateTime } from "luxon";
import { professionals, studio } from "@/lib/catalog";
import type { Block } from "@/lib/types";
import { api, message } from "@/lib/client";
const clock = (m: number) =>
  `${Math.floor(m / 60)
    .toString()
    .padStart(2, "0")}:${(m % 60).toString().padStart(2, "0")}`;
const minutes = (s: string) =>
  Number(s.split(":")[0]) * 60 + Number(s.split(":")[1]);
export function AvailabilitySettings({
  hours,
  blocks,
}: {
  hours: {
    professional_id: string;
    weekday: number;
    opens: number;
    closes: number;
  }[];
  blocks: Block[];
}) {
  const router = useRouter();
  const [pro, setPro] = useState(professionals[0].id);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(body: unknown) {
    setBusy(true);
    setFeedback("");
    try {
      await api("/api/staff", body);
      setFeedback("Availability updated.");
      router.refresh();
    } catch (e) {
      setFeedback(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <label className="professional-filter">
        Professional
        <select value={pro} onChange={(e) => setPro(e.target.value)}>
          {professionals.map((p) => (
            <option value={p.id} key={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      {feedback && (
        <p role="status" className="notice">
          {feedback}
        </p>
      )}
      <div className="insights-grid">
        <section className="panel">
          <p className="eyebrow">WEEKLY RHYTHM</p>
          <h2>Working hours.</h2>
          <p className="muted">
            Central Time · closing time includes cleanup buffers.
          </p>
          {[
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
          ].map((day, i) => {
            const h = hours.find(
              (h) => h.professional_id === pro && h.weekday === i + 1,
            );
            return (
              <form
                className="hours-row"
                key={`${pro}-${day}-${h?.opens}-${h?.closes}`}
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  void save({
                    action: "hours",
                    professionalId: pro,
                    weekday: i + 1,
                    opens: minutes(String(f.get("opens"))),
                    closes: minutes(String(f.get("closes"))),
                    closed: f.get("closed") === "on",
                  });
                }}
              >
                <strong>{day}</strong>
                <label className="check-row">
                  <input type="checkbox" name="closed" defaultChecked={!h} />
                  Closed
                </label>
                <div>
                  <input
                    type="time"
                    name="opens"
                    aria-label={`${day} opening time`}
                    defaultValue={clock(h?.opens ?? 540)}
                    required
                  />
                  <span>to</span>
                  <input
                    type="time"
                    name="closes"
                    aria-label={`${day} closing time`}
                    defaultValue={clock(h?.closes ?? 1080)}
                    required
                  />
                  <button className="button outline small" disabled={busy}>
                    Save
                  </button>
                </div>
              </form>
            );
          })}
        </section>
        <section>
          <div className="panel">
            <p className="eyebrow">A LITTLE BREATHING ROOM</p>
            <h2>Block time.</h2>
            <p className="muted">
              For breaks, personal time, or a day away. Existing appointments
              must be moved first.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void save({
                  action: "block",
                  professionalId: pro,
                  start: DateTime.fromISO(String(f.get("start")), {
                    zone: studio.timezone,
                  })
                    .toUTC()
                    .toISO(),
                  end: DateTime.fromISO(String(f.get("end")), {
                    zone: studio.timezone,
                  })
                    .toUTC()
                    .toISO(),
                  reason: f.get("reason"),
                });
              }}
            >
              <label>
                From (Central Time)
                <input type="datetime-local" name="start" required />
              </label>
              <label>
                Until (Central Time)
                <input type="datetime-local" name="end" required />
              </label>
              <label>
                Reason
                <input
                  name="reason"
                  placeholder="Time off, lunch, personal…"
                  required
                  maxLength={200}
                />
              </label>
              <button className="button navy" disabled={busy}>
                Block this time
              </button>
            </form>
          </div>
          <div className="quiet-panel">
            <h3>Blocked time</h3>
            {blocks.filter((b) => b.professional_id === pro).length ? (
              blocks
                .filter((b) => b.professional_id === pro)
                .map((b) => (
                  <div className="block-row" key={b.id}>
                    <strong>{b.reason}</strong>
                    <p>
                      {DateTime.fromISO(b.start_at)
                        .setZone(studio.timezone)
                        .toFormat("LLL d, h:mm a")}{" "}
                      –{" "}
                      {DateTime.fromISO(b.end_at)
                        .setZone(studio.timezone)
                        .toFormat("LLL d, h:mm a")}
                    </p>
                    <button
                      className="text-link"
                      disabled={busy}
                      onClick={() => void save({ action: "unblock", id: b.id })}
                    >
                      Remove block
                    </button>
                  </div>
                ))
            ) : (
              <p>No blocked time for this professional.</p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
