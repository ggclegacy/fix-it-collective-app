import Link from "next/link";
import { PartnershipMarks } from "@/components/partnership-marks";
import { professionals } from "@/lib/catalog";
export const metadata = { title: "The collective" };
export default function Collective() {
  return (
    <main id="main">
      <section className="section page">
        <p className="eyebrow">THE COLLECTIVE</p>
        <h1>
          Built around people.
          <br />
          <em>Starting with you.</em>
        </h1>
        <PartnershipMarks />
        <div className="editorial-columns">
          <h2>
            A shared space.
            <br />
            An individual approach.
          </h2>
          <div>
            <p>
              Fix It Collective brings beauty, grooming and community into one
              connected experience. A place to discover your people, find your
              routine, and feel at home in your own style.
            </p>
            <p>
              Recovery Room by Milla brings its own identity to massage,
              bodywork and wellness within the partnership. Both brands share
              one connected appointment experience.
            </p>
          </div>
        </div>
        <div className="section-heading">
          <h2>
            The people behind
            <br />
            your next good day.
          </h2>
          <p>
            Professional profiles are coming.
            <br />
            Preview the booking experience below.
          </p>
        </div>
        <div className="team-grid">
          {professionals.map((p) => (
            <article className="team-card" key={p.id}>
              <div className="team-placeholder">
                <span>{p.initials}</span>
                <small>PROFILE COMING SOON</small>
              </div>
              <h3>{p.name}</h3>
              <p>{p.description}</p>
              <Link className="text-link" href={`/book?professional=${p.id}`}>
                Explore sample availability ↗
              </Link>
            </article>
          ))}
        </div>
        <div className="inline-callout">
          <p className="eyebrow">THE WORK SPEAKS</p>
          <h2>Real people. Real results.</h2>
          <p>
            Our gallery and client stories will appear here once studio
            photography and permission to share are in place.
          </p>
        </div>
      </section>
    </main>
  );
}
