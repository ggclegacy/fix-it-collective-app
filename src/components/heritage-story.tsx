import Image from "next/image";
import Link from "next/link";
import type { ProviderId } from "@/lib/provider-profiles";
import {
  businessCredentials,
  isPublishableCredential,
} from "@/lib/business-credentials";

export function OwnershipMarker() {
  return (
    <a className="ownership-marker" href="#our-story">
      <span>Women-owned</span>
      <span aria-hidden="true">·</span>
      <span>Marine veteran-owned</span>
    </a>
  );
}

export function HeritageStory() {
  return (
    <section
      id="our-story"
      className="heritage-story section"
      aria-labelledby="heritage-heading"
    >
      <div className="heritage-intro">
        <p className="eyebrow">OUR SHARED FOUNDATION</p>
        <h2 id="heritage-heading">
          A life of service.
          <br />
          <em>A personal kind of care.</em>
        </h2>
        <p className="heritage-signature">
          Katie & Kamilla <span>U.S. Marine veterans · Eunice, Louisiana</span>
        </p>
      </div>
      <div className="heritage-narrative">
        <p className="heritage-lead">
          Before the Collective, there was a shared commitment to serve.
        </p>
        <p>
          Katie and Kamilla both served as U.S. Marines. Today, that service
          mentality is part of the foundation of Fix It Collective: discipline
          in the details, resilience through change, and care for the person
          beside you.
        </p>
        <p>
          Here in Eunice, Louisiana, it takes a personal form. Grooming and
          beauty that make room for confidence. Massage and wellness that make
          room for recovery. A community where trust is built through listening,
          consistency, and the way people are treated.
        </p>
        <p>
          Two distinct ways of caring. One shared belief: people deserve your
          time, your attention, and your best.
        </p>
        <div className="heritage-paths">
          <Link href="/grooming">
            Meet Katie’s studio <span aria-hidden="true">↗</span>
          </Link>
          <Link href="/recovery">
            Enter Recovery Room by Milla <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

export function ProviderServiceStory({ provider }: { provider: ProviderId }) {
  const recovery = provider === "camilla";
  return (
    <section
      className="provider-section service-story"
      aria-labelledby={`${provider}-service-heading`}
    >
      <div>
        <p className="provider-kicker">FROM SERVICE TO SERVICE</p>
        <h2 id={`${provider}-service-heading`}>
          {recovery ? "Care begins" : "The details matter."}
          <br />
          <em>{recovery ? "with listening." : "So do you."}</em>
        </h2>
      </div>
      <div className="service-story-copy">
        <p>
          {recovery
            ? "Kamilla’s background as a U.S. Marine is part of the service mentality she brings to Recovery Room by Milla: steady attention, respect, and care for the person in front of her."
            : "Katie’s background as a U.S. Marine is part of the service mentality she brings to the chair: discipline in the details, consistency, and respect for the person behind the appointment."}
        </p>
        <p>
          {recovery
            ? "Here, that means space to share what you need, set your boundaries, and find your own pace. Your comfort guides the conversation, from the first check-in to the last moment of your visit."
            : "Here, precision starts with listening. Your style, your routine, and the way you want to feel shape a grooming experience built around you. Confidence grows through care you can trust."}
        </p>
        <Link className="provider-link" href="/#our-story">
          The story we share <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </section>
  );
}

export function BusinessCredentials() {
  const credentials = businessCredentials.filter((c) =>
    isPublishableCredential(c),
  );
  if (!credentials.length) return null;
  return (
    <section
      className="business-credentials"
      aria-label="Verified business credentials"
    >
      <p>Verified business credentials</p>
      <ul>
        {credentials.map((c) => (
          <li key={c.id}>
            <a href={c.verificationUrl}>
              {c.mark?.usageApproved && (
                <Image
                  src={c.mark.src}
                  alt={c.mark.alt}
                  width={120}
                  height={80}
                />
              )}
              <span>
                {c.label}
                <small>{c.issuer}</small>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
