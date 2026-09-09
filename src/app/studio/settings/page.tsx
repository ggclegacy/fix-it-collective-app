import { BookingSettings } from "@/components/booking-settings";
import { rules, settings, canManage } from "@/lib/booking-rules";
import { services } from "@/lib/catalog";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AvailabilitySettings } from "@/components/availability-settings";
import type { Block } from "@/lib/types";
export const metadata = { title: "Working hours & time off" };
export default async function Settings() {
  const user = await requireUser(true);
  const hours = db()
    .prepare("SELECT * FROM working_hours ORDER BY professional_id,weekday")
    .all() as {
    professional_id: string;
    weekday: number;
    opens: number;
    closes: number;
  }[];
  const blocks = db()
    .prepare("SELECT * FROM blocks ORDER BY start_at DESC")
    .all() as Block[];
  return (
    <>
      <div className="workspace-heading">
        <div>
          <p className="eyebrow">PROTECT YOUR TIME</p>
          <h1>
            Room for the work.
            <br />
            Room for life.
          </h1>
          <p>Working hours and time off drive every booking opening.</p>
        </div>
      </div>
      <BookingSettings
        initial={services
          .filter((s) =>
            canManage(user, s.id === "massage" ? "pro-b" : "pro-a"),
          )
          .map((s) => ({ ...rules(s.id), name: s.name }))}
        business={settings()}
        owner={user.role === "owner"}
      />
      <AvailabilitySettings
        hours={hours
          .filter((r) => canManage(user, r.professional_id))
          .map((row) => ({ ...row }))}
        blocks={blocks
          .filter((r) => canManage(user, r.professional_id))
          .map((row) => ({ ...row }))}
      />
    </>
  );
}
