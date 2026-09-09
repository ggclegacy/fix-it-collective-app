import { rules, settings } from "@/lib/booking-rules";
import { services } from "@/lib/catalog";
import Link from "next/link";
import { ServiceDiscovery } from "@/components/service-discovery";
export const dynamic = "force-dynamic";
export const metadata = { title: "Discover your experience" };
export default function Services() {
  const b = process.env.VERCEL ? {} : settings();
  const catalog = process.env.VERCEL
    ? services.filter((s) => s.brand !== "recovery")
    : services
        .filter(
          (s) =>
            s.brand !== "recovery" ||
            (rules(s.id).enabled &&
              b.therapist_license &&
              b.establishment_license),
        )
        .map((s) => ({
          ...s,
          duration: rules(s.id).duration,
          price: rules(s.id).price ?? s.price,
        }));
  return (
    <main id="main" className="page section">
      <div className="page-heading">
        <p className="eyebrow">THE EXPERIENCE DIRECTORY</p>
        <h1>
          Your time.
          <br />
          <em>Your ritual.</em>
        </h1>
        <p>
          Grooming & beauty by Fix It Collective.
          <br />
          Recovery & wellness by Recovery Room by Milla.
        </p>
      </div>
      <div className="notice">
        Preview menu: these example services and prices are not live business
        offers.
      </div>
      <div className="provider-entry-links">
        <Link className="button outline" href="/grooming">
          Enter Katie’s Studio ↗
        </Link>
        <Link className="button outline" href="/recovery">
          Enter Recovery Room ↗
        </Link>
      </div>
      {b.therapist_license && (
        <p>
          {b.therapist_name} · Louisiana license {b.therapist_license} ·{" "}
          {b.establishment_name} {b.establishment_license}
        </p>
      )}
      <ServiceDiscovery catalog={catalog} />
    </main>
  );
}
