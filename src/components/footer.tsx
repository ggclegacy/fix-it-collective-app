import Link from "next/link";
import { BusinessCredentials } from "./heritage-story";
import { Brand } from "./brand";
export function Footer() {
  return (
    <footer className="footer">
      <Brand />
      <section
        className="footer-heritage"
        aria-label="Our ownership and community"
      >
        <p>Fix It Collective × Recovery Room by Milla</p>
        <Link href="/#our-story">Women-owned · Marine veteran-owned</Link>
        <p>Eunice, Louisiana · Rooted in service. Here for our community.</p>
        <BusinessCredentials />
      </section>
      <div>
        <Link href="/policies">Visit & policies</Link>
        <Link href="/studio">Studio access</Link>
        <span>© {new Date().getFullYear()} Fix It Collective</span>
      </div>
    </footer>
  );
}
