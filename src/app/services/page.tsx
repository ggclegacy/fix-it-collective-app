import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { services, money } from "@/lib/catalog";
export const metadata = { title: "The services" };
export default function Services() {
  return (
    <main id="main" className="page section">
      <div className="page-heading">
        <p className="eyebrow">THE SERVICE EDIT</p>
        <h1>Find your ritual.</h1>
        <p>
          From the everyday essential to a complete refresh.
          <br />
          Choose a service to explore availability.
        </p>
      </div>
      <div className="notice">
        Preview menu: these example services and prices are not live business
        offers.
      </div>
      <div className="service-grid">
        {services.map((s) => (
          <article className="service-card" key={s.id}>
            <div className="card-top">
              <span className="eyebrow">{s.category}</span>
              <span className="service-number">{s.number}</span>
            </div>
            <h2>{s.name}</h2>
            <p>{s.description}</p>
            <div className="card-bottom">
              <span>
                {s.duration} min · from {money(s.price)}
              </span>
              <Link
                className="icon-link"
                aria-label={`Book ${s.name}`}
                href={`/book?service=${s.id}`}
              >
                <ArrowUpRight />
              </Link>
            </div>
          </article>
        ))}
      </div>
      <div className="inline-callout">
        <h3>Not sure where to start?</h3>
        <p>
          The color consultation is a preview of how an exploratory visit will
          work. Final services and advice will come from the studio.
        </p>
        <Link className="text-link" href="/book?service=color">
          Explore a consultation <ArrowRightIcon />
        </Link>
      </div>
    </main>
  );
}
function ArrowRightIcon() {
  return <ArrowUpRight size={18} />;
}
