import Link from "next/link";
import { BrandEmblem } from "./brand-emblem";
export function PartnershipMarks() {
  return (
    <div className="partnership-marks" aria-label="Our partner brands">
      <Link href="/services">
        <BrandEmblem size={256} eager />
        <span>GROOMING · BEAUTY · COMMUNITY</span>
      </Link>
      <span className="partnership-connector" aria-hidden="true">
        ×
      </span>
      <Link href="/recovery">
        <BrandEmblem brand="recovery" size={256} eager />
        <span>MASSAGE · RECOVERY · WELLNESS</span>
      </Link>
    </div>
  );
}
