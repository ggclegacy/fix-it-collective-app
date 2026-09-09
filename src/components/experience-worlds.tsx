import Link from "next/link";
import { BrandEmblem } from "./brand-emblem";
import { ArrowUpRight } from "lucide-react";
export function ExperienceWorlds() {
  return (
    <div className="experience-worlds">
      <Link className="experience-world collective-world" href="/services">
        <div className="world-identity">
          <span className="world-index">01 / THE COLLECTIVE</span>
          <BrandEmblem size={200} decorative />
        </div>
        <div>
          <p className="eyebrow">FIX IT COLLECTIVE</p>
          <h3>
            The art of
            <br />
            <em>showing up.</em>
          </h3>
          <p>
            Grooming & beauty. Personal expression, down to the last detail.
          </p>
        </div>
        <span className="world-enter">
          Explore the collective <ArrowUpRight size={20} />
        </span>
      </Link>
      <Link className="experience-world recovery-world" href="/recovery">
        <div className="world-identity">
          <span className="world-index">02 / RECOVERY ROOM BY MILLA</span>
          <BrandEmblem brand="recovery" size={200} decorative />
        </div>
        <div>
          <p className="eyebrow">MIND · BODY · BALANCE</p>
          <h3>
            Make room
            <br />
            <em>for yourself.</em>
          </h3>
          <p>
            Massage, bodywork & wellness. A distinct space within the
            collective.
          </p>
        </div>
        <span className="world-enter">
          Enter Recovery Room <ArrowUpRight size={20} />
        </span>
      </Link>
    </div>
  );
}
