import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { commandSearch } from "@/lib/business/intelligence";
export const metadata = { title: "Search Fix It" };
export default async function Search({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; context?: string }>;
}) {
  const user = await requireUser(true),
    q = await searchParams,
    results = commandSearch(user, q.q ?? "", q.context);
  return (
    <>
      <header className="os-hero">
        <div>
          <p className="eyebrow">COMMAND SEARCH</p>
          <h1>Find your next move.</h1>
          <p>
            Clients, visits, products, unpaid orders, dates, and business
            reports.
          </p>
        </div>
      </header>
      <section className="os-panel">
        <form action="/studio/search" className="os-form">
          <label>
            Search Fix It
            <input
              name="q"
              defaultValue={q.q ?? ""}
              placeholder="A client, tomorrow, unpaid, revenue…"
              maxLength={120}
            />
          </label>
          {q.context && (
            <input type="hidden" name="context" value={q.context} />
          )}
          <button className="button navy">Search</button>
        </form>
        <div className="os-search-results">
          {results.map((r, i) => (
            <Link key={`${r.href}:${i}`} href={r.href}>
              {r.label}
              <small>{r.detail} ↗</small>
            </Link>
          ))}
        </div>
        {q.q && !results.length && (
          <p className="os-empty">
            No matching records in your permitted workspace.
          </p>
        )}
        <p className="os-muted">
          Search uses structured records. Clinical notes and health information
          are excluded.
        </p>
      </section>
    </>
  );
}
