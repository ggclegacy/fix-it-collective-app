import { DateTime } from "luxon";
import { db, transaction } from "../db";
import { appointmentsFor, availableSlots } from "../scheduling";
import { studio, services } from "../catalog";
import { scopes, assertClient, auditBusiness } from "./access";
import { orders, products } from "./commerce";
import type { User } from "../types";
export function scopedAppointments(user: User, context?: string) {
  const ids = scopes(user, context);
  return appointmentsFor(user).filter((a) => ids.includes(a.professional_id));
}
function mergedMinutes(intervals: number[][]) {
  let end = -Infinity,
    total = 0;
  for (const [s, e] of intervals.sort((a, b) => a[0] - b[0])) {
    total += Math.max(0, e - Math.max(s, end));
    end = Math.max(end, e);
  }
  return total / 60000;
}
export function capacity(
  user: User,
  start: DateTime,
  end: DateTime,
  context?: string,
) {
  let available = 0,
    occupied = 0;
  const visits = scopedAppointments(user, context);
  for (let day = start.startOf("day"); day < end; day = day.plus({ days: 1 }))
    for (const id of scopes(user, context)) {
      const h = db()
        .prepare(
          "SELECT opens,closes FROM working_hours WHERE professional_id=? AND weekday=?",
        )
        .get(id, day.weekday) as { opens: number; closes: number } | undefined;
      if (!h) continue;
      const s = Math.max(
          start.toMillis(),
          day.plus({ minutes: h.opens }).toMillis(),
        ),
        e = Math.min(
          end.toMillis(),
          day.plus({ minutes: h.closes }).toMillis(),
        );
      if (s >= e) continue;
      const clip = (a: string, b: string) => [
        Math.max(s, Date.parse(a)),
        Math.min(e, Date.parse(b)),
      ];
      const blocks = (
        db()
          .prepare(
            "SELECT start_at,end_at FROM blocks WHERE professional_id=? AND start_at<? AND end_at>?",
          )
          .all(id, new Date(e).toISOString(), new Date(s).toISOString()) as {
          start_at: string;
          end_at: string;
        }[]
      ).map((b) => clip(b.start_at, b.end_at));
      const busy = visits
        .filter(
          (a) =>
            a.professional_id === id &&
            ["confirmed", "completed"].includes(a.status) &&
            Date.parse(a.start_at) < e &&
            Date.parse(a.busy_until) > s,
        )
        .map((a) => clip(a.start_at, a.busy_until));
      const blocked = mergedMinutes(blocks);
      available += (e - s) / 60000 - blocked;
      occupied += mergedMinutes([...blocks, ...busy]) - blocked;
    }
  return {
    available,
    occupied,
    open: Math.max(0, available - occupied),
    utilization: available ? Math.round((occupied / available) * 100) : null,
  };
}
export function metrics(
  user: User,
  days = 30,
  context?: string,
  now = DateTime.now().setZone(studio.timezone),
) {
  const start = now.startOf("day").minus({ days: days - 1 }),
    end = now.plus({ days: 1 }).startOf("day"),
    ids = scopes(user, context),
    all = scopedAppointments(user, context),
    inPeriod = (s: string) =>
      DateTime.fromISO(s) >= start && DateTime.fromISO(s) < end;
  const visits = all.filter((a) => inPeriod(a.start_at)),
    active = visits.filter((a) =>
      ["confirmed", "completed"].includes(a.status),
    ),
    done = visits.filter((a) => a.status === "completed");
  const saleOrders = orders(user, context).filter(
    (o) => o.status === "paid" && inPeriod(o.created_at),
  );
  const payments = (
    db()
      .prepare(
        "SELECT p.amount,p.fee,p.created_at,o.professional_id FROM order_payments p JOIN orders o ON o.id=p.order_id UNION ALL SELECT p.amount,NULL,p.created_at,a.professional_id FROM payment_events p JOIN appointments a ON a.id=p.appointment_id",
      )
      .all() as {
      amount: number;
      fee: number | null;
      created_at: string;
      professional_id: string;
    }[]
  ).filter((p) => ids.includes(p.professional_id) && inPeriod(p.created_at));
  const breakdown = saleOrders.flatMap((o) =>
    (
      db().prepare("SELECT * FROM order_items WHERE order_id=?").all(o.id) as {
        label: string;
        quantity: number;
        unit_price: number;
        discount: number;
        tax: number;
        product_id: string | null;
        service_id: string | null;
      }[]
    ).map((l) => ({
      ...l,
      provider: o.professional_id,
      net: l.quantity * l.unit_price - l.discount,
    })),
  );
  const first = (id: string) =>
    all.find((a) => a.client_id === id && a.status === "completed");
  const unique = [...new Set(active.map((a) => a.client_id))],
    newClients = unique.filter(
      (id) =>
        !all.some(
          (a) =>
            a.client_id === id &&
            a.status === "completed" &&
            DateTime.fromISO(a.start_at) < start,
        ),
    ).length;
  const doneClients = [...new Set(done.map((a) => a.client_id))],
    rebooked = doneClients.filter((id) =>
      all.some(
        (a) =>
          a.client_id === id &&
          a.status === "confirmed" &&
          DateTime.fromISO(a.start_at) > now,
      ),
    ).length;
  // Mature cohorts only: first visit 30–60 days ago and a second completed visit within 30 days.
  const cohort = [
    ...new Set(
      all.filter((a) => a.status === "completed").map((a) => a.client_id),
    ),
  ].filter((id) => {
    const f = first(id)!;
    return (
      DateTime.fromISO(f.start_at) >= now.minus({ days: 60 }) &&
      DateTime.fromISO(f.start_at) < now.minus({ days: 30 })
    );
  });
  const returned = cohort.filter((id) => {
    const f = first(id)!;
    return all.some(
      (a) =>
        a.client_id === id &&
        a.status === "completed" &&
        a.id !== f.id &&
        a.start_at > f.start_at &&
        DateTime.fromISO(a.start_at) <=
          DateTime.fromISO(f.start_at).plus({ days: 30 }),
    );
  });
  const openOrders = orders(user, context).filter((o) => o.status === "open"),
    billed = new Set(
      orders(user, context)
        .filter((o) => o.status !== "void")
        .map((o) => o.appointment_id),
    );
  const sums = (key: "provider" | "label") =>
    Object.entries(
      breakdown.reduce(
        (r, l) => {
          r[l[key]] = (r[l[key]] ?? 0) + l.net;
          return r;
        },
        {} as Record<string, number>,
      ),
    ).sort((a, b) => b[1] - a[1]);
  const sourceRows = db()
    .prepare(
      "SELECT a.id,s.source FROM appointments a LEFT JOIN appointment_sources s ON s.appointment_id=a.id",
    )
    .all() as { id: string; source: string | null }[];
  const sources = Object.entries(
    visits.reduce(
      (r, a) => {
        const source =
          sourceRows.find((s) => s.id === a.id)?.source ?? "unknown";
        r[source] = (r[source] ?? 0) + 1;
        return r;
      },
      {} as Record<string, number>,
    ),
  );
  const cap = capacity(user, start, end, context);
  return {
    days,
    start: start.toISODate(),
    end: now.toISODate(),
    visits: visits.length,
    booked: active.reduce((n, a) => n + a.price, 0),
    collected: payments.reduce((n, p) => n + p.amount, 0),
    refunds: -payments
      .filter((p) => p.amount < 0)
      .reduce((n, p) => n + p.amount, 0),
    fees: payments.some((p) => p.fee === null)
      ? null
      : payments.reduce((n, p) => n + (p.fee ?? 0), 0),
    serviceSales: breakdown
      .filter((l) => l.service_id)
      .reduce((n, l) => n + l.net, 0),
    retailSales: breakdown
      .filter((l) => l.product_id)
      .reduce((n, l) => n + l.net, 0),
    tips: saleOrders.reduce((n, o) => n + o.tip, 0),
    tax: saleOrders.reduce((n, o) => n + o.tax, 0),
    averageTicket: saleOrders.length
      ? Math.round(
          saleOrders.reduce((n, o) => n + o.subtotal - o.discount, 0) /
            saleOrders.length,
        )
      : null,
    newClients,
    returningClients: unique.length - newClients,
    cancellations: visits.filter((a) => a.status === "cancelled").length,
    noShows: visits.filter((a) => a.status === "no_show").length,
    rebooking: doneClients.length
      ? Math.round((rebooked / doneClients.length) * 100)
      : null,
    retention: cohort.length
      ? Math.round((returned.length / cohort.length) * 100)
      : null,
    retentionCohort: cohort.length,
    futureBooked: all
      .filter(
        (a) => a.status === "confirmed" && DateTime.fromISO(a.start_at) > now,
      )
      .reduce((n, a) => n + a.price, 0),
    outstanding:
      openOrders.reduce(
        (n, o) => n + Math.max(0, o.total - o.paid - o.deposit),
        0,
      ) +
      all
        .filter((a) => a.status === "completed" && !billed.has(a.id))
        .reduce((n, a) => n + Math.max(0, a.price - (a.paid ?? 0)), 0),
    ...cap,
    byProvider: sums("provider"),
    byItem: sums("label"),
    sources,
    trend: Array.from({ length: days }, (_, i) => {
      const day = start.plus({ days: i });
      return {
        date: day.toISODate()!,
        collected: payments
          .filter((p) =>
            DateTime.fromISO(p.created_at)
              .setZone(studio.timezone)
              .hasSame(day, "day"),
          )
          .reduce((n, p) => n + p.amount, 0),
      };
    }),
  };
}
export type Opportunity = {
  id: string;
  professional_id: string;
  client_id: string | null;
  kind: string;
  title: string;
  explanation: string;
  href: string;
  priority: number;
  status: string;
  observed_at: string;
};
export function refreshGrowth(user: User, context?: string) {
  const now = DateTime.now().setZone(studio.timezone),
    all = scopedAppointments(user, context),
    ids = scopes(user, context);
  const signals: Omit<Opportunity, "status" | "observed_at">[] = [];
  const add = (
    id: string,
    p: string,
    c: string | null,
    kind: string,
    title: string,
    explanation: string,
    href: string,
    priority = 2,
  ) =>
    signals.push({
      id,
      professional_id: p,
      client_id: c,
      kind,
      title,
      explanation,
      href,
      priority,
    });
  for (const p of ids) {
    const visits = all.filter((a) => a.professional_id === p),
      clients = [
        ...new Set(
          visits
            .filter((a) => a.status === "completed")
            .map((a) => a.client_id),
        ),
      ];
    for (const id of clients) {
      const history = visits.filter(
          (a) => a.client_id === id && a.status === "completed",
        ),
        last = history.at(-1)!;
      const r = db()
        .prepare(
          "SELECT return_days FROM client_relationships WHERE client_id=? AND professional_id=?",
        )
        .get(id, p) as { return_days: number | null } | undefined;
      const gaps = history
        .slice(1)
        .map(
          (a, i) =>
            (Date.parse(a.start_at) - Date.parse(history[i].start_at)) /
            86400000,
        )
        .filter((n) => n > 0);
      const interval =
        r?.return_days ??
        (gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : null);
      if (
        interval &&
        !visits.some(
          (a) =>
            a.client_id === id &&
            a.status === "confirmed" &&
            DateTime.fromISO(a.start_at) > now,
        ) &&
        now.diff(DateTime.fromISO(last.start_at), "days").days > interval * 1.2
      )
        add(
          `overdue:${p}:${id}`,
          p,
          id,
          "rebooking",
          `${last.client_name} is due back`,
          `${Math.floor(now.diff(DateTime.fromISO(last.start_at), "days").days)} days since their last visit; usual interval ${Math.round(interval)} days. Threshold: 120% of their recorded or observed interval.`,
          `/studio/clients/${id}`,
          1,
        );
      if (
        now.diff(DateTime.fromISO(last.start_at), "days").days <= 7 &&
        !db()
          .prepare("SELECT 1 FROM review_requests WHERE appointment_id=?")
          .get(last.id)
      )
        add(
          `review:${last.id}`,
          p,
          id,
          "review",
          `Review opportunity · ${last.client_name}`,
          "A completed visit within the past seven days has no review request recorded.",
          `/studio/clients/${id}`,
          3,
        );
    }
    const cap = capacity(
      user,
      now.startOf("day"),
      now.plus({ days: 1 }).startOf("day"),
      p === "pro-a" ? "katie" : "kamilla",
    );
    if (cap.available > 0 && cap.utilization !== null && cap.utilization < 50)
      add(
        `capacity:${p}:${now.toISODate()}`,
        p,
        null,
        "capacity",
        "Room to grow today",
        `${cap.utilization}% scheduled utilization; ${Math.round(cap.open)} unoccupied working minutes. Check service duration, notice and room availability before offering a time.`,
        `/studio/calendar?context=${p === "pro-a" ? "katie" : "kamilla"}`,
        2,
      );
    const waiting = db()
      .prepare(
        "SELECT w.*,u.name FROM waitlist w JOIN users u ON u.id=w.client_id WHERE professional_id=? AND status='waiting' AND date>=?",
      )
      .all(p, now.toISODate()!) as {
      id: string;
      client_id: string;
      service_id: string;
      date: string;
      name: string;
    }[];
    for (const w of waiting) {
      if (availableSlots(w.service_id, p, w.date).length)
        add(
          `waitlist:${w.id}`,
          p,
          w.client_id,
          "waitlist",
          `An opening for ${w.name}`,
          `Live availability matches their ${w.date} waitlist request. The booking engine will recheck the slot when reserved.`,
          `/studio/calendar?date=${w.date}`,
          1,
        );
    }
  }
  // Compare mature cohorts so clients still within their return window do not look lost.
  for (const provider of ids) {
    const completed = all.filter(
      (a) => a.professional_id === provider && a.status === "completed",
    );
    const firsts = [...new Set(completed.map((a) => a.client_id))].map((id) =>
      completed.find((a) => a.client_id === id)!,
    );
    const cohort = (from: number, to: number) => {
      const members = firsts.filter(
        (a) =>
          DateTime.fromISO(a.start_at) >= now.minus({ days: from }) &&
          DateTime.fromISO(a.start_at) < now.minus({ days: to }),
      );
      const retained = members.filter((f) =>
        completed.some(
          (a) =>
            a.client_id === f.client_id &&
            a.id !== f.id &&
            a.start_at > f.start_at &&
            DateTime.fromISO(a.start_at) <=
              DateTime.fromISO(f.start_at).plus({ days: 30 }),
        ),
      ).length;
      return {
        n: members.length,
        rate: members.length ? (retained / members.length) * 100 : 0,
      };
    };
    const recent = cohort(60, 30),
      prior = cohort(90, 60);
    if (recent.n >= 5 && prior.n >= 5 && prior.rate - recent.rate >= 10)
      add(
        `retention:${provider}:${now.toFormat("yyyy-LL")}`,
        provider,
        null,
        "retention",
        "Second-visit retention has declined",
        `Mature recent cohort: ${Math.round(recent.rate)}% of ${recent.n} clients returned within 30 days, versus ${Math.round(prior.rate)}% of ${prior.n} in the prior cohort. Minimum five clients per cohort.`,
        `/studio/business?context=${provider === "pro-a" ? "katie" : "kamilla"}`,
        1,
      );
    const recentVisits = all.filter(
      (a) =>
        a.professional_id === provider &&
        DateTime.fromISO(a.start_at) >= now.minus({ days: 30 }) &&
        DateTime.fromISO(a.start_at) <= now &&
        a.status === "completed",
    );
    const sourceCounts: Record<string, number> = {};
    for (const a of recentVisits) {
      const source = (
        db()
          .prepare(
            "SELECT source FROM appointment_sources WHERE appointment_id=?",
          )
          .get(a.id) as { source: string } | undefined
      )?.source;
      if (source && source !== "unknown")
        sourceCounts[source] = (sourceCounts[source] ?? 0) + 1;
    }
    for (const [source, count] of Object.entries(sourceCounts))
      if (count >= 5 && count / recentVisits.length >= 0.5)
        add(
          `source:${provider}:${source}:${now.toFormat("yyyy-LL")}`,
          provider,
          null,
          "acquisition",
          `${source} is a leading booking source`,
          `${count} of ${recentVisits.length} completed visits in the last 30 days came from this recorded source. Review its contribution before changing marketing spend; acquisition costs are not yet recorded.`,
          `/studio/business?context=${provider === "pro-a" ? "katie" : "kamilla"}#acquisition`,
          3,
        );
  }
  const paid = orders(user, context).filter((o) => o.status === "paid");
  for (const p of products(user).filter((p) => p.replenish_days)) {
    const purchases = paid.flatMap((o) =>
      db()
        .prepare("SELECT 1 FROM order_items WHERE order_id=? AND product_id=?")
        .get(o.id, p.id)
        ? [o]
        : [],
    );
    for (const client of [...new Set(purchases.map((o) => o.client_id))]) {
      const last = purchases.find((o) => o.client_id === client)!;
      if (
        now.diff(DateTime.fromISO(last.created_at), "days").days >=
        p.replenish_days!
      )
        add(
          `replenish:${p.id}:${client}:${last.professional_id}`,
          last.professional_id,
          client,
          "replenishment",
          `${last.client_name} · ${p.name}`,
          `Last purchased ${Math.floor(now.diff(DateTime.fromISO(last.created_at), "days").days)} days ago; configured replenishment interval is ${p.replenish_days} days.`,
          `/studio/clients/${client}`,
          3,
        );
    }
  }
  transaction(() => {
    for (const p of ids)
      db()
        .prepare(
          "UPDATE growth_opportunities SET status='resolved' WHERE professional_id=? AND status='open'",
        )
        .run(p);
    for (const s of signals)
      db()
        .prepare(
          "INSERT INTO growth_opportunities VALUES(?,?,?,?,?,?,?,?, 'open',?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,explanation=excluded.explanation,href=excluded.href,observed_at=excluded.observed_at,status=CASE WHEN growth_opportunities.status='dismissed' THEN 'dismissed' ELSE 'open' END",
        )
        .run(
          s.id,
          s.professional_id,
          s.client_id,
          s.kind,
          s.title,
          s.explanation,
          s.href,
          s.priority,
          now.toUTC().toISO()!,
        );
  });
  return opportunities(user, context);
}
export function opportunities(user: User, context?: string) {
  const ids = scopes(user, context);
  return (
    db()
      .prepare(
        "SELECT * FROM growth_opportunities WHERE status='open' ORDER BY priority,observed_at DESC",
      )
      .all() as Opportunity[]
  )
    .filter((o) => ids.includes(o.professional_id))
    .map((o) => ({ ...o }));
}
export function clientTimeline(user: User, id: string) {
  assertClient(user, id);
  const visits = scopedAppointments(user).filter((a) => a.client_id === id);
  const timeline: {
    id: string;
    date: string;
    title: string;
    detail: string;
    href: string;
  }[] = visits.map((a) => ({
    id: a.id,
    date: a.start_at,
    title: services.find((s) => s.id === a.service_id)?.name ?? a.service_id,
    detail: (a.stage ?? a.status).replaceAll("_", " "),
    href: `/studio/workspace/${a.id}`,
  }));
  for (const o of orders(user).filter((o) => o.client_id === id))
    timeline.push({
      id: o.id,
      date: o.created_at,
      title: "Checkout",
      detail: o.status,
      href: `/studio/operations?order=${o.id}`,
    });
  for (const a of visits) {
    for (const f of db()
      .prepare(
        "SELECT id,created_at FROM form_responses WHERE appointment_id=?",
      )
      .all(a.id) as { id: string; created_at: string }[])
      timeline.push({
        id: f.id,
        date: f.created_at,
        title: "Booking acknowledgment",
        detail: "Form received",
        href: `/studio/clients/${id}`,
      });
  }
  const providers = scopes(user);
  for (const m of db()
    .prepare("SELECT * FROM messages WHERE client_id=?")
    .all(id) as {
    id: string;
    professional_id: string;
    created_at: string;
    channel: string;
    status: string;
  }[])
    if (providers.includes(m.professional_id))
      timeline.push({
        id: m.id,
        date: m.created_at,
        title: `${m.channel} communication`,
        detail: m.status,
        href: `/studio/clients/${id}`,
      });
  return timeline.sort((a, b) => b.date.localeCompare(a.date));
}
export function commandSearch(user: User, q: string, context?: string) {
  const query = q.trim().toLowerCase().slice(0, 120);
  if (!query) return [];
  const ids = scopes(user, context),
    visits = scopedAppointments(user, context);
  const entries: { label: string; detail: string; href: string }[] = [];
  const clientIds =
    user.role === "owner"
      ? (
          db().prepare("SELECT id FROM users WHERE role='client'").all() as {
            id: string;
          }[]
        ).map((c) => c.id)
      : [...new Set(visits.map((a) => a.client_id))];
  for (const id of clientIds) {
    const c = db()
      .prepare("SELECT name,email,phone FROM users WHERE id=?")
      .get(id) as { name: string; email: string; phone: string };
    if (`${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(query))
      entries.push({
        label: c.name,
        detail: "Client 360",
        href: `/studio/clients/${id}`,
      });
  }
  for (const a of visits)
    if (
      `${a.client_name} ${a.start_at} ${a.stage ?? a.status} ${a.service_id}`
        .toLowerCase()
        .includes(query)
    )
      entries.push({
        label: a.client_name,
        detail: `${DateTime.fromISO(a.start_at).setZone(studio.timezone).toFormat("LLL d, h:mm a")} · ${(a.stage ?? a.status).replaceAll("_", " ")}`,
        href: `/studio/workspace/${a.id}`,
      });
  for (const p of products(user))
    if (`${p.name} ${p.brand} ${p.sku}`.toLowerCase().includes(query))
      entries.push({
        label: p.name,
        detail: `Product · ${p.stock} in stock`,
        href: "/studio/operations#inventory",
      });
  for (const o of orders(user, context))
    if (
      `${o.client_name} ${o.status} ${o.id} ${o.status === "open" ? "unpaid" : ""}`
        .toLowerCase()
        .includes(query)
    )
      entries.push({
        label: o.client_name,
        detail: `Checkout · ${o.status}`,
        href: `/studio/operations?order=${o.id}`,
      });
  for (const [label, href] of [
    ["Revenue / performance / reports", "/studio/business"],
    ["Openings / calendar / schedule", "/studio/calendar"],
    ["Growth / overdue clients", "/studio/growth"],
    ["Services / availability / policies", "/studio/settings"],
  ])
    if (
      label
        .toLowerCase()
        .split(" / ")
        .some((w) => w.includes(query) || query.includes(w))
    )
      entries.push({ label, detail: "Business OS", href });
  const now = DateTime.now().setZone(studio.timezone);
  const date =
    query === "tomorrow"
      ? now.plus({ days: 1 }).toISODate()
      : query === "today"
        ? now.toISODate()
        : /^\d{4}-\d{2}-\d{2}$/.test(query) && DateTime.fromISO(query).isValid
          ? query
          : null;
  if (date && ids.length)
    entries.unshift({
      label: `Calendar · ${date}`,
      detail: "Appointments and openings",
      href: `/studio/calendar?date=${date}`,
    });
  auditBusiness(user, "search", "command", "searched");
  return entries.slice(0, 40);
}
