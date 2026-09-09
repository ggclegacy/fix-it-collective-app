import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
export function NetworkDoors() {
  return (
    <section
      className="section network-doors-section"
      aria-labelledby="network-doors-title"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">BEYOND THE APPOINTMENT</p>
          <h2 id="network-doors-title">
            A place to begin.
            <br />
            <em>A way forward.</em>
          </h2>
        </div>
        <p>
          Care doesn’t end at the studio door.
          <br />
          Find a next step that belongs to you.
        </p>
      </div>
      <div className="network-doors">
        <Link href="/men" className="network-door men-door">
          <span className="eyebrow">KATIE · MEN’S WELLNESS NETWORK</span>
          <h3>
            Restore
            <br />
            <em>yourself.</em>
          </h3>
          <p>Your health. Your confidence. Your next chapter.</p>
          <span className="world-enter">
            MEN — Explore wellness <ArrowUpRight size={20} />
          </span>
        </Link>
        <Link
          href="/women"
          prefetch={false}
          className="network-door women-door"
        >
          <span className="eyebrow">CAMILLA · WOMEN’S SUPPORT NETWORK</span>
          <h3>
            Find
            <br />
            <em>your footing.</em>
          </h3>
          <p>Safety, support and space to rebuild. On your terms.</p>
          <span className="world-enter">
            WOMEN — Find support <ArrowUpRight size={20} />
          </span>
        </Link>
      </div>
    </section>
  );
}
