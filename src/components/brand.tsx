import Link from "next/link";
import { BrandEmblem } from "./brand-emblem";
export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="Fix It Collective home">
      <BrandEmblem size={64} decorative eager />
      <span>
        FIX IT COLLECTIVE<span className="brand-sub">EUNICE, LOUISIANA</span>
      </span>
    </Link>
  );
}
