import Link from "next/link";
import { Brand } from "./brand";
export function Footer() {
  return (
    <footer className="footer">
      <Brand />
      <p>Fix It Collective × Recovery Room by Milla</p>
      <div>
        <Link href="/policies">Visit & policies</Link>
        <Link href="/studio">Studio access</Link>
        <span>© {new Date().getFullYear()} Fix It Collective</span>
      </div>
    </footer>
  );
}
