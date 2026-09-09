import type { User } from "./types";
import { appointmentsFor } from "./scheduling";
import { db } from "./db";
export type ClientSummary = {
  id: string;
  name: string;
  email: string;
  phone: string;
  visits: number;
  value: number;
  last_visit: string | null;
  next_visit: string | null;
  cancellations: number;
  no_shows: number;
};
export function clients(user: User) {
  if (user.role === "client") throw new Error("Staff access required.");
  if (user.role === "staff") {
    const visits = appointmentsFor(user);
    const ids = [...new Set(visits.map((a) => a.client_id))];
    return ids.map((id) => {
      const u = db()
        .prepare("SELECT id,name,email,phone FROM users WHERE id=?")
        .get(id) as Pick<ClientSummary, "id" | "name" | "email" | "phone">;
      const a = visits.filter((a) => a.client_id === id),
        done = a.filter((a) => a.status === "completed");
      return {
        ...u,
        visits: done.length,
        value: done.reduce((n, a) => n + a.price, 0),
        last_visit: done.at(-1)?.start_at ?? null,
        next_visit:
          a.find(
            (a) =>
              a.status === "confirmed" && a.start_at > new Date().toISOString(),
          )?.start_at ?? null,
        cancellations: a.filter((a) => a.status === "cancelled").length,
        no_shows: a.filter((a) => a.status === "no_show").length,
      };
    });
  }
  const rows = db()
    .prepare(
      `SELECT u.id,u.name,u.email,u.phone,COUNT(CASE WHEN a.status='completed' THEN 1 END) AS visits,COALESCE(SUM(CASE WHEN a.status='completed' THEN a.price ELSE 0 END),0) AS value,MAX(CASE WHEN a.status='completed' THEN a.start_at END) AS last_visit,MIN(CASE WHEN a.status='confirmed' AND a.start_at>strftime('%Y-%m-%dT%H:%M:%fZ','now') THEN a.start_at END) AS next_visit,COUNT(CASE WHEN a.status='cancelled' THEN 1 END) AS cancellations,COUNT(CASE WHEN a.status='no_show' THEN 1 END) AS no_shows FROM users u LEFT JOIN appointments a ON a.client_id=u.id WHERE u.role='client' GROUP BY u.id ORDER BY u.name`,
    )
    .all() as ClientSummary[];
  return rows.map((row) => ({ ...row }));
}
