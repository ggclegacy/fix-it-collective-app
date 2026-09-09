import Link from "next/link";
import { Brand } from "./brand";
export function Footer() {
  return (
    <footer className="footer">
      <Brand />
      <p>A little intention. A lasting difference.</p>
      <div>
        <Link href="/policies">Visit & policies</Link>
        <Link href="/studio">Studio access</Link>
        <span>© {new Date().getFullYear()} Fix It Collective</span>
      </div>
    </footer>
  );
}
