import Link from "next/link";
export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="Fix It Collective home">
      <span className="brand-mark">
        F<span>╱</span>
      </span>
      <span>
        FIX IT<span className="brand-sub">COLLECTIVE</span>
      </span>
    </Link>
  );
}
