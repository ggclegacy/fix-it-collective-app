import { scopes } from "@/lib/business/access";
import { db } from "@/lib/db";
import {
  WaitlistManager,
  type WaitlistEntry,
} from "@/components/waitlist-manager";
import { requireUser } from "@/lib/auth";
import { appointmentsFor } from "@/lib/scheduling";
import { CalendarView } from "@/components/calendar-view";
export const metadata = { title: "Studio calendar" };
export default async function Calendar({searchParams}:{searchParams:Promise<{date?:string;context?:string}>}) {
  const query=await searchParams;
  const user = await requireUser(true);
  const ids=scopes(user,query.context);
  const entries = (
    db()
      .prepare(
        "SELECT w.*,u.name AS client_name FROM waitlist w JOIN users u ON u.id=w.client_id WHERE w.status IN ('waiting','offered') ORDER BY date",
      )
      .all() as WaitlistEntry[]
  )
    .filter((e) => ids.includes(e.professional_id))
    .map((e) => ({ ...e }));
  return (
    <>
      <div className="workspace-heading">
        <div>
          <p className="eyebrow">TIME, WELL SPENT</p>
          <h1>The studio calendar.</h1>
          <p>One schedule. Every professional. All times in Central Time.</p>
        </div>
      </div>
      <WaitlistManager entries={entries} />
      <CalendarView appointments={appointmentsFor(user).filter(a=>ids.includes(a.professional_id))} initialDate={query.date} />
    </>
  );
}
