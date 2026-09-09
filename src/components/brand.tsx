import Link from "next/link";
// Text identification only until the approved original artwork is available.
// Never substitute an invented emblem for either official mark.
export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="Fix It Collective home">
      <span>
        FIX IT COLLECTIVE<span className="brand-sub">EUNICE, LOUISIANA</span>
      </span>
    </Link>
  );
}
