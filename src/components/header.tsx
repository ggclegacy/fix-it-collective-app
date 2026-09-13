"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useState } from "react";
import { Brand } from "./brand";
import { NetworkSafety } from "./network-safety";
export function Header() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <>
      {(path === "/women" || path.startsWith("/women/")) && <NetworkSafety />}
      <header className={`site-header ${path === "/" ? "sanctum-header" : ""}`}>
        {path === "/" ? (
          <Link
            href="/"
            className="sanctum-wordmark"
            aria-label="Sanctum Collective home"
          >
            SANCTUM<span>COLLECTIVE</span>
          </Link>
        ) : (
          <Brand />
        )}
        {path === "/" && (
          <Link href="/book" className="sanctum-mobile-book">
            Book <ArrowUpRight size={15} />
          </Link>
        )}
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
            ["/grooming", "Fix It Shop"],
            ["/recovery", "Casa Valora"],
            ["/legacy", "Legacy Sanctum"],
            ["/men", "Men"],
            ["/women", "Women"],
            ["/account", "Your space"],
          ].map(([href, label]) => (
            <Link
              aria-current={path === href ? "page" : undefined}
              onClick={() => setOpen(false)}
              key={href}
              prefetch={href === "/women" ? false : undefined}
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
    </>
  );
}
