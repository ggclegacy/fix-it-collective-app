"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { services, money } from "@/lib/catalog";
import { brandForService } from "@/lib/brands";
export function ServiceDiscovery() {
  const [world, setWorld] = useState("All");
  const list = services.filter(
    (s) =>
      world === "All" ||
      (world === "Beauty"
        ? s.category === "Color"
        : world === "Grooming" && s.category !== "Color"),
  );
  return (
    <>
      <div className="experience-tabs" aria-label="Filter experiences">
        {["All", "Grooming", "Beauty", "Recovery", "Wellness"].map((w) => (
          <button
            key={w}
            aria-pressed={world === w}
            onClick={() => setWorld(w)}
          >
            {w}
          </button>
        ))}
      </div>
      {list.length ? (
        <div className="discovery-list">
          {list.map((s) => (
            <article key={s.id} className="discovery-row">
              <span className="service-number">{s.number}</span>
              <div>
                <p className="brand-label">
                  {brandForService(s).name} / {s.category}
                </p>
                <h2>{s.name}</h2>
                <p>{s.description}</p>
              </div>
              <div className="discovery-action">
                <span>
                  {s.duration} min · from {money(s.price)}
                </span>
                <Link className="button outline" href={`/book?service=${s.id}`}>
                  Explore times <ArrowUpRight size={16} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="partner-pending">
          <p className="eyebrow">RECOVERY ROOM BY MILLA</p>
          <h2>Space for a deeper exhale.</h2>
          <p>
            The {world.toLowerCase()} menu and practitioner availability are
            awaiting approval. Appointments are not yet open.
          </p>
          <Link className="button outline" href="/recovery">
            Discover Recovery Room <ArrowUpRight size={16} />
          </Link>
        </div>
      )}
    </>
  );
}
