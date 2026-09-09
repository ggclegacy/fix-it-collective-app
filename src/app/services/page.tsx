import Link from "next/link";
import { ServiceDiscovery } from "@/components/service-discovery";
export const metadata = { title: "Discover your experience" };
export default function Services() {
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
      <ServiceDiscovery />
    </main>
  );
}
