import { ArrowUpRight, Phone } from "lucide-react";
import type { Resource } from "@/lib/networks";
export function ResourceCard({ resource }: { resource: Resource }) {
  return (
    <article className="network-resource">
      <div className="resource-kicker">
        <span>
          {resource.coverage === "local"
            ? "LOCAL RESOURCE"
            : resource.coverage === "statewide"
              ? "LOUISIANA"
              : "NATIONAL RESOURCE"}
        </span>
        <span>Public source reviewed</span>
      </div>
      <h3>{resource.name}</h3>
      <p>{resource.description}</p>
      <div className="resource-tags">
        {resource.specialties.map((s) => (
          <span key={s}>{s}</span>
        ))}
      </div>
      <p className="resource-location">{resource.location}</p>
      <details>
        <summary>Who this helps & what to expect</summary>
        <dl>
          <dt>Who they help</dt>
          <dd>{resource.whoTheyHelp}</dd>
          <dt>Access</dt>
          <dd>{resource.delivery}</dd>
          <dt>Cost & coverage</dt>
          <dd>{resource.payment}</dd>
          <dt>Review & credentials</dt>
          <dd>{resource.verification.credentials}</dd>
        </dl>
        <a
          className="text-link"
          href={resource.verification.source}
          rel="noreferrer"
        >
          Official source · reviewed September 9, 2026{" "}
          <ArrowUpRight size={14} />
        </a>
      </details>
      <div className="resource-actions">
        {resource.phone ? (
          <a className="button gold" href={`tel:${resource.phone}`}>
            <Phone size={16} />
            {resource.phoneLabel}
          </a>
        ) : null}
        <a className="text-link" href={resource.website} rel="noreferrer">
          Visit official resource <ArrowUpRight size={16} />
        </a>
      </div>
    </article>
  );
}
