"use client";
import Link from "next/link";
import { useState } from "react";
import { Search, ArrowUpRight } from "lucide-react";
import { DateTime } from "luxon";
import type { ClientSummary } from "@/lib/staff";
import { money, studio } from "@/lib/catalog";
export function ClientDirectory({ clients }: { clients: ClientSummary[] }) {
  const [query, setQuery] = useState("");
  const [due, setDue] = useState(false);
  const filtered = clients.filter(
    (c) =>
      `${c.name} ${c.email} ${c.phone}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (!due || (c.visits > 0 && !c.next_visit)),
  );
  return (
    <>
      <div className="directory-toolbar">
        <label className="search-field">
          <Search size={19} />
          <input
            aria-label="Search clients"
            placeholder="Find a name, email, or phone…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <button
          className={`button outline ${due ? "selected" : ""}`}
          aria-pressed={due}
          onClick={() => setDue(!due)}
        >
          Ready to rebook
        </button>
        <span className="muted">{filtered.length} clients</span>
      </div>
      <div className="client-table">
        <div className="client-table-head">
          <span>CLIENT</span>
          <span>COMPLETED VISITS</span>
          <span>SERVICE VALUE</span>
          <span>NEXT VISIT</span>
          <span />
        </div>
        {filtered.map((c) => (
          <Link
            className="client-table-row"
            key={c.id}
            href={`/studio/clients/${c.id}`}
          >
            <div className="client-name">
              <span className="avatar">
                {c.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}
              </span>
              <div>
                <strong>{c.name}</strong>
                <small>{c.email}</small>
              </div>
            </div>
            <span>
              {c.visits}
              <small className="mobile-only"> completed visits</small>
            </span>
            <span>{money(c.value)}</span>
            <span>
              {c.next_visit ? (
                DateTime.fromISO(c.next_visit)
                  .setZone(studio.timezone)
                  .toFormat("LLL d, yyyy")
              ) : (
                <span className="muted">Not booked</span>
              )}
            </span>
            <ArrowUpRight size={18} />
          </Link>
        ))}
        {!filtered.length && (
          <div className="empty-state">
            <h3>No clients found.</h3>
            <p>Try another name or clear the rebooking filter.</p>
          </div>
        )}
      </div>
    </>
  );
}
