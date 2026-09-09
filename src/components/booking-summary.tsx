import { BrandEmblem } from "./brand-emblem";
import { Clock3, CalendarDays } from "lucide-react";
import { DateTime } from "luxon";
import { services, professionals, addons, money, studio } from "@/lib/catalog";
import { brandForService } from "@/lib/brands";
import type { Slot } from "@/lib/types";
export function BookingSummary({
  service,
  professional,
  slot,
  addonIds,
}: {
  service: (typeof services)[number] | undefined;
  professional: (typeof professionals)[number] | undefined;
  slot: Slot | null;
  addonIds: string[];
}) {
  return (
    <aside className="booking-summary">
      <p className="eyebrow">YOUR VISIT, AT A GLANCE</p>
      <div className="visit-brand">
        <BrandEmblem brand={service?.brand} size={72} decorative />
        {brandForService(service).name}
      </div>
      <h3>{service?.name ?? "A little time for you."}</h3>
      <p>
        {service
          ? (professional?.name ?? "Professional to be selected")
          : "Your visit takes shape here."}
      </p>
      {service && (
        <>
          <div className="summary-line">
            <Clock3 size={16} />
            <span>
              {slot?.duration ??
                service.duration +
                  addonIds.reduce(
                    (n, id) =>
                      n + (addons.find((a) => a.id === id)?.duration ?? 0),
                    0,
                  )}{" "}
              minutes
            </span>
          </div>
          {slot && (
            <div className="summary-line">
              <CalendarDays size={16} />
              <span>
                {DateTime.fromISO(slot.start)
                  .setZone(studio.timezone)
                  .toFormat("LLL d · h:mm a")}
              </span>
            </div>
          )}
          {addonIds.map((id) => (
            <div key={id} className="summary-line">
              + {addons.find((a) => a.id === id)?.name}
            </div>
          ))}
          <div className="summary-total">
            <span>Service total</span>
            <strong>
              {slot
                ? money(slot.price)
                : service.price < 0
                  ? "Awaiting approval"
                  : `from ${money(service.price + addonIds.reduce((n, id) => n + (addons.find((a) => a.id === id)?.price ?? 0), 0))}`}
            </strong>
          </div>
        </>
      )}
      <small>
        Sample menu & availability.
        <br />
        No live payments or messages.
      </small>
    </aside>
  );
}
