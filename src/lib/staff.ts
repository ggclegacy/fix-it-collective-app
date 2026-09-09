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
export function clients() {
  const rows = db()
    .prepare(
      `SELECT u.id,u.name,u.email,u.phone,COUNT(CASE WHEN a.status='completed' THEN 1 END) AS visits,COALESCE(SUM(CASE WHEN a.status='completed' THEN a.price ELSE 0 END),0) AS value,MAX(CASE WHEN a.status='completed' THEN a.start_at END) AS last_visit,MIN(CASE WHEN a.status='confirmed' AND a.start_at>strftime('%Y-%m-%dT%H:%M:%fZ','now') THEN a.start_at END) AS next_visit,COUNT(CASE WHEN a.status='cancelled' THEN 1 END) AS cancellations,COUNT(CASE WHEN a.status='no_show' THEN 1 END) AS no_shows FROM users u LEFT JOIN appointments a ON a.client_id=u.id WHERE u.role='client' GROUP BY u.id ORDER BY u.name`,
    )
    .all() as ClientSummary[];
  return rows.map((row) => ({ ...row }));
}
