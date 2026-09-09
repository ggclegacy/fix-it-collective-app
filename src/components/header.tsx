"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useState } from "react";
import { Brand } from "./brand";
export function Header() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <Brand />
      <button
        className="icon-button mobile-menu"
        aria-label={open ? "Close navigation" : "Open navigation"}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? <X /> : <Menu />}
      </button>
      <nav
        className={open ? "main-nav open" : "main-nav"}
        aria-label="Main navigation"
      >
        {[
          ["/services", "Experiences"],
          ["/recovery", "Recovery Room"],
          ["/collective", "The collective"],
          ["/account", "Your space"],
        ].map(([href, label]) => (
          <Link
            aria-current={path === href ? "page" : undefined}
            onClick={() => setOpen(false)}
            key={href}
            href={href}
          >
            {label}
          </Link>
        ))}
        <Link
          onClick={() => setOpen(false)}
          className="button gold small"
          href="/book"
        >
          Book a visit <ArrowUpRight size={16} />
        </Link>
      </nav>
    </header>
  );
}
