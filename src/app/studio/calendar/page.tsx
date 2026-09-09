import { requireUser } from "@/lib/auth";
import { appointmentsFor } from "@/lib/scheduling";
import { CalendarView } from "@/components/calendar-view";
export const metadata = { title: "Studio calendar" };
export default async function Calendar() {
  return (
    <>
      <div className="workspace-heading">
        <div>
          <p className="eyebrow">TIME, WELL SPENT</p>
          <h1>The studio calendar.</h1>
          <p>One schedule. Every professional. All times in Central Time.</p>
        </div>
      </div>
      <CalendarView appointments={appointmentsFor(await requireUser(true))} />
    </>
  );
}
